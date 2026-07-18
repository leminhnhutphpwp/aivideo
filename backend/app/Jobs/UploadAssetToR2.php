<?php

namespace App\Jobs;

use App\Models\Asset;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UploadAssetToR2 implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Asset $asset
    ) {}

    public function handle(): void
    {
        $r2 = config("filesystems.disks.s3-external");

        if (empty($r2["key"]) || empty($r2["secret"]) || empty($r2["bucket"])) {
            Log::info("R2 chưa cấu hình, bỏ qua upload", ["asset" => $this->asset->uuid]);
            return;
        }

        if ($this->asset->storage_location === "both" || $this->asset->storage_location === "r2") {
            return;
        }

        $source = Storage::disk("s3");
        if (!$source->exists($this->asset->path)) {
            Log::warning("File không tồn tại trên MinIO", ["asset" => $this->asset->uuid]);
            return;
        }

        try {
            $stream = $source->readStream($this->asset->path);
            Storage::disk("s3-external")->writeStream($this->asset->path, $stream);
            if (is_resource($stream)) fclose($stream);

            $this->asset->update([
                "storage_location" => "both",
                "last_synced_at" => now(),
            ]);

            Log::info("Đã push asset lên R2 (giữ lại trên MinIO)", [
                "asset" => $this->asset->uuid,
                "path" => $this->asset->path,
            ]);
        } catch (\Exception $e) {
            Log::error("Push asset lên R2 thất bại", [
                "asset" => $this->asset->uuid,
                "error" => $e->getMessage(),
            ]);
        }
    }
}
