<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RenderJob extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'uuid', 'user_id', 'status', 'prompt', 'negative_prompt', 'model', 'capability',
        'skill_id', 'quality_tier', 'video_type',
        'duration_seconds', 'title',
        'aspect_ratio', 'resolution', 'parameters', 'reference_images',
        'attempts', 'max_attempts', 'credits_cost', 'plan_snapshot',
        'daemon_project_id', 'daemon_task_id',
        'gpu_seconds', 'output_path', 'thumbnail_path',
        'preview_path', 'output_size_bytes', 'queued_at', 'started_at',
        'completed_at', 'failed_at', 'error_message', 'error_metadata',
        'visibility', 'published_at', 'creator_payout', 'usage_count', 'tags',
    ];

    protected $hidden = ['id', 'user_id'];

    protected $casts = [
        'parameters' => 'array',
        'reference_images' => 'array',
        'plan_snapshot' => 'array',
        'error_metadata' => 'array',
        'tags' => 'array',
        'queued_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($job) {
            $job->uuid ??= (string) Str::uuid();
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

    public function likes(): HasMany
    {
        return $this->hasMany(Like::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
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
        return $query->whereNotIn('status', ['completed', 'failed', 'cancelled', 'dead']);
    }

    public function scopePublished($query)
    {
        return $query->whereIn('visibility', ['sharing', 'public'])
            ->where('status', 'completed')
            ->whereNotNull('published_at');
    }

    public function scopeVisibleTo($query, User $user)
    {
        // Show all published assets + user's own private assets
        return $query->where(function ($q) use ($user) {
            $q->published();
            $q->orWhere(function ($sq) use ($user) {
                $sq->where('user_id', $user->id);
            });
        });
    }

    public function markAsQueued(): void
    {
        $this->update(['status' => 'queued', 'queued_at' => now()]);
    }

    public function markAsProcessing(): void
    {
        $this->update(['status' => 'processing', 'started_at' => now()]);
    }

    public function markAsCompleted(string $outputPath): void
    {
        $this->update([
            'status' => 'completed',
            'output_path' => $outputPath,
            'completed_at' => now(),
        ]);
    }

    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
            'failed_at' => now(),
        ]);
    }

    public function markAsCancelled(): void
    {
        $this->update(['status' => 'cancelled']);
    }

    public function isRetryable(): bool
    {
        return in_array($this->status, ['failed', 'processing', 'queued']) 
            && $this->attempts < $this->max_attempts;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed', 'failed', 'cancelled', 'dead']);
    }

    public function isTimedOut(): bool
    {
        if ($this->isTerminal()) {
            return false;
        }

        if (!$this->started_at) {
            return false;
        }

        $elapsed = abs(now()->diffInSeconds($this->started_at));
        $timeout = $this->getProviderTimeout();

        return $elapsed > ($timeout * 60);
    }

    public function getProgressPercentage(): float
    {
        if (!$this->started_at || $this->isTerminal()) {
            return $this->status === 'completed' ? 100 : 0;
        }

        $elapsed = abs(now()->diffInSeconds($this->started_at));
        $timeout = $this->getProviderTimeout() * 60;

        return min(100, max(0, round(($elapsed / $timeout) * 100, 2)));
    }

    public function getProviderTimeout(): int
    {
        $model = strtolower($this->model ?? '');
        $provider = app(\App\Models\Plan::class)->getProviderForModel($model);

        return match($provider) {
            'qwencloud' => 12,
            default => 10,
        };
    }

    public function getEstimatedCompletionTime(): ?\Illuminate\Support\Carbon
    {
        if (!$this->started_at) {
            return null;
        }

        $timeout = $this->getProviderTimeout();
        return $this->started_at->addMinutes($timeout);
    }

    public function estimatedCreditsCost(): int
    {
        $rates = ['720p' => 10, '1080p' => 20];
        $rate = $rates[$this->resolution] ?? 10;
        return max(50, $this->duration_seconds * $rate);
    }

    public function isPublished(): bool
    {
        return in_array($this->visibility, ['sharing', 'public']) && $this->published_at !== null;
    }

    public function publish(string $visibility, array $tags = []): void
    {
        $payout = 0;
        if ($visibility === 'public') {
            $settings = app(\App\Settings\CommunitySettings::class);
            $payout = (int) floor($this->credits_cost * $settings->creator_payout_percent / 100);
        }

        $this->update([
            'visibility' => $visibility,
            'published_at' => now(),
            'creator_payout' => $payout,
            'tags' => $tags,
        ]);

        if ($payout > 0) {
            app(\App\Services\CreditService::class)->addCredits(
                $this->user,
                $payout,
                "Community creator payout for asset #{$this->uuid}"
            );
        }

        if (!empty($tags)) {
            \App\Models\Tag::upsertFromArray($tags);
        }
    }

    public function unpublish(): void
    {
        $this->update([
            'visibility' => 'private',
            'published_at' => null,
        ]);
    }
}
