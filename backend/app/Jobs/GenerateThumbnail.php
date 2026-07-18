<?php
namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\AssetService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

/**
 * Generates a lightweight preview/thumbnail derivative for a completed render job.
 *
 *  - Video jobs → extract a single JPEG frame (poster) for the feed.
 *  - Image jobs → produce a web-optimized WebP (downscaled, quality ~80) so the
 *    community feed / preview grid does not have to serve the raw 6-9MB PNG.
 *    The original image asset is preserved untouched for download.
 *
 * In both cases the derivative is stored as a `thumbnail` asset (hidden from the
 * asset library) and `render_job.thumbnail_path` is set so CommunityController /
 * the frontend card serve the small file instead of the full-size original.
 */
class GenerateThumbnail implements ShouldQueue
{
    use Queueable;

    public function __construct(public RenderJob $renderJob) {}

    public function handle(): void
    {
        if ($this->renderJob->assets()->where('type', 'image')->exists()) {
            $this->handleImage();
            return;
        }

        $this->handleVideo();
    }

    /**
     * Build a compressed WebP preview for an image render job.
     */
    protected function handleImage(): void
    {
        $imageAsset = $this->renderJob->assets()->where('type', 'image')->first();
        if (!$imageAsset) {
            return;
        }

        $tempSrc = tempnam(sys_get_temp_dir(), 'img_src_');

        if (!$this->downloadToTemp($imageAsset->path, $tempSrc, 'image')) {
            @unlink($tempSrc);
            return;
        }

        $maxDim = (int) config('assets.image_preview.max_dimension', 1280);
        $quality = (int) config('assets.image_preview.quality', 80);
        $outputPath = storage_path("app/previews/{$this->renderJob->uuid}.webp");
        @mkdir(dirname($outputPath), 0755, true);

        // Downscale-only fit within maxDim x maxDim (preserves aspect ratio, never upscales).
        $scale = "scale='min({$maxDim},iw)':'min({$maxDim},ih)':force_original_aspect_ratio=decrease";

        $process = new Process([
            'ffmpeg', '-i', $tempSrc,
            '-vf', $scale,
            '-c:v', 'libwebp', '-quality', (string) $quality, '-compression_level', '6',
            $outputPath, '-y',
        ]);
        $process->run();

        @unlink($tempSrc);

        if (!$process->isSuccessful() || !file_exists($outputPath)) {
            Log::warning('GenerateThumbnail: ffmpeg webp encode failed', [
                'job_uuid' => $this->renderJob->uuid,
                'output' => $process->getErrorOutput(),
            ]);
            @unlink($outputPath);
            return;
        }

        $previewAsset = app(AssetService::class)->storeFromPath(
            user: $this->renderJob->user,
            job: $this->renderJob,
            type: 'thumbnail',
            sourcePath: $outputPath,
        );
        @unlink($outputPath);

        // Point the feed/preview at the compressed derivative; keep the original for download.
        $this->renderJob->update(['thumbnail_path' => $previewAsset->url]);

        // Mirror the derivative to R2 alongside the original.
        UploadAssetToR2::dispatch($previewAsset);
    }

    /**
     * Extract a JPEG poster frame for a video render job (original behavior).
     */
    protected function handleVideo(): void
    {
        // Find the video asset stored by HandleJobCompletion
        $videoAsset = $this->renderJob->assets()->where('type', 'video')->first();
        if (!$videoAsset) {
            Log::warning('GenerateThumbnail: no video asset found', ['job_uuid' => $this->renderJob->uuid]);
            return;
        }

        // Download video from storage to a temp file for ffmpeg processing
        $tempVideo = tempnam(sys_get_temp_dir(), 'thumb_src_');

        if (!$this->downloadToTemp($videoAsset->path, $tempVideo, 'video')) {
            @unlink($tempVideo);
            return;
        }

        $outputPath = storage_path("app/thumbnails/{$this->renderJob->uuid}.jpg");
        @mkdir(dirname($outputPath), 0755, true);

        $process = new Process([
            'ffmpeg', '-i', $tempVideo,
            '-vframes', '1', '-q:v', '2', $outputPath, '-y',
        ]);
        $process->run();

        @unlink($tempVideo);

        if ($process->isSuccessful()) {
            app(AssetService::class)->storeFromPath(
                user: $this->renderJob->user,
                job: $this->renderJob,
                type: 'thumbnail',
                sourcePath: $outputPath,
            );
            @unlink($outputPath);
        } else {
            Log::warning('GenerateThumbnail: ffmpeg failed', [
                'job_uuid' => $this->renderJob->uuid,
                'output' => $process->getErrorOutput(),
            ]);
        }
    }

    /**
     * Stream a stored file (image/video) to a local temp path chunk-by-chunk.
     *
     * Uses stream_copy_to_stream rather than stream_get_contents so the full
     * (6-9MB+) source is never buffered into RAM. Guarantees the read stream is
     * closed on every path. Returns false (and logs) on any read failure; the
     * caller owns unlinking $tempPath.
     */
    protected function downloadToTemp(string $storagePath, string $tempPath, string $kind): bool
    {
        $storage = Storage::disk(config('filesystems.default'));

        try {
            $stream = $storage->readStream($storagePath);
            if ($stream === false || $stream === null) {
                Log::warning("GenerateThumbnail: failed to read {$kind} from storage", [
                    'job_uuid' => $this->renderJob->uuid,
                    'storage_path' => $storagePath,
                ]);
                return false;
            }

            $dest = fopen($tempPath, 'wb');
            if ($dest === false) {
                fclose($stream);
                Log::warning("GenerateThumbnail: failed to open temp file for {$kind}", [
                    'job_uuid' => $this->renderJob->uuid,
                ]);
                return false;
            }

            $copied = stream_copy_to_stream($stream, $dest);
            fclose($dest);
            fclose($stream);

            return $copied !== false;
        } catch (\Throwable $e) {
            Log::error("GenerateThumbnail: failed to download {$kind}", [
                'job_uuid' => $this->renderJob->uuid,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
