<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class Asset extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'uuid', 'user_id', 'render_job_id', 'storyboard_id', 'type', 'mime_type',
        'path', 'original_name', 'size_bytes', 'metadata',
        'is_public', 'expires_at', 'download_count',
        'storage_location', 'external_url', 'last_synced_at',
    ];

    protected $hidden = ['id', 'user_id', 'render_job_id', 'path'];

    protected $appends = ['url'];

    protected $casts = [
        'metadata' => 'array',
        'is_public' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected static function booted(): void
    {
        static::creating(function ($asset) {
            $asset->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function storyboard(): BelongsTo
    {
        return $this->belongsTo(Storyboard::class);
    }

    public function signedUrl(int $expiryMinutes = 60): string
    {
        $localPath = storage_path("app/{$this->path}");
        if (file_exists($localPath)) {
            return route('api.assets.download', ['asset' => $this->uuid]);
        }

        $disks = match ($this->storage_location) {
            'r2' => ['s3-external', 's3'],
            'both' => ['s3', 's3-external'],
            default => ['s3', 's3-external'],
        };

        foreach ($disks as $disk) {
            if (empty(config("filesystems.disks.{$disk}.key"))) continue;
            try {
                return Storage::disk($disk)->temporaryUrl($this->path, now()->addMinutes($expiryMinutes));
            } catch (\Exception) {}
        }

        return route('api.assets.download', ['asset' => $this->uuid]);
    }

    public function isExpired(): bool
    {
        // Prefer the explicit expiry set at creation (365d for AI assets — see AssetService).
        // Only fall back to the 30-day rule when no expires_at was ever recorded, so a valid
        // future expires_at is never overridden. Agrees with CleanupExpiredAssets (keys off expires_at).
        if ($this->expires_at) {
            return $this->expires_at->isPast();
        }

        // Legacy fallback for rows created without an expires_at: expire non-permanent assets after 30 days.
        return !$this->is_public && $this->created_at->diffInDays(now()) > 30;
    }

    public function getUrlAttribute(): string
    {
        // Never expose raw file path - always use API endpoint
        return "/api/assets/{$this->uuid}/download";
    }
}
