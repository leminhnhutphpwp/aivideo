<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PruneTrashedRecords extends Command
{
    protected $signature = 'model:prune-trashed
        {--model= : Prune only a specific model class}
        {--dry-run : Only count, don\'t delete}';

    protected $description = 'Permanently delete soft-deleted records past their TTL';

    public function handle(): int
    {
        $config = config('soft-delete.ttl', []);
        $batchSize = config('soft-delete.batch_size', 100);
        $logChannel = config('soft-delete.log_channel');
        $dryRun = $this->option('dry-run');
        $specificModel = $this->option('model');

        $logger = $logChannel ? Log::channel($logChannel) : Log::stack(['single']);

        $totalPruned = 0;

        foreach ($config as $modelClass => $ttlDays) {
            if ($specificModel && $modelClass !== $specificModel) {
                continue;
            }

            if ($ttlDays <= 0) {
                continue;
            }

            if (!class_exists($modelClass) || !in_array('Illuminate\Database\Eloquent\SoftDeletes', class_uses($modelClass))) {
                continue;
            }

            $cutoff = now()->subDays($ttlDays);
            $query = $modelClass::onlyTrashed()->where('deleted_at', '<=', $cutoff);
            $count = $query->count();

            if ($count === 0) {
                continue;
            }

            $this->info("[{$modelClass}] {$count} record(s) past {$ttlDays} day TTL (before {$cutoff->toDateTimeString()})");

            $logger->info('Pruning soft-deleted records', [
                'model' => $modelClass,
                'count' => $count,
                'ttl_days' => $ttlDays,
                'cutoff' => $cutoff->toDateTimeString(),
                'dry_run' => $dryRun,
            ]);

            if (!$dryRun) {
                $pruned = 0;
                $query->chunkById($batchSize, function ($records) use ($modelClass, &$pruned, $logger) {
                    foreach ($records as $record) {
                        try {
                            DB::beginTransaction();

                            if (method_exists($record, 'forceDelete')) {
                                $record->forceDelete();
                            } else {
                                $record->delete();
                            }

                            DB::commit();
                            $pruned++;
                        } catch (\Throwable $e) {
                            DB::rollBack();
                            $logger->error('Failed to prune record', [
                                'model' => $modelClass,
                                'id' => $record->id,
                                'error' => $e->getMessage(),
                            ]);
                            $this->error("  Failed to prune {$modelClass}#{$record->id}: {$e->getMessage()}");
                        }
                    }
                });

                $totalPruned += $pruned;
                $this->info("  Pruned {$pruned} record(s)");
                $logger->info('Pruned records', [
                    'model' => $modelClass,
                    'count' => $pruned,
                ]);
            }
        }

        if ($dryRun) {
            $this->info('Dry run complete — no records were pruned.');
        } else {
            $this->info("Done. Total pruned: {$totalPruned}");
            $logger->info('Pruning cycle complete', ['total_pruned' => $totalPruned]);
        }

        return Command::SUCCESS;
    }
}
