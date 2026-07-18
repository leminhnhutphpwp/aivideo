<?php

namespace App\Console\Commands;

use App\Services\SkillStalenessService;
use App\Services\TelegramService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Audits the local skill docs for content that has drifted out of sync with the
 * live system (unknown model references, hardcoded pricing that no longer matches
 * CreditSetting). ADVISORY ONLY — it reports, never edits. Runs on a schedule and
 * can be invoked manually: `php artisan skills:check-staleness`.
 */
class CheckSkillStaleness extends Command
{
    protected $signature = 'skills:check-staleness {--strict : Exit non-zero when issues are found (for CI/manual runs)}';

    protected $description = 'Scan skill docs for outdated model references / pricing drift and report (no auto-fix)';

    public function handle(SkillStalenessService $staleness, TelegramService $telegram): int
    {
        try {
            $findings = $staleness->check();
        } catch (\Throwable $e) {
            // Fail-open: never crash the scheduler.
            Log::error('skills:check-staleness failed', ['error' => $e->getMessage()]);
            $this->error('Staleness check failed: '.$e->getMessage());

            return self::SUCCESS;
        }

        if ($findings === []) {
            $this->info('✅ Không phát hiện skill lỗi thời (model references + pricing đều khớp).');

            return self::SUCCESS;
        }

        $totalIssues = array_sum(array_map(fn ($f) => count($f['issues']), $findings));
        $this->warn("⚠️  Phát hiện {$totalIssues} vấn đề trong ".count($findings).' skill doc:');

        $lines = [];
        foreach ($findings as $finding) {
            $this->line("  • {$finding['file']}");
            foreach ($finding['issues'] as $issue) {
                $this->line("      - {$issue}");
                $lines[] = "{$finding['file']}: {$issue}";
            }
        }

        Log::warning('skills:check-staleness found outdated content', [
            'files' => count($findings),
            'issues' => $totalIssues,
            'details' => $lines,
        ]);

        $this->notifyTelegram($telegram, count($findings), $totalIssues, $lines);

        return $this->option('strict') ? self::FAILURE : self::SUCCESS;
    }

    /** @param  array<int,string>  $lines */
    private function notifyTelegram(TelegramService $telegram, int $fileCount, int $issueCount, array $lines): void
    {
        try {
            if (! $telegram->isConfigured()) {
                return;
            }

            $body = collect($lines)->take(20)->map(fn ($l) => '• '.e($l))->implode("\n");
            $more = count($lines) > 20 ? "\n… và ".(count($lines) - 20).' vấn đề khác' : '';

            $telegram->sendMessage(
                "⚠️ <b>Skill staleness</b>\n"
                ."{$issueCount} vấn đề trong {$fileCount} skill doc:\n\n{$body}{$more}"
            );
        } catch (\Throwable $e) {
            Log::warning('skills:check-staleness: Telegram notify failed', ['error' => $e->getMessage()]);
        }
    }
}
