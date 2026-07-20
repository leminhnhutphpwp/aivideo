<?php

namespace App\Services;

use App\Exceptions\CouponException;
use App\Models\Coupon;
use App\Models\CouponEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Sự kiện ưu đãi → đúc mã coupon RIÊNG cho từng user. Mọi thao tác nhận mã khoá hàng event
 * (lockForUpdate) để enforce giới hạn tổng và bảo đảm idempotency (mỗi user 1 mã/event).
 */
class CouponEventService
{
    public function __construct(private CouponService $couponService)
    {
    }

    /** Sinh mã unique (tuỳ chọn prefix), loop lại nếu trùng mã đã tồn tại. */
    public function uniqueCode(?string $prefix): string
    {
        do {
            $code = ($prefix ? strtoupper($prefix) . '-' : '') . strtoupper(Str::random(8));
        } while (Coupon::where('code', $code)->exists());

        return $code;
    }

    /** Đúc 1 coupon riêng cho user từ event (chưa tiêu, chưa cộng credits). */
    public function mintFor(CouponEvent $event, User $user): Coupon
    {
        return Coupon::create([
            'code' => $this->uniqueCode($event->code_prefix),
            'type' => $event->reward_type,
            'value' => $event->reward_value,
            'max_discount' => $event->max_discount,
            'min_purchase_amount' => $event->min_purchase_amount,
            'max_uses' => $event->per_user_uses,
            'max_uses_per_user' => $event->per_user_uses,
            'user_id' => $user->id,
            'coupon_event_id' => $event->id,
            'expires_at' => $event->code_valid_days ? now()->addDays($event->code_valid_days) : $event->ends_at,
            'is_active' => true,
            'description' => $event->name,
        ]);
    }

    /**
     * User nhận mã từ event. Idempotent: nếu đã có mã → trả về mã cũ (không đúc thêm,
     * không tăng lượt). Atomic + khoá hàng event.
     */
    public function claim(CouponEvent $event, User $user): Coupon
    {
        return DB::transaction(function () use ($event, $user) {
            $locked = CouponEvent::whereKey($event->id)->lockForUpdate()->first();
            $this->assertClaimable($locked, $user);

            // Đã nhận mã của event này rồi → trả về mã cũ (idempotent, once-ever cho manual).
            $existing = Coupon::where('coupon_event_id', $locked->id)
                ->where('user_id', $user->id)
                ->first();
            if ($existing) {
                return $existing;
            }

            $coupon = $this->mintFor($locked, $user);
            $locked->increment('claims_count');

            return $coupon;
        });
    }

