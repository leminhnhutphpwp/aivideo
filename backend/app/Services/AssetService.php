<?php
namespace App\Services;

use App\Models\Asset;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Str;

class AssetService
{
    protected $storage;

    public function __construct()
    {
        $this->storage = Storage::disk(config('filesystems.default'));
    }

    protected static function typeFolder(string $type): string
    {
        return match ($type) {
            'video' => 'videos',
            'image' => 'images',
            'audio' => 'audio',
            'thumbnail', 'preview' => 'thumbnails',
            'model' => 'models',
            default => 'documents',
        };
    }

    public function store(User $user, RenderJob $job, string $type, UploadedFile $file): Asset
    {
        $hash = md5_file($file->path());
        $extension = $file->extension();
        $folder = static::typeFolder($type);
        $path = "{$folder}/{$job->uuid}_{$hash}.{$extension}";

        $this->storage->put($path, fopen($file->path(), 'r'));

        $expireDays = (int) config('assets.ai_generated_expire_days', 365);
        $expiresAt = $expireDays > 0 ? now()->addDays($expireDays) : null;

        return Asset::create([
            'user_id' => $user->id,
            'render_job_id' => $job->id,
            'type' => $type,
            'mime_type' => $file->getMimeType(),
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'size_bytes' => $file->getSize(),
            'expires_at' => $expiresAt,
        ]);
    }

    public function storeFromPath(User $user, ?RenderJob $job, string $type, string $sourcePath, ?Storyboard $storyboard = null): Asset
    {
        $hash = md5_file($sourcePath);
        $mime = mime_content_type($sourcePath);
        $extension = pathinfo($sourcePath, PATHINFO_EXTENSION);
        if (!$extension) {
            $extension = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'image/gif' => 'gif',
                'audio/mpeg' => 'mp3',
                'audio/wav' => 'wav',
                default => 'mp4',
            };
        }
        $identifier = $job ? substr($job->uuid, 0, 8) : ($storyboard ? substr($storyboard->uuid, 0, 8) : $hash);
        $timestamp = now()->format('Ymd_His');
        $folder = static::typeFolder($type);
        $path = "{$folder}/{$identifier}_{$timestamp}.{$extension}";

        $this->storage->put($path, fopen($sourcePath, 'r'));

        $expireDays = (int) config('assets.ai_generated_expire_days', 365);
        $expiresAt = $expireDays > 0 ? now()->addDays($expireDays) : null;

        return Asset::create([
            'user_id' => $user->id,
            'render_job_id' => $job?->id,
            'storyboard_id' => $storyboard?->id,
            'type' => $type,
            'mime_type' => $mime,
            'path' => $path,
            'original_name' => "{$identifier}_{$timestamp}.{$extension}",
            'size_bytes' => filesize($sourcePath),
            'expires_at' => $expiresAt,
        ]);
    }

    public function storeFromS3Key(User $user, RenderJob $job, string $type, array $fileData): Asset
    {
        $s3Key = $fileData['s3Key'] ?? $fileData['s3_key'] ?? '';
        $fileName = $fileData['name'] ?? basename($s3Key);
        $sizeBytes = $fileData['size'] ?? 0;
        $mime = $fileData['mime'] ?? 'application/octet-stream';

        $path = $s3Key;

        return Asset::create([
            'user_id' => $user->id,
            'render_job_id' => $job->id,
            'type' => $type,
            'mime_type' => $mime,
            'path' => $path,
            'original_name' => $fileName,
            'size_bytes' => $sizeBytes,
        ]);
    }

    public function storeUpload(User $user, UploadedFile $file): Asset
    {
        $type = $this->determineType($file->getMimeType());
        $uuid = (string) Str::uuid();
        $extension = $file->extension();
        $folder = static::typeFolder($type);
        $path = "{$folder}/{$uuid}.{$extension}";

        $this->storage->put($path, fopen($file->path(), 'r'));

        return Asset::create([
            'user_id' => $user->id,
            'type' => $type,
            'mime_type' => $file->getMimeType(),
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'size_bytes' => $file->getSize(),
        ]);
    }

    protected function determineType(string $mimeType): string
    {
        return match (true) {
            str_starts_with($mimeType, 'image/') => 'image',
            str_starts_with($mimeType, 'video/') => 'video',
            str_starts_with($mimeType, 'audio/') => 'audio',
            str_starts_with($mimeType, 'model/') => 'model',
            default => 'document',
        };
    }
}
