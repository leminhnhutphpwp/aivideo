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
        if ($this->expires_at && $this->expires_at->isPast()) {
            return true;
        }
        // Auto-expire after 30 days for non-permanent assets
        if (!$this->is_public && $this->created_at->diffInDays(now()) > 30) {
            return true;
        }
        return false;
    }

    public function getUrlAttribute(): string
    {
        // Never expose raw file path - always use API endpoint
        return "/api/assets/{$this->uuid}/download";
    }
}
