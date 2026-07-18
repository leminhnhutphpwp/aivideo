<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Report;
use App\Models\RenderJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function store(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'reason' => 'required|in:spam,inappropriate,copyright,other',
            'details' => 'nullable|string|max:500',
        ]);

        $existing = Report::where('user_id', $user->id)
            ->where('render_job_id', $renderJob->id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Bạn đã báo cáo tác phẩm này rồi'], 409);
        }

        Report::create([
            'user_id' => $user->id,
            'render_job_id' => $renderJob->id,
            'reason' => $request->input('reason'),
            'details' => $request->input('details'),
        ]);

        return response()->json(['success' => true, 'message' => 'Đã gửi báo cáo thành công']);
    }
}
