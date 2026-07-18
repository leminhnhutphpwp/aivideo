<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $page = (int) $request->get('page', 1);
        $perPage = 20;

        $query = Notification::where('status', Notification::STATUS_SENT)
            ->whereHas('users', fn ($q) => $q->where('user_id', $user->id))
            ->with(['users' => fn ($q) => $q->where('user_id', $user->id)])
            ->orderBy('created_at', 'desc');

        $total = $query->count();
        $items = $query->offset(($page - 1) * $perPage)->limit($perPage)->get();

        $data = $items->map(function ($notification) use ($user) {
            $pivot = $notification->users->first()?->pivot;
            return [
                'uuid' => $notification->uuid,
                'title' => $notification->title,
                'body' => $notification->body,
                'type' => $notification->type,
                'read' => $pivot ? (bool) $pivot->read : false,
                'read_at' => $pivot?->read_at,
                'sent_at' => $notification->sent_at,
                'created_at' => $notification->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $data,
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = \DB::table('notification_user')
            ->where('user_id', $request->user()->id)
            ->where('read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $count],
        ]);
    }

    public function show(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();

        $pivot = \DB::table('notification_user')
            ->where('notification_id', $notification->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$pivot) {
            return response()->json([
                'success' => false,
                'message' => 'Thông báo không tồn tại',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'uuid' => $notification->uuid,
                'title' => $notification->title,
                'body' => $notification->body,
                'type' => $notification->type,
                'read' => (bool) $pivot->read,
                'read_at' => $pivot->read_at,
                'sent_at' => $notification->sent_at,
                'created_at' => $notification->created_at,
            ],
        ]);
    }

    public function markAsRead(Request $request, Notification $notification): JsonResponse
    {
        $user = $request->user();

        $updated = \DB::table('notification_user')
            ->where('notification_id', $notification->id)
            ->where('user_id', $user->id)
            ->update(['read' => true, 'read_at' => now()]);

        if (!$updated) {
            return response()->json([
                'success' => false,
                'message' => 'Thông báo không tồn tại',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu đã đọc',
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        \DB::table('notification_user')
            ->where('user_id', $request->user()->id)
            ->where('read', false)
            ->update(['read' => true, 'read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu tất cả đã đọc',
        ]);
    }
}
