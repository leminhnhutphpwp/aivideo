<?php
namespace App\Http\Controllers\API;

use App\Models\Asset;
use App\Services\AssetService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssetController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected AssetService $assetService,
    ) {
        $this->middleware('auth:api');
    }

    public function index(Request $request): JsonResponse
    {
        return $this->cleanPaginateResponse(
            $request,
            $request->user()->assets()->where('type', '!=', 'thumbnail')->with('renderJob')->orderBy('created_at', 'desc')
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $plan = $user->plan;

        // Free plan users cannot upload — their assets come from AI generation only
        if (!$plan || $plan->isFree()) {
            return response()->json([
                'success' => false,
                'message' => 'Gói Free không hỗ trợ tải tài nguyên lên. Vui lòng nâng cấp lên Pro.',
            ], 403);
        }

        // Check asset count limit (user-uploaded assets only, not AI-generated)
        // AI-generated assets have render_job_id set; user uploads have render_job_id = null
        $maxCount = config('assets.max_count_per_user', 100);
        $currentCount = $user->assets()->whereNull('render_job_id')->count();
        if ($currentCount >= $maxCount) {
            return response()->json([
                'success' => false,
                'message' => "Đã đạt giới hạn {$maxCount} tài nguyên tải lên. Vui lòng xoá bớt trước khi tải lên.",
            ], 403);
        }

        // Check total storage limit (user-uploaded only)
        $maxTotalBytes = config('assets.max_total_size_mb', 500) * 1024 * 1024;
        $currentTotalBytes = (int) $user->assets()->whereNull('render_job_id')->sum('size_bytes');
        if ($currentTotalBytes >= $maxTotalBytes) {
            $maxMb = config('assets.max_total_size_mb', 500);
            return response()->json([
                'success' => false,
                'message' => "Đã đạt giới hạn {$maxMb}MB dung lượng tải lên. Vui lòng xoá bớt trước khi tải lên.",
            ], 403);
        }

        $maxFileSize = config('assets.max_file_size_kb', 20480);
        $request->validate([
            'file' => "required|file|mimes:jpeg,png,gif,webp,mp4,webm,mov,avi,mkv,mp3,wav,ogg,pdf,doc,docx,txt|max:{$maxFileSize}",
        ]);

        $asset = $this->assetService->storeUpload(
            $user,
            $request->file('file')
        );

        return response()->json([
            'success' => true,
            'data' => $asset,
        ], 201);
    }

    public function show(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);
        return response()->json([
            'success' => true,
            'data' => $asset,
        ]);
    }

    protected function streamFromDisk(Asset $asset, string $disk): StreamedResponse|null
    {
        if (empty(config("filesystems.disks.{$disk}.key"))) return null;

        $storage = Storage::disk($disk);

        try {
            $stream = $storage->readStream($asset->path);
        } catch (\Exception) {
            return null;
        }
        if ($stream === false || $stream === null) return null;

        $mime = $asset->mime_type ?? 'application/octet-stream';
        $filename = $asset->original_name ?? $asset->uuid;

        // Use the real object size — size_bytes may be 0 when the daemon omitted it
        // (AssetService::storeFromS3Key defaults to 0), which would truncate the download.
        $size = null;
        try {
            $size = $storage->size($asset->path);
        } catch (\Exception) {
            $size = $asset->size_bytes ?: null;
        }

        // Sanitize the filename so a `"` in original_name cannot break the header.
        $headers = [
            'Content-Type' => $mime,
            'Content-Disposition' => HeaderUtils::makeDisposition(
                HeaderUtils::DISPOSITION_INLINE,
                $filename,
                'file',
            ),
            'X-Asset-UUID' => $asset->uuid,
            'Cache-Control' => 'private, max-age=3600',
        ];
        // Only advertise a length we actually know; range requests are not supported,
        // so we deliberately do NOT send Accept-Ranges.
        if ($size !== null) {
            $headers['Content-Length'] = $size;
        }

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
            fclose($stream);
        }, 200, $headers);
    }

    public function download(Asset $asset, Request $request): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        $this->authorize('view', $asset);

        if ($asset->isExpired()) {
            return response()->json(['error' => 'Download link has expired'], 410);
        }

        // 1. Thử local trước
        $localPath = storage_path("app/{$asset->path}");
        if (file_exists($localPath)) {
            // Only count a download once the file is actually resolved (a 404 must not inflate the counter).
            $asset->increment('download_count');
            return response()->file($localPath, [
                'X-Asset-UUID' => $asset->uuid,
                'Cache-Control' => 'no-cache',
            ]);
        }

        // 2. Xác định thứ tự ưu tiên disk
        $disks = match ($asset->storage_location) {
            'r2' => ['s3-external', 's3'],
            'both' => ['s3', 's3-external'],
            default => ['s3', 's3-external'],
        };

        foreach ($disks as $disk) {
            $response = $this->streamFromDisk($asset, $disk);
            if ($response !== null) {
                $asset->increment('download_count');
                return $response;
            }
        }

        return response()->json(['error' => 'File not found'], 404);
    }

    public function play(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        try {
            $url = $asset->signedUrl(60);
            return response()->json([
                'success' => true,
                'data' => [
                    'url' => $url,
                    'expires_in' => 3600,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'File not found'], 404);
        }
    }

    public function destroy(Asset $asset): JsonResponse
    {
        $this->authorize('delete', $asset);

        $this->purgeAsset($asset);

        // Also reclaim the sibling derived preview/thumbnail (separate row + file) for the
        // same render job, otherwise it is orphaned in storage after the original is deleted.
        if ($asset->render_job_id && !in_array($asset->type, ['thumbnail', 'preview'], true)) {
            $siblings = Asset::where('render_job_id', $asset->render_job_id)
                ->whereIn('type', ['thumbnail', 'preview'])
                ->where('id', '!=', $asset->id)
                ->get();

            foreach ($siblings as $sibling) {
                $this->purgeAsset($sibling);
            }
        }

        return response()->json(null, 204);
    }

    /**
     * Delete an asset's underlying files (all storage disks + local copy) and soft-delete the row.
     */
    protected function purgeAsset(Asset $asset): void
    {
        foreach (['s3', 's3-external'] as $disk) {
            if (!empty(config("filesystems.disks.{$disk}.key"))) {
                try {
                    Storage::disk($disk)->delete($asset->path);
                } catch (\Exception) {}
            }
        }

        $localPath = storage_path("app/{$asset->path}");
        if (file_exists($localPath)) {
            @unlink($localPath);
        }

        $asset->delete();
    }
}
