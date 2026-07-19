<?php
namespace App\Http\Controllers\API;

use App\Exceptions\CouponException;
use App\Jobs\SendTelegramNotification;
use App\Models\CreditSetting;
use App\Models\CreditTransaction;
use App\Models\PendingCreditPurchase;
use App\Models\Plan;
use App\Models\PlanUpgrade;
use App\Services\CouponService;
use App\Services\CreditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

class CreditController extends Controller
{
    public function __construct(
        protected CreditService $creditService,
        protected CouponService $couponService
    ) {
        $this->middleware('auth:api');
    }

    public function balance(Request $request): JsonResponse
    {
        return response()->json([
            'balance' => $request->user()->credits,
        ]);
    }

    public function packs(): JsonResponse
    {
        $packs = \App\Models\CreditPack::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('price', 'asc')
            ->get();
            
        return response()->json($packs);
    }

    public function history(Request $request): JsonResponse
    {
        return $this->cleanPaginateResponse(
            $request,
            CreditTransaction::where('user_id', $request->user()->id)->orderBy('created_at', 'desc')
        );
    }

    public const MAX_PENDING_PURCHASES = 3;
    public const MAX_PENDING_UPGRADES = 2;

    public function purchase(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:' . CreditSetting::get('min_purchase_amount', 50000) . '|max:' . CreditSetting::get('max_purchase_amount', 10000000),
            'coupon_code' => 'nullable|string|max:64',
        ]);

        $user = $request->user();

        $pendingCount = PendingCreditPurchase::where('user_id', $user->id)
            ->where('status', PendingCreditPurchase::STATUS_PENDING)
            ->count();

        if ($pendingCount >= self::MAX_PENDING_PURCHASES) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đang có ' . $pendingCount . ' yêu cầu nạp credits chờ xử lý. Vui lòng đợi admin duyệt trước khi tạo yêu cầu mới.',
            ], 429);
        }

        // Match amount with a DB package or use exchange_rate fallback. Credits luôn theo giá GỐC —
        // coupon chỉ giảm số tiền phải trả, không đổi số credits nhận được.
        $originalAmount = (int) $request->amount;
        $creditPack = \App\Models\CreditPack::where('price', $originalAmount)->where('is_active', true)->first();

        if ($creditPack) {
            $credits = $creditPack->credits;
        } else {
            $exchangeRate = \App\Models\CreditSetting::exchangeRate();
            $credits = (int) ceil($originalAmount * $exchangeRate);
        }

        // Mã giảm giá (nếu có): tính server-side số tiền phải trả sau giảm.
        $payableAmount = $originalAmount;
        $discount = 0;
        $appliedCoupon = null;
        if ($request->filled('coupon_code')) {
            try {
                $preview = $this->couponService->previewDiscount($request->input('coupon_code'), $user, $originalAmount);
            } catch (CouponException $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
            }
            $appliedCoupon = $preview['coupon'];
            $discount = $preview['discount_amount'];
            $payableAmount = $preview['final_amount'];
        }

        // Tạo mã giao dịch ngắn: DH + 8 ký tự ngẫu nhiên
        $transferCode = $this->generateTransferCode('DH');

        $pending = PendingCreditPurchase::create([
            'user_id' => $user->id,
            'transfer_code' => $transferCode,
            'amount' => $payableAmount, // số tiền webhook SePay đối chiếu (đã giảm)
            'credits' => $credits,
        ]);

        // Giữ chỗ lượt coupon (nhả lại nếu đơn hết hạn/huỷ).
        if ($appliedCoupon) {
            $this->couponService->reserveForPurchase($appliedCoupon, $user, $pending, $discount);
        }

        $bankInfo = config('sepay.bank_info', [
            'bank' => 'MB Bank',
            'account' => '0359123456',
            'holder' => 'CONG TY CP ...',
        ]);

        $escapedName = htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8');
        $time = now()->format('d/m/Y H:i');
        SendTelegramNotification::dispatch(
            "<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n"
            . "<b>🏢 AIVideo Platform</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "🆕 <b>YÊU CẦU NẠP CREDITS</b>\n\n"
            . "👤 <b>Người dùng:</b> {$escapedName}\n"
            . "🆔 <b>ID:</b> {$user->id}\n"
            . "📧 <b>Email:</b> {$user->email}\n"
            . "📅 <b>Thời gian:</b> {$time}\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "💰 <b>Số tiền:</b> " . number_format($payableAmount) . "₫"
            . ($discount > 0 ? " <i>(đã giảm " . number_format($discount) . "₫ từ " . number_format($originalAmount) . "₫)</i>" : "") . "\n"
            . "🎯 <b>Credits nhận:</b> {$credits}\n"
            . "🔗 <b>Mã chuyển khoản:</b> <code>{$transferCode}</code>\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "🟡 <b>Trạng thái:</b> Chờ xác nhận\n"
            . "⏳ <b>Hạn xử lý:</b> Trong vòng 24h\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . "🔗 <a href=\"" . url('/admin') . "\">Phê duyệt tại Admin →</a>",
            'credit_purchase'
        );

        return response()->json([
            'message' => 'Vui lòng chuyển khoản theo thông tin bên dưới',
            'bank' => $bankInfo,
            'amount' => $payableAmount,
            'original_amount' => $originalAmount,
            'discount_amount' => $discount,
            'content' => $transferCode,
            'credits_to_receive' => $credits,
            'note' => 'Sao chép nội dung chuyển khoản chính xác để được cộng credits tự động',
        ]);
    }

    protected function generateTransferCode(string $prefix = ''): string
    {
        do {
            $code = $prefix . strtoupper(Str::random(8));
        } while (
            PendingCreditPurchase::where('transfer_code', $code)->exists() ||
            PlanUpgrade::where('transfer_code', $code)->exists()
        );

        return $code;
    }

    public function upgrade(Request $request): JsonResponse
    {
        $request->validate([
            'plan_slug' => 'required|string|exists:plans,slug',
        ]);

        $user = $request->user();
        $targetPlan = Plan::where('slug', $request->plan_slug)->firstOrFail();

        $pendingUpgrades = PlanUpgrade::where('user_id', $user->id)
            ->where('status', PlanUpgrade::STATUS_PENDING)
            ->count();

        if ($pendingUpgrades >= self::MAX_PENDING_UPGRADES) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đang có ' . $pendingUpgrades . ' yêu cầu nâng cấp chờ xử lý. Vui lòng đợi admin duyệt trước khi tạo yêu cầu mới.',
            ], 429);
        }

        // Check if already on this plan
        if ($user->plan_id === $targetPlan->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đang sử dụng gói này rồi',
            ], 400);
        }

        // Check if upgrading (not downgrading)
        $currentPriority = $user->plan->queue_priority ?? 'low';
        if ($targetPlan->queue_priority === 'low' && $currentPriority === 'high') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hạ cấp xuống gói thấp hơn. Liên hệ hỗ trợ để được hỗ trợ.',
            ], 400);
        }

        // Get bank info
        $bankInfo = config('sepay.bank_info', [
            'bank' => 'MB Bank',
            'account' => '0359123456',
            'holder' => 'CONG TY CP ...',
        ]);

        // Price in VND
        $price = $targetPlan->price_sale ?? $targetPlan->price_regular;

        // Tạo mã giao dịch ngắn: NA + 8 ký tự ngẫu nhiên
        $transferCode = $this->generateTransferCode('NA');

        // Calculate plan expiry (1 month from now)
        $planExpiresAt = now()->addMonth();

        // Create pending upgrade record
        $upgrade = PlanUpgrade::create([
            'user_id' => $user->id,
            'from_plan_id' => $user->plan_id,
            'to_plan_id' => $targetPlan->id,
            'amount' => $price,
            'transfer_code' => $transferCode,
            'status' => PlanUpgrade::STATUS_PENDING,
            'description' => "Nâng cấp lên {$targetPlan->name}",
        ]);

        $escapedName = htmlspecialchars($user->name, ENT_QUOTES, 'UTF-8');
        $time = now()->format('d/m/Y H:i');
        SendTelegramNotification::dispatch(
            "<b>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</b>\n"
            . "<b>🏢 AIVideo Platform</b>\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "🆙 <b>YÊU CẦU NÂNG CẤP GÓI</b>\n\n"
            . "👤 <b>Người dùng:</b> {$escapedName}\n"
            . "🆔 <b>ID:</b> {$user->id}\n"
            . "📧 <b>Email:</b> {$user->email}\n"
            . "📅 <b>Thời gian:</b> {$time}\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "📦 <b>Gói hiện tại:</b> {$user->plan->name}\n"
            . "🎯 <b>Gói muốn nâng:</b> {$targetPlan->name}\n"
            . "💰 <b>Số tiền:</b> " . number_format($price) . "₫\n"
            . "🔗 <b>Mã chuyển khoản:</b> <code>{$transferCode}</code>\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            . "🟡 <b>Trạng thái:</b> Chờ xác nhận\n"
            . "⏳ <b>Hạn xử lý:</b> Trong vòng 24h\n\n"
            . "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            . "🔗 <a href=\"" . url('/admin') . "\">Phê duyệt tại Admin →</a>",
            'plan_upgrade'
        );

        return response()->json([
            'success' => true,
            'message' => 'Vui lòng chuyển khoản để nâng cấp gói dịch vụ',
            'upgrade_transfer_code' => $upgrade->transfer_code,
            'current_plan' => $user->plan->name,
            'target_plan' => $targetPlan->name,
            'bank' => $bankInfo,
            'amount' => $price,
            'content' => $transferCode,
            'plan_expires_at' => $planExpiresAt->format('Y-m-d H:i:s'),
            'note' => 'Sao chép nội dung chuyển khoản CHÍNH XÁC để được nâng cấp tự động',
        ]);
    }

    public function upgradeHistory(Request $request): JsonResponse
    {
        return $this->cleanPaginateResponse(
            $request,
            PlanUpgrade::where('user_id', $request->user()->id)
                ->with(['fromPlan', 'toPlan'])
                ->orderBy('created_at', 'desc')
        );
    }

    public function settings(): JsonResponse
    {
        return response()->json([
            'exchange_rate' => CreditSetting::exchangeRate(),
            'min_purchase_amount' => (int) CreditSetting::get('min_purchase_amount', 50000),
            'max_purchase_amount' => (int) CreditSetting::get('max_purchase_amount', 10000000),
        ]);
    }

    public function pendingPurchases(Request $request): JsonResponse
    {
        $purchases = PendingCreditPurchase::where('user_id', $request->user()->id)
            ->where('status', PendingCreditPurchase::STATUS_PENDING)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'transfer_code', 'amount', 'credits', 'status', 'created_at', 'updated_at']);

        return response()->json([
            'data' => $purchases->map(fn ($p) => [
                'transfer_code' => $p->transfer_code,
                'amount' => $p->amount,
                'credits' => $p->credits,
                'status' => $p->status,
                'created_at' => $p->created_at,
                'paid_at' => $p->status === 'paid' ? $p->updated_at : null,
            ]),
        ]);
    }
}
