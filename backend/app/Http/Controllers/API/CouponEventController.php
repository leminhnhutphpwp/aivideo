<?php

namespace App\Http\Controllers\API;

use App\Exceptions\CouponException;
use App\Http\Controllers\Controller;
use App\Models\CouponEvent;
use App\Services\CouponEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponEventController extends Controller
{
    public function __construct(private CouponEventService $eventService)
    {
    }

    /** Danh sách sự kiện ưu đãi công khai user có thể nhận. */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'events' => $this->eventService->listActiveForUser($request->user()),
        ]);
    }

    /** Nhận mã riêng từ một sự kiện. */
    public function claim(Request $request, string $slug): JsonResponse
    {
        $event = CouponEvent::where('slug', $slug)->where('is_public', true)->first();
        if (! $event) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy sự kiện.'], 404);
        }

        try {
            $coupon = $this->eventService->claim($event, $request->user());
        } catch (CouponException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nhận mã thành công!',
            'code' => $coupon->code,
            'reward_type' => $coupon->type,
            'value' => $coupon->value,
            'expires_at' => $coupon->expires_at,
        ]);
    }
}
