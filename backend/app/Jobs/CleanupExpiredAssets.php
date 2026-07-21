<?php

namespace App\Jobs;

use App\Models\Asset;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;

class CleanupExpiredAssets implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        // Use cursor() rather than each() — each() pages by OFFSET, and deleting rows in-loop
        // shifts the offset so a chunk is skipped every page. cursor() streams a single result set.
        foreach (Asset::where('expires_at', '<', now())->cursor() as $asset) {
            // Clean up from all configured storage disks
            foreach (['s3', 's3-external'] as $disk) {
                if (!empty(config("filesystems.disks.{$disk}.key"))) {
                    try {
                        Storage::disk($disk)->delete($asset->path);
                    } catch (\Exception) {}
                }
            }

            // Clean local copy
            $localPath = storage_path("app/{$asset->path}");
            if (file_exists($localPath)) {
                @unlink($localPath);
            }

            $asset->delete();
        }
    }
}
