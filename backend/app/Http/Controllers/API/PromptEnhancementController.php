<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ContentFilterService;
use App\Services\PromptEnhancementService;
use App\Support\ErrorSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PromptEnhancementController extends Controller
{
    public function __construct(
        protected PromptEnhancementService $service,
        protected ContentFilterService $contentFilter,
    ) {}

    /** AI-rewrite a draft prompt. Any authenticated studio user. */
    public function enhance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt' => 'required|string|min:5|max:5000',
            'surface' => 'nullable|in:video,image',
            'skill_id' => 'nullable|string|max:80',
            'style' => 'nullable|string|max:80',
            'mood' => 'nullable|string|max:80',
            'camera' => 'nullable|string|max:80',
            'lighting' => 'nullable|string|max:80',
            'locale' => 'nullable|in:vi,en',
        ]);

        // Content moderation — reject unsafe prompts BEFORE forwarding to the LLM, like every
        // other user-text→provider path (render/storyboard/voiceover). Never surface the term.
        if ($this->contentFilter->containsProhibitedContent($data['prompt'])) {
            Log::warning('Enhance prompt blocked by content filter', [
                'user_id' => $request->user()?->id,
                'term' => $this->contentFilter->getProhibitedTerm($data['prompt']),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Nội dung mô tả vi phạm tiêu chuẩn an toàn của nền tảng. Vui lòng chỉnh sửa và thử lại.',
            ], 422);
        }

        try {
            return response()->json(['success' => true, 'data' => $this->service->enhance($data)]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => ErrorSanitizer::publicMessage($e->getMessage())], 422);
        }
    }
}
