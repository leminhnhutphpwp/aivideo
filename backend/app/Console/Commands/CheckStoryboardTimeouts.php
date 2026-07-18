<?php

namespace App\Console\Commands;

use App\Models\Storyboard;
use App\Services\CreditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckStoryboardTimeouts extends Command
{
    protected $signature = 'storyboards:check-timeouts {--dry-run : Check without taking action}';
    protected $description = 'Check for storyboards stuck in rendering status for >2 hours and auto-cancel them';

    protected int $timeoutHours = 2;

    public function handle(): int
    {
        $this->info('Checking for hung storyboards...');

        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No actions will be taken');
        }

        $threshold = now()->subHours($this->timeoutHours);

        $hungStoryboards = Storyboard::where('status', 'rendering')
            ->where('updated_at', '<', $threshold)
            ->get();

        if ($hungStoryboards->isEmpty()) {
            $this->info('No hung storyboards found');
            return 0;
        }

        $this->warn("Found {$hungStoryboards->count()} hung storyboard(s)");

        $cancelled = 0;

        foreach ($hungStoryboards as $storyboard) {
            $this->newLine();
            $this->line("Storyboard: {$storyboard->uuid}");
            $this->line("  Title: {$storyboard->title}");
            $this->line("  Updated: {$storyboard->updated_at->diffForHumans()}");
            $this->line("  Credits reserved: {$storyboard->credits_cost}");

            if ($dryRun) {
                $this->warn('  SKIPPED (dry run)');
                continue;
            }

            $storyboard->update([
                'status' => 'cancelled',
                'error_message' => "Timeout: stuck in rendering for >{$this->timeoutHours} hours",
            ]);

            app(CreditService::class)->releaseStoryboardReserved($storyboard);

            Log::warning('Storyboard timed out and cancelled', [
                'storyboard_uuid' => $storyboard->uuid,
                'storyboard_id' => $storyboard->id,
            ]);

            $this->info('  Cancelled and credits released');
            $cancelled++;
        }

        $this->newLine();
        $this->info("Summary: {$cancelled} storyboard(s) cancelled");

        return 0;
    }
}
