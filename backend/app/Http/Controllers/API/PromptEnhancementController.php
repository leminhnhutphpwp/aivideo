<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\PromptEnhancementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromptEnhancementController extends Controller
{
    public function __construct(protected PromptEnhancementService $service) {}

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

        try {
            return response()->json(['success' => true, 'data' => $this->service->enhance($data)]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }
}
