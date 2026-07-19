<?php

namespace App\Http\Controllers\API;

use App\Exceptions\CouponException;
use App\Http\Controllers\Controller;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function __construct(private CouponService $couponService)
    {
    }

    /** Nhập mã tặng credits → cộng credits cho user. */
    public function redeem(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'max:64'],
        ]);

        try {
            $result = $this->couponService->redeemForCredits($request->input('code'), $request->user());
        } catch (CouponException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đổi mã thành công! +' . number_format($result['credits_added'], 0, ',', '.') . ' credits.',
            'credits_added' => $result['credits_added'],
            'balance' => $result['balance'],
        ]);
    }

    /** Preview mã giảm giá cho một số tiền nạp (dùng ở checkout). */
    public function validateDiscount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64'],
            'amount' => ['required', 'integer', 'min:1'],
        ]);

        try {
            $result = $this->couponService->previewDiscount($data['code'], $request->user(), (int) $data['amount']);
        } catch (CouponException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'discount_amount' => $result['discount_amount'],
            'final_amount' => $result['final_amount'],
        ]);
    }
}
