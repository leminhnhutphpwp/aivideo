<?php

namespace App\Services;

use App\Exceptions\CouponException;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\PendingCreditPurchase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Coupons: user nhập mã → nhận credits (type=credits), hoặc giảm giá khi mua gói nạp
 * (type=percent/fixed). Mọi kiểm tra chạy server-side; redeem/áp mã đều khoá hàng coupon
 * (lockForUpdate) để chống double-use và enforce giới hạn tổng + theo user.
 */
class CouponService
{
    public function __construct(private CreditService $creditService)
    {
    }

    public function normalizeCode(string $code): string
    {
        return strtoupper(trim($code));
    }

    /**
     * Nhập mã tặng credits → cộng credits cho user. Atomic + khoá hàng coupon.
     * @return array{coupon: Coupon, credits_added: int, balance: int}
     */
    public function redeemForCredits(string $code, User $user): array
    {
        $normalized = $this->normalizeCode($code);

        return DB::transaction(function () use ($normalized, $user) {
            $coupon = Coupon::where('code', $normalized)->lockForUpdate()->first();
            $this->assertRedeemable($coupon, $user);

            if ($coupon->type !== 'credits') {
                throw new CouponException('Mã này là mã giảm giá, dùng khi mua gói nạp — không thể đổi lấy credits.');
            }

            $tx = $this->creditService->addCredits(
                $user,
                $coupon->value,
                "Đổi mã {$coupon->code}",
                $coupon->code,
                'bonus'
            );

            $coupon->increment('used_count');

            CouponRedemption::create([
                'coupon_id' => $coupon->id,
                'user_id' => $user->id,
                'status' => 'completed',
                'credits_granted' => $coupon->value,
                'credit_transaction_id' => $tx->id,
                'redeemed_at' => now(),
            ]);

            return [
                'coupon' => $coupon,
                'credits_added' => $coupon->value,
                'balance' => $user->fresh()->credits,
            ];
        });
    }

    /**
     * Preview giảm giá cho 1 đơn nạp (không ghi gì). Dùng ở checkout + khi tạo đơn.
     * @return array{coupon: Coupon, discount_amount: int, final_amount: int}
     */
    public function previewDiscount(string $code, User $user, int $amount): array
    {
        $normalized = $this->normalizeCode($code);
        $coupon = Coupon::where('code', $normalized)->first();
        $this->assertRedeemable($coupon, $user, $amount);

        if (! in_array($coupon->type, ['percent', 'fixed'], true)) {
            throw new CouponException('Mã này là mã tặng credits, không dùng để giảm giá.');
        }

        $discount = $this->computeDiscount($coupon, $amount);
        $final = max(0, $amount - $discount);

        return [
            'coupon' => $coupon,
            'discount_amount' => $discount,
            'final_amount' => $final,
        ];
    }

    /** Giữ chỗ 1 lượt khi tạo đơn nạp có mã giảm giá (nhả lại nếu đơn hết hạn). */
    public function reserveForPurchase(Coupon $coupon, User $user, PendingCreditPurchase $pending, int $discount): CouponRedemption
    {
        return DB::transaction(function () use ($coupon, $user, $pending, $discount) {
            $locked = Coupon::whereKey($coupon->id)->lockForUpdate()->first();
            $this->assertRedeemable($locked, $user);
            $locked->increment('used_count');

            return CouponRedemption::create([
                'coupon_id' => $locked->id,
                'user_id' => $user->id,
                'status' => 'reserved',
                'amount_discounted' => $discount,
                'pending_credit_purchase_id' => $pending->id,
                'redeemed_at' => now(),
            ]);
        });
    }

    /** Đơn nạp thanh toán thành công → chốt redemption. */
    public function completeForPurchase(PendingCreditPurchase $pending): void
    {
        CouponRedemption::where('pending_credit_purchase_id', $pending->id)
            ->where('status', 'reserved')
            ->update(['status' => 'completed']);
    }

    /** Đơn nạp hết hạn/huỷ → nhả lại lượt đã giữ. */
    public function voidForPurchase(PendingCreditPurchase $pending): void
    {
        DB::transaction(function () use ($pending) {
            $redemptions = CouponRedemption::where('pending_credit_purchase_id', $pending->id)
                ->where('status', 'reserved')
                ->lockForUpdate()
                ->get();

            foreach ($redemptions as $redemption) {
                Coupon::whereKey($redemption->coupon_id)->where('used_count', '>', 0)->decrement('used_count');
                $redemption->update(['status' => 'voided']);
            }
        });
    }

    /**
     * Mã chào mừng tự động: nếu có coupon is_welcome đang bật và user chưa nhận → cấp.
     * Bọc lỗi để KHÔNG bao giờ chặn luồng verify/đăng nhập.
     */
    public function issueWelcome(User $user): void
    {
        try {
            $welcome = Coupon::query()
                ->active()
                ->where('is_welcome', true)
                ->where('type', 'credits')
                ->orderByDesc('id')
                ->first();

            if (! $welcome || ! $welcome->isValidNow()) {
                return;
            }

            // Đã nhận mã welcome này rồi thì thôi (mỗi user 1 lần).
            $already = CouponRedemption::where('coupon_id', $welcome->id)
                ->where('user_id', $user->id)
                ->whereIn('status', ['reserved', 'completed'])
                ->exists();
            if ($already) {
                return;
            }

            $this->redeemForCredits($welcome->code, $user);
        } catch (\Throwable $e) {
            Log::warning('Welcome coupon issue failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }
    }

    // ── internals ──────────────────────────────────────────────────────────

    /** Kiểm tra mã dùng được cho user (ném CouponException tiếng Việt nếu không). */
    private function assertRedeemable(?Coupon $coupon, User $user, ?int $amount = null): void
    {
        if (! $coupon) {
            throw new CouponException('Mã không tồn tại.');
        }
        if ($coupon->user_id !== null && $coupon->user_id !== $user->id) {
            throw new CouponException('Mã này không thuộc về bạn.');
        }
        if (! $coupon->is_active) {
            throw new CouponException('Mã đã bị vô hiệu hoá.');
        }
        $now = now();
        if ($coupon->starts_at && $now->lt($coupon->starts_at)) {
            throw new CouponException('Mã chưa đến thời gian sử dụng.');
        }
        if ($coupon->expires_at && $now->gt($coupon->expires_at)) {
            throw new CouponException('Mã đã hết hạn.');
        }
        if ($coupon->max_uses !== null && $coupon->used_count >= $coupon->max_uses) {
            throw new CouponException('Mã đã hết lượt sử dụng.');
        }

        $userUses = CouponRedemption::where('coupon_id', $coupon->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['reserved', 'completed'])
            ->count();
        if ($userUses >= $coupon->max_uses_per_user) {
            throw new CouponException('Bạn đã sử dụng mã này rồi.');
        }

        if ($amount !== null && $coupon->min_purchase_amount && $amount < $coupon->min_purchase_amount) {
            $min = number_format($coupon->min_purchase_amount, 0, ',', '.');
            throw new CouponException("Đơn tối thiểu để dùng mã là {$min}đ.");
        }
    }

    private function computeDiscount(Coupon $coupon, int $amount): int
    {
        if ($coupon->type === 'fixed') {
            return min($coupon->value, $amount);
        }
        // percent
        $discount = (int) floor($amount * $coupon->value / 100);
        if ($coupon->max_discount !== null) {
            $discount = min($discount, $coupon->max_discount);
        }
        return min($discount, $amount);
    }
}
