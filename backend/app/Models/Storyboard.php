<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Support\ErrorSanitizer;

class Storyboard extends Model
{
    use SoftDeletes;
    // Raw error_message can carry provider/model details — never expose it; the
    // frontend reads the sanitized `public_error` accessor instead.
    protected $hidden = ['id', 'user_id', 'error_message'];

    protected $fillable = [
        'uuid', 'user_id', 'title', 'description', 'style_guide',
        'voice_mood', 'background_music', 'voice',
        'video_type', 'quality_tier', 'status', 'render_mode',
        'total_duration', 'compiled_prompt', 'credits_cost', 'analysis_result',
        'consistency_score', 'render_attempts', 'output_path', 'error_message',
        'camera_movement', 'style', 'mood', 'lighting', 'narration', 'driving_audio',
        'first_frame_image', 'last_frame_image',
        'shot_type', 'multi_panel_image', 'multi_panel_auto_generated',
        'progress_message', 'daemon_project_id', 'daemon_task_id',
        'last_rendered_at',
    ];

    protected $casts = [
        'style_guide' => 'array',
        'analysis_result' => 'array',
        'consistency_score' => 'decimal:2',
        'credits_cost' => 'integer',
        'render_attempts' => 'integer',
        'render_mode' => 'string',
        'compiled_prompt' => 'string',
        'last_rendered_at' => 'datetime',
        'multi_panel_auto_generated' => 'boolean',
    ];

    protected $appends = ['scene_count', 'max_render_attempts', 'retries_remaining', 'public_error'];

    /** User-safe failure reason (provider/model details stripped); null when not failed. */
    public function getPublicErrorAttribute(): ?string
    {
        if ($this->status !== 'failed' || empty($this->error_message)) {
            return null;
        }
        return ErrorSanitizer::publicMessage($this->error_message);
    }

    /** Cap on total render attempts (initial + retries) per storyboard. */
    public function getMaxRenderAttemptsAttribute(): int
    {
        return (int) config('storyboard.max_render_attempts', 5);
    }

    /** How many retries are still allowed before the cap is hit (never negative). */
    public function getRetriesRemainingAttribute(): int
    {
        return max(0, $this->max_render_attempts - (int) $this->render_attempts);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * Hide the system-generated multi-panel image path from API responses. The image is
     * an internal render artifact (created when the user provided none) — the frontend must
     * not display or expose it. This affects SERIALIZATION only; direct attribute access
     * ($storyboard->multi_panel_image) still returns the real path for the renderer.
     */
    public function toArray()
    {
        $data = parent::toArray();
        if (! empty($data['multi_panel_auto_generated'])) {
            $data['multi_panel_image'] = null;
        }
        return $data;
    }

    protected static function booted(): void
    {
        static::creating(function ($storyboard) {
            $storyboard->uuid ??= (string) Str::uuid();
        });

        static::deleting(function ($storyboard) {
            if ($storyboard->daemon_project_id && !$storyboard->isForceDeleting()) {
                try {
                    app(\App\Services\DaemonClient::class)->deleteProject($storyboard->daemon_project_id);
                } catch (\Throwable $e) {
                    // Non-critical — daemon project may already be deleted
                }
            }

            if (!$storyboard->isForceDeleting()) {
                $storyboard->scenes()->delete();
                $storyboard->references()->delete();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function scenes(): HasMany
    {
        return $this->hasMany(StoryboardScene::class)->orderBy('scene_number');
    }

    public function references(): HasMany
    {
        return $this->hasMany(StoryboardReference::class)->orderBy('sort_order');
    }

    public function getSceneCountAttribute(): int
    {
        return $this->scenes()->count();
    }

    public function scopeForUser($query, User $user)
    {
        return $query->where('user_id', $user->id);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['completed', 'failed', 'cancelled']);
    }

    public function calculateCreditsCost(): int
    {
        $videoTypeCode = VideoType::where('code', $this->video_type)->exists()
            ? $this->video_type
            : 'storyboard_video';

        $qualityCode = $this->quality_tier;
        $scenes = $this->scenes()->get();

        if ($this->render_mode === 'single_flow' || $this->render_mode === 'storyboard_image') {
            $durationSeconds = $this->total_duration ?? $scenes->sum('duration_seconds');
            $durationCode = $this->closestDurationCode($durationSeconds);

            $result = \App\Services\Pricing\PricingCalculator::calculate([
                'video_type' => $videoTypeCode,
                'duration' => $durationCode,
                'resolution' => '720p',
                'quality' => $qualityCode,
                'quantity' => 1,
            ]);

            return (int) $result['pricing']['total_credits'];
        }

        // Multi-scene: calculate each scene separately
        $total = 0;
        foreach ($scenes as $scene) {
            $durationCode = $this->closestDurationCode($scene->duration_seconds);

            $result = \App\Services\Pricing\PricingCalculator::calculate([
                'video_type' => $videoTypeCode,
                'duration' => $durationCode,
                'resolution' => '720p',
                'quality' => $qualityCode,
                'quantity' => 1,
            ]);

            $total += (int) $result['pricing']['total_credits'];
        }

        return $total;
    }

    private function closestDurationCode(int $seconds): string
    {
        $tiers = \App\Models\DurationTier::active()->orderBy('seconds')->get();
        if ($tiers->isEmpty()) {
            return '5s'; // fallback
        }

        $closest = $tiers->first();
        $minDiff = PHP_INT_MAX;
        foreach ($tiers as $tier) {
            $diff = abs($seconds - $tier->seconds);
            if ($diff < $minDiff) {
                $minDiff = $diff;
                $closest = $tier;
            }
        }
        return $closest->code;
    }

    public function updateCreditsCost(): void
    {
        $this->update(['credits_cost' => $this->calculateCreditsCost()]);
    }

    public function markAsAnalyzing(): void
    {
        $this->update(['status' => 'analyzing']);
    }

    public function markAsAnalyzed(array $analysisResult): void
    {
        $this->update([
            'status' => 'analyzed',
            'analysis_result' => $analysisResult,
            'consistency_score' => $analysisResult['consistency_report']['average_consistency'] ?? null,
        ]);
    }

    public function markAsRendering(): void
    {
        $this->update(['status' => 'rendering']);
    }

    public function markAsCompleted(string $outputPath): void
    {
        $this->update([
            'status' => 'completed',
            'output_path' => $outputPath,
        ]);
    }

    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
        ]);
    }

    public function isRenderable(): bool
    {
        return in_array($this->status, ['draft', 'analyzed', 'failed']);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed', 'failed', 'cancelled']);
    }

}