    /**
     * Danh sách event công khai user có thể nhận (loại auto_grant). Kèm trạng thái đã nhận.
     * @return array<int, array<string, mixed>>
     */
    public function listActiveForUser(User $user): array
    {
        return CouponEvent::active()
            ->where('is_public', true)
            ->where('trigger', CouponEvent::TRIGGER_MANUAL)
            ->orderBy('sort_order')
            ->get()
            ->filter(fn (CouponEvent $e) => $e->isClaimableNow())
            ->map(function (CouponEvent $e) use ($user) {
                $claimed = Coupon::where('coupon_event_id', $e->id)
                    ->where('user_id', $user->id)
                    ->first();

                return [
                    'slug' => $e->slug,
                    'name' => $e->name,
                    'description' => $e->description,
                    'reward_type' => $e->reward_type,
                    'reward_value' => $e->reward_value,
                    'ends_at' => $e->ends_at,
                    'remaining' => $e->max_claims !== null ? max(0, $e->max_claims - $e->claims_count) : null,
                    'already_claimed' => (bool) $claimed,
                    'claimed_code' => $claimed?->code,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Tự cấp ưu đãi khi đăng ký/xác thực: ưu tiên event trigger=signup (credits) mới nhất; nếu
     * không có event nào thì fallback về mã welcome cũ. Bọc lỗi để KHÔNG chặn luồng auth.
     */
    public function autoGrant(User $user): void
    {
        try {
            $event = CouponEvent::active()
                ->where('trigger', CouponEvent::TRIGGER_SIGNUP)
                ->where('reward_type', 'credits')
                ->orderByDesc('id')
                ->first();

            if (! $event || ! $event->isClaimableNow()) {
                // Không có event đăng ký → dùng cơ chế welcome coupon cũ.
                $this->couponService->issueWelcome($user);
                return;
            }

            $coupon = Coupon::where('coupon_event_id', $event->id)
                ->where('user_id', $user->id)
                ->first();

            if (! $coupon) {
                $coupon = DB::transaction(function () use ($event, $user) {
                    $locked = CouponEvent::whereKey($event->id)->lockForUpdate()->first();

                    $existing = Coupon::where('coupon_event_id', $locked->id)
                        ->where('user_id', $user->id)
                        ->first();
                    if ($existing) {
                        return $existing;
                    }

                    $minted = $this->mintFor($locked, $user);
                    $locked->increment('claims_count');

                    return $minted;
                });
            }

            $this->couponService->redeemForCredits($coupon->code, $user);
        } catch (\Throwable $e) {
            Log::warning('Auto-grant coupon event failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Tặng credits sinh nhật cho user (mỗi năm 1 lần). Idempotency theo NĂM (whereYear),
     * KHÁC với claim thủ công (once-ever). Credits được cộng ngay qua redeemForCredits.
     * @return Coupon|null mã vừa đúc, hoặc null nếu không có event / đã nhận trong năm.
     */
    public function grantBirthdayFor(User $user): ?Coupon
    {
        $event = CouponEvent::active()
            ->where('trigger', CouponEvent::TRIGGER_BIRTHDAY)
            ->where('reward_type', 'credits')
            ->orderByDesc('id')
            ->first();

        if (! $event || ! $event->isClaimableNow()) {
            return null;
        }

        // Đã nhận quà sinh nhật của event này trong năm nay rồi → bỏ qua.
        $alreadyThisYear = Coupon::where('coupon_event_id', $event->id)
            ->where('user_id', $user->id)
            ->whereYear('created_at', now()->year)
            ->exists();
        if ($alreadyThisYear) {
            return null;
        }

        $coupon = DB::transaction(function () use ($event, $user) {
            $locked = CouponEvent::whereKey($event->id)->lockForUpdate()->first();

            if ($locked->max_claims !== null && $locked->claims_count >= $locked->max_claims) {
                return null;
            }

            $minted = $this->mintFor($locked, $user);
            $locked->increment('claims_count');

            return $minted;
        });

        if (! $coupon) {
            return null;
        }

        $this->couponService->redeemForCredits($coupon->code, $user);

        return $coupon;
    }

    // ── internals ──────────────────────────────────────────────────────────

    /** Kiểm tra event nhận được cho user (ném CouponException tiếng Việt nếu không). */
    private function assertClaimable(?CouponEvent $event, User $user): void
    {
        if (! $event || ! $event->is_active || ! $event->is_public) {
            throw new CouponException('Sự kiện không khả dụng.');
        }
        $now = now();
        if ($event->starts_at && $now->lt($event->starts_at)) {
            throw new CouponException('Sự kiện chưa bắt đầu.');
        }
        if ($event->ends_at && $now->gt($event->ends_at)) {
            throw new CouponException('Sự kiện đã kết thúc.');
        }
        if ($event->max_claims !== null && $event->claims_count >= $event->max_claims) {
            throw new CouponException('Sự kiện đã hết lượt nhận.');
        }
        if ($event->trigger !== CouponEvent::TRIGGER_MANUAL) {
            throw new CouponException('Mã sự kiện này được cấp tự động.');
        }
        if ($event->require_verified && ! $user->hasVerifiedEmail()) {
            throw new CouponException('Bạn cần xác thực email trước.');
        }
    }
}
