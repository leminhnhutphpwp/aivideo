<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use App\Services\CreditService;
use App\Services\ModelSelector;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DaemonClient
{
    protected string $baseUrl;
    protected string $webhookSecret;
    protected int $timeout;
    protected string $projectId;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('daemon.base_url'), '/');
        $this->webhookSecret = config('daemon.webhook_secret');
        $this->timeout = (int) config('daemon.timeout', 30);
        $this->projectId = config('daemon.project_id');
    }

    protected function withAuth(): \Illuminate\Http\Client\PendingRequest
    {
        $signature = hash_hmac('sha256', 'laravel-app', $this->webhookSecret);
        return Http::timeout($this->timeout)
            ->withHeaders([
                'X-User-ID' => 'laravel-app',
                'X-Daemon-Signature' => $signature,
            ]);
    }

    public function createProject(string $projectId, ?string $name = null): string
    {
        $response = $this->withAuth()
            ->timeout(10)
            ->post("{$this->baseUrl}/api/projects", [
                'id' => $projectId,
                'name' => $name ?? $projectId,
                'metadata' => [
                    'source' => 'aivideo-laravel',
                ],
            ]);

        $this->throwIfFailed($response, 'Failed to create daemon project');

        $data = $response->json();
        return $data['project']['id'] ?? $projectId;
    }

    public function generateMedia(string $projectId, array $params, string $callbackUrl): string
    {
        $videoType = $params['video_type'] ?? null;
        $capability = $params['capability'] ?? null;
        $isImage = in_array($videoType, ['image_generation', 'image_editing']) || in_array($capability, ['t2i', 'i2i', 'inpaint']);
        $surface = $isImage ? 'image' : 'video';
        $ext = $isImage ? '.png' : '.mp4';

        $resolvedModel = $this->resolveModel($params['model'] ?? ModelSelector::getDefaultModel('text_to_video'));

        $body = [
            'surface' => $surface,
            'model' => $resolvedModel,
            'prompt' => $params['prompt'] ?? '',
            'aspect' => $params['aspect_ratio'] ?? ($isImage ? '1:1' : '16:9'),
            'length' => $params['duration_seconds'] ?? 5,
            'output' => "{$params['render_job_uuid']}{$ext}",
            'metadata' => [
                'callbackUrl' => $callbackUrl,
                'render_job_uuid' => $params['render_job_uuid'] ?? null,
            ],
        ];

        $plan = $params['plan'] ?? null;
        if (!$plan) {
            $jobUuid = $params['render_job_uuid'] ?? null;
            if ($jobUuid) {
                $job = \App\Models\RenderJob::where('uuid', $jobUuid)->first();
                if ($job && $job->user) {
                    $plan = $job->user->plan;
                }
            }
        }
        if (!$plan && auth()->check()) {
            $plan = auth()->user()->plan;
        }

        if ($plan instanceof \App\Models\Plan) {
            $providerId = $plan->getProviderForModel($resolvedModel);
            $body['provider_id'] = $providerId;
            $body['protocol'] = $plan->getProviderProtocol($providerId);
            $body['credentials'] = [
                'providerId' => $providerId,
                'apiKey' => $plan->getProviderApiKey($providerId),
                'baseUrl' => $plan->getProviderBaseUrl($providerId),
            ];
        } else {
            $freePlan = \App\Models\Plan::where('slug', 'free')->first();
            $providerId = $freePlan?->getProviderForModel($resolvedModel) ?? 'stub';
            $body['provider_id'] = $providerId;
            if ($freePlan) {
                $body['protocol'] = $freePlan->getProviderProtocol($providerId);
            }
            $body['credentials'] = [
                'providerId' => $providerId,
            ];
        }

        if (!empty($params['reference_images'])) {
            $body['image'] = $params['reference_images'][0] ?? null;
            $body['last_frame'] = $params['reference_images'][1] ?? null;
        }

        if (!empty($params['style'])) {
            $body['style'] = $params['style'];
        }
        if (!empty($params['mood'])) {
            $body['mood'] = $params['mood'];
        }
        if (!empty($params['negative_prompt'])) {
            $body['negative_prompt'] = $params['negative_prompt'];
        }
        if (!empty($params['camera_movement'])) {
            $body['camera'] = $params['camera_movement'];
        }
        if (!empty($params['lighting'])) {
            $body['lighting'] = $params['lighting'];
        }
        if (!empty($params['driving_audio'])) {
            $body['driving_audio'] = $params['driving_audio'];
        }
        if (isset($params['thinking_mode'])) {
            // Per-request deliberation toggle for DashScope-backed image models (xah.io) —
            // enabled for the multi-panel storyboard sheet, off for ordinary image gen.
            $body['thinking_mode'] = (bool) $params['thinking_mode'];
        }
        if (!empty($params['shot_type']) && $params['shot_type'] === 'multi') {
            $body['shotType'] = 'multi';
            if (!empty($params['reference_image'])) {
                $body['multiPanelImage'] = $params['reference_image'];
            }
        } else {
            if (!empty($params['reference_image'])) {
                $body['image'] = $params['reference_image'];
            }
            if (!empty($params['last_frame_image'])) {
                $body['last_frame'] = $params['last_frame_image'];
            }
            if (!empty($params['shot_type'])) {
                $body['shotType'] = $params['shot_type'];
            }
        }
        $response = $this->withAuth()
            ->post("{$this->baseUrl}/api/media/projects/{$projectId}/media/generate", $body);

        $this->throwIfFailed($response, 'Failed to submit media generation');

        $data = $response->json();
        return $data['taskId'];
    }

    public function generateAudio(string $projectId, string $text, string $voice, string $callbackUrl = '', $plan = null): string
    {
        $resolvedModel = ModelSelector::getDefaultModel('tts');
        if ($voice === 'elevenlabs' || str_contains($voice, 'eleven')) {
            $resolvedModel = 'elevenlabs-v3';
        }

        $body = [
            'surface' => 'audio',
            'model' => $resolvedModel,
            'prompt' => $text,
            'voice' => $voice,
            'audioKind' => 'speech',
            'output' => 'voiceover-' . Str::uuid() . '.mp3',
        ];

        if ($callbackUrl) {
            $body['metadata'] = ['callbackUrl' => $callbackUrl];
        }

        if ($plan instanceof \App\Models\Plan) {
            $providerId = $plan->getProviderForModel($resolvedModel);
            $body['provider_id'] = $providerId;
            $body['protocol'] = $plan->getProviderProtocol($providerId);
            $body['credentials'] = [
                'providerId' => $providerId,
                'apiKey' => $plan->getProviderApiKey($providerId),
                'baseUrl' => $plan->getProviderBaseUrl($providerId),
            ];
        } else {
            $freePlan = \App\Models\Plan::where('slug', 'free')->first();
            $providerId = $freePlan?->getProviderForModel($resolvedModel) ?? 'stub';
            $body['provider_id'] = $providerId;
            if ($freePlan) {
                $body['protocol'] = $freePlan->getProviderProtocol($providerId);
            }
            $body['credentials'] = [
                'providerId' => $providerId,
            ];
        }

        $response = $this->withAuth()
            ->post("{$this->baseUrl}/api/media/projects/{$projectId}/media/generate", $body);

        $this->throwIfFailed($response, 'Failed to submit audio generation');

        return $response->json()['taskId'];
    }

    public function getTaskStatus(string $taskId, int $since = 0, int $timeoutMs = 25000): array
    {
        $response = $this->withAuth()->timeout(30)
            ->post("{$this->baseUrl}/api/media/tasks/{$taskId}/wait", [
                'since' => $since,
                'timeoutMs' => $timeoutMs,
            ]);

        $this->throwIfFailed($response, 'Failed to get task status');

        return $response->json();
    }

    /**
     * Moderate an output image before it reaches the public feed.
     *
     * Calls the daemon's vision moderator (claude-haiku-4.5). The endpoint is
     * itself fail-open; this client is fail-open too — any transport/parse error
     * returns a safe+degraded verdict so a broken vision provider never blocks a
     * legitimate publish.
     *
     * @param  string  $imageUrl  Publicly fetchable http(s) URL or a data:image URI.
     * @return array{safe: bool, reason?: string, degraded?: bool, simulated?: bool}
     */
    public function moderateImage(string $imageUrl): array
    {
        try {
            $response = $this->withAuth()
                ->timeout(20)
                ->post("{$this->baseUrl}/api/media/moderate-image", [
                    'imageUrl' => $imageUrl,
                ]);

            if ($response->failed()) {
                Log::warning('Image moderation request failed, failing open', [
                    'status' => $response->status(),
                ]);
                return ['safe' => true, 'degraded' => true];
            }

            $data = $response->json();
            if (!is_array($data) || !array_key_exists('safe', $data)) {
                return ['safe' => true, 'degraded' => true];
            }

            return $data;
        } catch (\Throwable $e) {
            Log::warning('Image moderation call threw, failing open', [
                'error' => $e->getMessage(),
            ]);
            return ['safe' => true, 'degraded' => true];
        }
    }

    public function health(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/health");
            return $response->successful();
        } catch (\Throwable) {
            return false;
        }
    }

    public function isModelAvailable(string $modelAlias): bool
    {
        return $this->health();
    }

    public function uploadFile(string $projectId, string $localPath, ?string $filename = null): string
    {
        $filename ??= basename($localPath);
        $response = $this->withAuth()
            ->timeout(120)
            ->attach('file', file_get_contents($localPath), $filename)
            ->post("{$this->baseUrl}/api/projects/{$projectId}/upload");

        $this->throwIfFailed($response, "Failed to upload file {$filename}");
        $data = $response->json();
        return $data['file']['name'] ?? $data['filename'] ?? $data['name'] ?? $filename;
    }

    public function downloadFile(string $projectId, string $filename): string
    {
        $response = $this->withAuth()
            ->get("{$this->baseUrl}/api/projects/{$projectId}/raw/{$filename}");

        $this->throwIfFailed($response, "Failed to download file {$filename}");

        $tempPath = tempnam(sys_get_temp_dir(), 'daemon_');
        file_put_contents($tempPath, $response->body());
        return $tempPath;
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if (empty($this->webhookSecret)) {
            return false;
        }
        $expected = hash_hmac('sha256', $payload, $this->webhookSecret);
        return hash_equals($expected, $signature);
    }

    public static function resolveModel(?string $model): string
    {
        if ($model) return $model;
        return app(ModelSelector::class)->resolve(
            'standard',
            'text_to_video'
        );
    }

    public function listProjects(): array
    {
        $response = Http::timeout($this->timeout)->get("{$this->baseUrl}/api/projects");
        $this->throwIfFailed($response, 'Failed to list daemon projects');
        return $response->json() ?? [];
    }

    public function cancelTask(string $taskId): bool
    {
        $response = $this->withAuth()
            ->timeout(10)
            ->post("{$this->baseUrl}/api/media/tasks/{$taskId}/cancel");

        if ($response->failed()) {
            Log::warning('Failed to cancel daemon task', [
                'task_id' => $taskId,
                'status' => $response->status(),
            ]);

            return false;
        }

        return true;
    }

    public function deleteProject(string $projectId): bool
    {
        $response = Http::timeout($this->timeout)->delete("{$this->baseUrl}/api/projects/{$projectId}");
        if ($response->status() === 404) return false;
        $this->throwIfFailed($response, "Failed to delete project {$projectId}");
        return true;
    }

    protected function throwIfFailed(Response $response, string $message): void
    {
        if ($response->failed()) {
            $body = $response->body();
            $summary = mb_substr($body, 0, 500);
            throw new \RuntimeException("{$message}: {$response->status()} - {$summary}");
        }
    }
}
