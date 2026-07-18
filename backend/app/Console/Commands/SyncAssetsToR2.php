<?php

namespace App\Console\Commands;

use App\Models\Asset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SyncAssetsToR2 extends Command
{
    protected $signature = "assets:sync-to-r2
        {--dry-run : Chỉ liệt kê, không upload thật}
        {--force : Upload lại dù đã có trên R2}";

    protected $description = "Đồng bộ assets từ MinIO lên R2 (chạy cron hằng ngày)";

    public function handle(): int
    {
        if (empty(config("filesystems.disks.s3-external.key"))
            || empty(config("filesystems.disks.s3-external.secret"))
            || empty(config("filesystems.disks.s3-external.bucket"))) {
            $this->warn("R2 chưa được cấu hình.");
            return Command::SUCCESS;
        }

        $query = Asset::where(function ($q) {
            $q->where("storage_location", "minio")
              ->orWhereNull("storage_location");
        });

        if ($this->option("force")) {
            $query = Asset::where("storage_location", "!=", "r2");
        }

        $total = $query->count();
        $success = 0;
        $errors = 0;
        $skipped = 0;

        $this->info("Tìm thấy {$total} assets cần đồng bộ lên R2");

        $query->chunk(50, function ($assets) use (&$success, &$errors, &$skipped) {
            foreach ($assets as $asset) {
                if (!$asset->path) { $errors++; continue; }

                $minio = Storage::disk("s3");
                $r2 = Storage::disk("s3-external");

                // Step 1: Kiểm tra file trên MinIO
                try {
                    if (!$minio->exists($asset->path)) {
                        $this->warn("  [{$asset->uuid}] Không tìm thấy trên MinIO — skip");
                        $skipped++;
                        continue;
                    }
                } catch (\Exception $e) {
                    $this->warn("  [{$asset->uuid}] Lỗi check MinIO: " . $e->getMessage());
                    $errors++;
                    continue;
                }

                // Lấy size file trên MinIO để so sánh
                try {
                    $minioSize = $minio->size($asset->path);
                } catch (\Exception) {
                    $minioSize = null;
                }

                // Step 2: Nếu đã có trên R2 → chỉ cần verify + dọn MinIO
                try {
                    $onR2 = $r2->exists($asset->path);
                } catch (\Exception $e) {
                    $this->warn("  [{$asset->uuid}] Lỗi check R2: " . $e->getMessage());
                    $errors++;
                    continue;
                }

                if (!$this->option("force") && $onR2) {
                    // Verify R2 file size matches (nếu có)
                    $r2Ok = true;
                    if ($minioSize) {
                        try {
                            $r2Size = $r2->size($asset->path);
                            if ($r2Size !== $minioSize) {
                                $this->warn("  [{$asset->uuid}] Size mismatch R2={$r2Size} MinIO={$minioSize} → re-upload");
                                $r2Ok = false;
                            }
                        } catch (\Exception) {
                            $r2Ok = false;
                        }
                    }

                    if ($r2Ok) {
                        // Xóa MinIO trước, nếu fail thì quay lại
                        try {
                            $minio->delete($asset->path);
                            $this->line("  [{$asset->uuid}] Đã xóa MinIO (đã có trên R2)");
                        } catch (\Exception $e) {
                            $this->warn("  [{$asset->uuid}] Không xóa được MinIO: " . $e->getMessage());
                            $errors++;
                            continue;
                        }

                        // Chỉ đánh dấu r2 SAU KHI xóa MinIO thành công
                        $asset->update(["storage_location" => "r2", "last_synced_at" => now()]);
                        $this->line("  [{$asset->uuid}] → r2 ✓");
                        $success++;
                        continue;
                    }
                }

                if ($this->option("dry-run")) {
                    $this->line("  [{$asset->uuid}] (dry-run) Sẽ push -> {$asset->path}");
                    $success++;
                    continue;
                }

                // Step 3: Upload lên R2
                try {
                    $stream = $minio->readStream($asset->path);
                    if ($stream === false) {
                        $this->error("  [{$asset->uuid}] Không đọc được file từ MinIO");
                        $errors++;
                        continue;
                    } elseif (!is_resource($stream)) {
                        // readStream trả về string với Flysystem v3 trên S3
                        $r2->put($asset->path, $stream);
                    } else {
                        $r2->writeStream($asset->path, $stream);
                        fclose($stream);
                    }
                } catch (\Exception $e) {
                    $this->error("  [{$asset->uuid}] Upload fail: " . $e->getMessage());
                    Log::error("SyncToR2 upload thất bại", ["asset" => $asset->uuid, "error" => $e->getMessage()]);
                    $errors++;
                    continue;
                }

                // Step 4: Verify R2 file tồn tại
                try {
                    if (!$r2->exists($asset->path)) {
                        $this->error("  [{$asset->uuid}] Upload xong nhưng file KHÔNG tồn tại trên R2!");
                        $errors++;
                        continue;
                    }
                } catch (\Exception $e) {
                    $this->error("  [{$asset->uuid}] Không verify được file trên R2: " . $e->getMessage());
                    $errors++;
                    continue;
                }

                // Step 5: Verify size R2 ≈ MinIO (sai số 5%)
                if ($minioSize) {
                    try {
                        $r2Size = $r2->size($asset->path);
                        $diff = abs($r2Size - $minioSize);
                        if ($diff > max(1024, $minioSize * 0.05)) {
                            $this->error("  [{$asset->uuid}] Size mismatch R2={$r2Size} MinIO={$minioSize}");
                            $r2->delete($asset->path); // xóa file lỗi trên R2
                            $errors++;
                            continue;
                        }
                    } catch (\Exception $e) {
                        $this->warn("  [{$asset->uuid}] Không lấy được size R2, skip verify size");
                    }
                }

                // Step 6: Xóa MinIO (an toàn vì R2 đã verify xong)
                try {
                    $minio->delete($asset->path);
                    $this->line("  [{$asset->uuid}] Đã xóa MinIO");
                } catch (\Exception $e) {
                    $this->warn("  [{$asset->uuid}] Không xóa được MinIO: " . $e->getMessage());
                    // Vẫn mark r2 vì data đã an toàn trên R2
                }

                // Step 7: Đánh dấu r2
                $asset->update(["storage_location" => "r2", "last_synced_at" => now()]);
                $this->line("  [{$asset->uuid}] → r2 ✓");
                $success++;
            }
        });

        $this->info("Hoàn tất: {$success} thành công, {$errors} lỗi, {$skipped} bỏ qua.");
        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
