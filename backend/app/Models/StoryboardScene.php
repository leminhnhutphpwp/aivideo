<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StoryboardScene extends Model
{
    use SoftDeletes;
    protected $hidden = ['storyboard_id', 'render_job_id'];

    protected $fillable = [
        'storyboard_id', 'scene_number', 'parent_scene_id', 'edge_label',
        'position_x', 'position_y',
        'prompt', 'enriched_prompt',
        'duration_seconds', 'camera_movement', 'lighting',
        'style', 'mood', 'negative_prompt', 'reference_image', 'last_frame_image', 'narration',
        'aspect_ratio', 'resolution', 'seed', 'status', 'render_job_id',
        'output_path', 'thumbnail_path', 'consistency_score',
        'error_message',
    ];

    protected $casts = [
        'consistency_score' => 'decimal:2',
        'duration_seconds' => 'integer',
        'scene_number' => 'integer',
        'seed' => 'integer',
        'position_x' => 'float',
        'position_y' => 'float',
    ];

    public function storyboard(): BelongsTo
    {
        return $this->belongsTo(Storyboard::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(StoryboardScene::class, 'parent_scene_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(StoryboardScene::class, 'parent_scene_id');
    }

    public function isDescendantOf(int $sceneId): bool
    {
        $current = $this->parent;
        while ($current) {
            if ($current->id === $sceneId) return true;
            $current = $current->parent;
        }
        return false;
    }

    public function getAncestorIds(): array
    {
        $ids = [];
        $current = $this->parent;
        while ($current) {
            $ids[] = $current->id;
            $current = $current->parent;
        }
        return $ids;
    }

    public static function wouldCreateCycle(int $storyboardId, int $childSceneId, int $parentSceneId): bool
    {
        if ($childSceneId === $parentSceneId) return true;
        $current = static::find($parentSceneId);
        while ($current) {
            if ($current->id === $childSceneId) return true;
            $current = $current->parent;
        }
        return false;
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeRoot($query)
    {
        return $query->whereNull('parent_scene_id');
    }

    public function markAsQueued(): void
    {
        $this->update(['status' => 'queued']);
    }

    public function markAsRendering(): void
    {
        $this->update(['status' => 'rendering']);
    }

    public function markAsCompleted(string $outputPath, ?string $thumbnailPath = null): void
    {
        $this->update([
            'status' => 'completed',
            'output_path' => $outputPath,
            'thumbnail_path' => $thumbnailPath,
        ]);
    }

    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
        ]);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed', 'failed', 'cancelled']);
    }
}
