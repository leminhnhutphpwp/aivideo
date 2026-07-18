<?php

namespace App\Console\Commands;

use App\Models\RenderJob;
use App\Services\DaemonClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupOrphanDaemonProjects extends Command
{
    protected $signature = 'daemon:cleanup-orphans
        {--dry-run : Chỉ liệt kê, không xóa thật}
        {--min-age=1 : Số ngày tối thiểu project phải tồn tại (default: 1 ngày)}';

    protected $description = 'Xóa daemon projects không còn liên kết với RenderJob nào';

    public function handle(DaemonClient $daemon): int
    {
        $minAgeDays = (int) $this->option('min-age');
        $dryRun = $this->option('dry-run');

        try {
            $projects = $daemon->listProjects();
            $projects = $projects['projects'] ?? $projects;
        } catch (\Exception $e) {
            $this->error('Không thể lấy danh sách projects từ daemon: ' . $e->getMessage());
            return Command::FAILURE;
        }

        if (empty($projects)) {
            $this->info('Không có project nào trên daemon.');
            return Command::SUCCESS;
        }

        $minAge = now()->subDays($minAgeDays);
        $deleted = 0;
        $skipped = 0;

        foreach ($projects as $project) {
            $projectId = $project['id'] ?? null;
            $projectName = $project['name'] ?? 'unknown';
            $createdAt = isset($project['createdAt']) ? \Carbon\Carbon::createFromTimestampMs($project['createdAt']) : null;

            if (!$projectId) {
                $skipped++;
                continue;
            }

            // Bỏ qua project quá mới
            if ($createdAt && $createdAt->gt($minAge)) {
                $skipped++;
                continue;
            }

            // Kiểm tra xem có RenderJob nào link tới daemon project này không
            $hasJob = RenderJob::withTrashed()->where('daemon_project_id', $projectId)->exists();
            if ($hasJob) {
                $skipped++;
                continue;
            }

            $this->line("  <fg=red>✗</> {$projectId}: {$projectName}" . ($createdAt ? " (" . $createdAt->diffForHumans() . ")" : ''));

            if (!$dryRun) {
                try {
                    $daemon->deleteProject($projectId);
                    $deleted++;
                } catch (\Exception $e) {
                    $this->warn("  Lỗi xóa {$projectId}: " . $e->getMessage());
                }
            } else {
                $deleted++;
            }
        }

        $action = $dryRun ? 'Sẽ xóa (dry-run)' : 'Đã xóa';
        $this->info("Hoàn tất: {$deleted} {$action}, {$skipped} bỏ qua.");
        return Command::SUCCESS;
    }
}
