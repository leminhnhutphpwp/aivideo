<?php

namespace App\Services;

use App\Support\ErrorSanitizer;
use App\Support\LlmConfigResolver;
use Illuminate\Support\Facades\Http;

/**
 * Rewrites a user's draft prompt into a stronger one via the daemon LLM, using
 * the same admin-managed AI config as skill authoring (LlmConfigResolver). Any
 * authenticated studio user can call it.
 */
class PromptEnhancementService
{
    /** @return array{enhanced_prompt:string,suggestions:array} */
    public function enhance(array $data): array
    {
        $resp = Http::timeout(60)->post(
            rtrim(config('daemon.base_url'), '/').'/api/media/enhance-prompt',
            array_filter([
                'prompt' => $data['prompt'],
                'surface' => $data['surface'] ?? 'video',
                'skill_id' => $data['skill_id'] ?? null,
                'style' => $data['style'] ?? null,
                'mood' => $data['mood'] ?? null,
                'camera' => $data['camera'] ?? null,
                'lighting' => $data['lighting'] ?? null,
                'locale' => $data['locale'] ?? null,
                'llm' => LlmConfigResolver::resolve(), // admin override; null ⇒ daemon .env
            ], fn ($v) => $v !== null && $v !== ''),
        );

        if (! $resp->successful()) {
            $raw = $resp->json('error');
            throw new \RuntimeException(ErrorSanitizer::publicMessage(is_string($raw) ? $raw : 'Cải thiện prompt thất bại.'));
        }

        return [
            'enhanced_prompt' => (string) $resp->json('enhanced_prompt', ''),
            'suggestions' => $resp->json('suggestions', []),
        ];
    }
}
