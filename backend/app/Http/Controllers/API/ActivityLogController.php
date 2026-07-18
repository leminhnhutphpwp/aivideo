<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    /**
     * Nhật ký hoạt động của user đang login
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = ActivityLog::with(['causer', 'subject'])
            ->where('causer_id', $user->id)
            ->where('causer_type', 'App\\Models\\User');

        if ($request->has('search')) {
            $search = str_replace(['%', '_'], ['\%', '\_'], $request->get('search'));
            $query->where('description', 'like', "%{$search}%");
        }

        if ($request->has('event')) {
            $query->where('event', $request->get('event'));
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->get('date_to'));
        }

        $query->orderBy('created_at', 'desc');

        $perPage = (int) $request->get('per_page', 15);
        $page = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ActivityLogResource::collection($page->items()),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ]);
    }

    /**
     * Chi tiết một log (chỉ của user đang login)
     */
    public function show(int $id): JsonResponse
    {
        $user = request()->user();
        
        $log = ActivityLog::with(['causer', 'subject'])
            ->where('id', $id)
            ->where('causer_id', $user->id)
            ->first();

        if (!$log) {
            return response()->json(['message' => 'Không tìm thấy'], 404);
        }

        return response()->json(new ActivityLogResource($log));
    }

    /**
     * Thống kê của user đang login
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->get('period', 'week');

        $query = ActivityLog::where('causer_id', $user->id)
            ->where('causer_type', 'App\\Models\\User');

        switch ($period) {
            case 'today':
                $query->whereDate('created_at', today());
                break;
            case 'week':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'month':
                $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year);
                break;
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        $total = $query->count();
        $eventsBreakdown = (clone $query)->selectRaw('event, COUNT(*) as count')
            ->groupBy('event')->pluck('count', 'event')->toArray();

        $dailyBreakdown = [];
        if (in_array($period, ['week', 'month'])) {
            $days = $period === 'week' ? 7 : 30;
            for ($i = 0; $i < $days; $i++) {
                $date = now()->subDays($i)->format('Y-m-d');
                $count = ActivityLog::whereDate('created_at', $date)
                    ->where('causer_id', $user->id)->count();
                $dailyBreakdown[] = ['date' => $date, 'count' => $count];
            }
            $dailyBreakdown = array_reverse($dailyBreakdown);
        }

        return response()->json([
            'total_activities' => $total,
            'period' => $period,
            'events_breakdown' => $eventsBreakdown,
            'daily_breakdown' => $dailyBreakdown,
        ]);
    }
}
