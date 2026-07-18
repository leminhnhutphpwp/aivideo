<?php

namespace App\Services;

use App\Support\ErrorSanitizer;
use App\Support\LlmConfigResolver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiStoryboardService
{
    public function generateDraft(string $concept, string $videoType = 'ugc_review'): array
    {
        $daemonUrl = rtrim(config('daemon.base_url', 'http://daemon:7456'), '/');

        try {
            // Reasoning models (e.g. MiniMax) "think" before emitting JSON, so a full
            // multi-scene draft can take well over a minute. 180s avoids false timeouts;
            // for snappy drafts pick a non-reasoning model in /admin/manage-ai-settings.
            $response = Http::timeout(180)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post("{$daemonUrl}/api/media/ai-draft", array_filter([
                    'concept' => $concept,
                    'video_type' => $videoType,
                    // Same admin-managed AI config as the prompt enhancer (AiSettings →
                    // LlmConfigResolver). null ⇒ filtered out ⇒ daemon falls back to its .env.
                    'llm' => LlmConfigResolver::resolve(),
                ], fn ($v) => $v !== null && $v !== ''));

            if (!$response->successful()) {
                $body = $response->json();
                $msg = $body['error'] ?? 'AI service unavailable';
                Log::error('AI draft: daemon error', ['status' => $response->status(), 'error' => $msg]);
                throw new \RuntimeException(ErrorSanitizer::publicMessage(is_string($msg) ? $msg : 'Tạo kịch bản thất bại.'));
            }

            $scenes = $response->json('scenes', []);
            if (count($scenes) < 2) {
                throw new \RuntimeException('AI chưa tạo đủ cảnh, vui lòng mô tả ý tưởng chi tiết hơn.');
            }

            return $scenes;
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('AI draft: connection failed', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Không thể kết nối đến AI service');
        }
    }
}
