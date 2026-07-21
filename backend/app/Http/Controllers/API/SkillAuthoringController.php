<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\SkillAuthoringService;
use App\Support\ErrorSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillAuthoringController extends Controller
{
    public function __construct(protected SkillAuthoringService $authoring) {}

    /** The authoring contract/config AI agents follow (categories + schema + rules). */
    public function schema(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return response()->json(['success' => true, 'data' => $this->authoring->schema()]);
    }

    /** Generate a skill via AI and save it as a draft for review. */
    public function author(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'category' => 'required|string|max:64',
            'brief' => 'required|string|min:5|max:2000',
            'trendContext' => 'nullable|string|max:4000',
        ]);

        try {
            $draft = $this->authoring->authorDraft(
                $data['category'],
                $data['brief'],
                $data['trendContext'] ?? null,
            );

            return response()->json(['success' => true, 'data' => $draft], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => ErrorSanitizer::publicMessage($e->getMessage())], 422);
        }
    }

    protected function ensureAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'super_admin'])) {
            abort(403, 'Chỉ quản trị viên mới được dùng AI tạo skill.');
        }
    }
}
