<?php
namespace App\Http\Resources;

use App\Support\ErrorSanitizer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RenderJobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'status' => $this->status,
            'prompt' => $this->prompt,
            'title' => $this->title,
            'duration_seconds' => $this->duration_seconds,
            'aspect_ratio' => $this->aspect_ratio,
            'resolution' => $this->resolution,
            'output_path' => $this->output_path,
            'error_message' => ErrorSanitizer::publicMessage($this->error_message),
            'error_metadata' => ErrorSanitizer::publicMetadata($this->error_metadata),
            'attempts' => $this->attempts,
            'max_attempts' => $this->max_attempts,
            'progress' => [
                'percentage' => $this->getProgressPercentage(),
                'last_message' => $this->parameters['last_progress'] ?? null,
                'message_count' => $this->parameters['progress_count'] ?? 0,
            ],
            'timeout' => [
                'provider_timeout_minutes' => $this->getProviderTimeout(),
                'estimated_completion' => $this->getEstimatedCompletionTime()?->toIso8601String(),
                'is_timed_out' => $this->isTimedOut(),
            ],
            'assets' => $this->whenLoaded('assets', function () {
                return AssetResource::collection($this->assets);
            }, []),
            'created_at' => $this->created_at?->toIso8601String(),
            'queued_at' => $this->queued_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'failed_at' => $this->failed_at?->toIso8601String(),
        ];
    }
}
