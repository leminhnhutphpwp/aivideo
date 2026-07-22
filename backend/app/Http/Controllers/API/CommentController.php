<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\RenderJob;
use App\Services\ContentFilterService;
use App\Services\UserNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api')->only(['store', 'destroy']);
    }

    public function index(Request $request, RenderJob $renderJob): JsonResponse
    {
        // Endpoint public: không lộ bình luận của asset chưa đăng cộng đồng.
        if (! $renderJob->isPublished()) {
            abort(404);
        }

        $limit = min((int) $request->input('limit', 20), 50);
        $offset = (int) $request->input('offset', 0);

        $query = Comment::where('render_job_id', $renderJob->id)
            ->whereNull('parent_id')
            ->with(['user:id,uuid,name,username,avatar_media_id,reputation_level', 'replies.user:id,uuid,name,username,avatar_media_id,reputation_level'])
            ->orderByDesc('created_at');

        $total = (clone $query)->count();
        $comments = $query->skip($offset)->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $comments,
            'total' => $total,
            'has_more' => $offset + $limit < $total,
        ]);
    }

    public function store(Request $request, RenderJob $renderJob): JsonResponse
    {
        $user = $request->user();

        // Chỉ cho phép bình luận trên asset đã đăng lên cộng đồng.
        if (! $renderJob->isPublished()) {
            abort(404);
        }

        if ($renderJob->status !== 'completed') {
            return response()->json(['error' => 'Asset chưa hoàn thành'], 422);
        }

        // Limit comments per user per day to prevent spam
        $startOfDay = now()->startOfDay()->utc();
        $endOfDay = now()->endOfDay()->utc();
        $todayCommentsCount = Comment::where('user_id', $user->id)
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->count();

        $commentLimit = 50; // Max 50 comments per day
        if ($todayCommentsCount >= $commentLimit) {
            return response()->json([
                'error' => "Bạn đã đạt giới hạn {$commentLimit} bình luận hôm nay"
            ], 429);
        }

        $request->validate([
            'content' => 'required|string|max:1000',
            // Bình luận cha phải thuộc chính asset này (tránh reply chéo sang asset khác).
            'parent_id' => [
                'nullable',
                Rule::exists('comments', 'id')->where('render_job_id', $renderJob->id),
            ],
        ]);

        // Check for sensitive content
        $contentFilter = app(ContentFilterService::class);
        if ($contentFilter->containsBlockedWords($request->input('content'))) {
            return response()->json([
                'error' => 'Nội dung bình luận chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa.'
            ], 422);
        }

        $comment = Comment::create([
            'user_id' => $user->id,
            'render_job_id' => $renderJob->id,
            'parent_id' => $request->input('parent_id'),
            'content' => $request->input('content'),
        ]);

        $comment->load('user:id,uuid,name,username,avatar_media_id,reputation_level');

        // Send notification to asset owner
        app(UserNotificationService::class)->notifyComment($user, $comment);

        return response()->json(['success' => true, 'data' => $comment], 201);
    }

    public function destroy(Request $request, Comment $comment): JsonResponse
    {
        $user = $request->user();

        if ($comment->user_id !== $user->id) {
            return response()->json(['error' => 'Không có quyền xóa bình luận này'], 403);
        }

        $comment->delete();

        return response()->json(['success' => true]);
    }
}
