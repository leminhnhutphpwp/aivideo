<?php
namespace App\Console\Commands;

use App\Models\Asset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class SyncAssetsToS3 extends Command
{
    protected $signature = 'assets:sync-s3
        {--target=s3-external : Disk đích (VD: s3-external cho AWS S3)}
        {--source=s3 : Disk nguồn (VD: s3 chỉ MinIO, local chỉ ổ đĩa)}
        {--force : Upload lại dù đã có trên đích}
        {--cleanup : Xoá file nguồn sau khi sync thành công}';

    protected $description = 'Đồng bộ assets từ disk nguồn sang disk đích (MinIO → AWS S3)';

    public function handle(): int
    {
        $sourceDisk = $this->option('source');
        $targetDisk = $this->option('target');

        if (!config("filesystems.disks.{$targetDisk}.key") || !config("filesystems.disks.{$targetDisk}.secret")) {
            $this->warn("Disk [{$targetDisk}] chưa được cấu hình.");
            $this->warn('Cần set S3_EXTERNAL_ACCESS_KEY_ID, S3_EXTERNAL_SECRET_ACCESS_KEY, S3_EXTERNAL_BUCKET trong .env');
            return Command::SUCCESS;
        }

        $this->info("Đồng bộ từ [{$sourceDisk}] → [{$targetDisk}]");

        $count = 0;
        $errors = 0;

        Asset::chunk(50, function ($assets) use ($sourceDisk, $targetDisk, &$count, &$errors) {
            foreach ($assets as $asset) {
                if (!$asset->path) continue;

                $source = Storage::disk($sourceDisk);
                $target = Storage::disk($targetDisk);

                if (!$source->exists($asset->path)) {
                    $errors++;
                    $this->warn("  [{$asset->uuid}] Không tìm thấy trên {$sourceDisk}");
                    continue;
                }

                if (!$this->option('force') && $target->exists($asset->path)) {
                    $this->line("  [{$asset->uuid}] Đã có trên {$targetDisk}, skip");
                    continue;
                }

                try {
                    $stream = $source->readStream($asset->path);
                    $target->writeStream($asset->path, $stream);
                    fclose($stream);

                    $count++;
                    $this->line("  [{$asset->uuid}] Đã sync → {$asset->path}");
                } catch (\Exception $e) {
                    $errors++;
                    $this->error("  [{$asset->uuid}] Lỗi: {$e->getMessage()}");
                }
            }
        });

        $this->info("Hoàn tất: {$count} thành công, {$errors} lỗi.");
        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
