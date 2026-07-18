<?php

namespace App\Filament\Widgets;

use App\Models\RenderJob;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Widgets\TableWidget as BaseWidget;

class ModelUsageWidget extends BaseWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = '15s';

    protected function getTableQuery(): ?\Illuminate\Database\Eloquent\Builder
    {
        return \App\Models\RenderJob::query()->whereRaw('1 = 0');
    }

    public function getTableRecords(): \Illuminate\Support\Collection
    {
        return collect($this->buildStats());
    }

    protected function buildStats(): array
    {
        $rows = [];
        try {
            $models = RenderJob::select('model')
                ->selectRaw('count(*) as total')
                ->selectRaw("sum(case when status='completed' then 1 else 0 end) as completed")
                ->selectRaw("sum(case when status='failed' then 1 else 0 end) as failed")
                ->selectRaw("sum(case when status='queued' then 1 else 0 end) as queued")
                ->selectRaw("sum(case when status='processing' then 1 else 0 end) as processing")
                ->selectRaw('COALESCE(avg(gpu_seconds), 0) as avg_gpu')
                ->selectRaw('COALESCE(sum(credits_cost), 0) as total_credits')
                ->selectRaw('COALESCE(max(gpu_seconds), 0) as max_gpu')
                ->selectRaw('COALESCE(min(gpu_seconds), 0) as min_gpu')
                ->selectRaw('max(created_at) as last_used')
                ->groupBy('model')
                ->orderByDesc('total')
                ->get();

            $aliasMap = [
                'seedance' => 'doubao-seedance-2-0-260128',
                'seedance-2.0' => 'doubao-seedance-2-0-260128',
                'seedance-2.0-fast' => 'doubao-seedance-2-0-fast-260128',
                'seedance-1.0-pro' => 'doubao-seedance-1-0-pro-250528',
                'grok' => 'grok-imagine-video',
                'grok-video' => 'grok-imagine-video',
                'veo-3' => 'veo-3',
                'veo-2' => 'veo-2',
            ];
            $reverseMap = [];
            foreach ($aliasMap as $alias => $id) {
                $reverseMap[$id] = $alias;
            }

            foreach ($models as $m) {
                $successRate = $m->total > 0 ? round(($m->completed / $m->total) * 100, 1) : 0;
                $daemonId = $aliasMap[$m->model] ?? $m->model;

                $rows[] = [
                    'model' => $m->model,
                    'daemon_id' => $daemonId,
                    'total' => $m->total,
                    'completed' => $m->completed,
                    'failed' => $m->failed,
                    'queued' => $m->queued,
                    'processing' => $m->processing,
                    'success_rate' => $successRate,
                    'avg_gpu' => round($m->avg_gpu, 1),
                    'min_gpu' => round($m->min_gpu, 1),
                    'max_gpu' => round($m->max_gpu, 1),
                    'total_credits' => $m->total_credits,
                    'last_used' => $m->last_used,
                ];
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $rows;
    }

    protected function getTableColumns(): array
    {
        return [
            TextColumn::make('model')
                ->label('Model')
                ->searchable()
                ->weight('bold')
                ->limit(15),

            TextColumn::make('daemon_id')
                ->label('Daemon ID')
                ->limit(25)
                ->copyable()
                ->color('gray')
                ->toggleable(),

            TextColumn::make('total')
                ->label('Tổng')
                ->numeric()
                ->sortable()
                ->alignRight(),

            TextColumn::make('completed')
                ->label('Thành công')
                ->numeric()
                ->color('success')
                ->alignRight(),

            TextColumn::make('failed')
                ->label('Lỗi')
                ->numeric()
                ->color('danger')
                ->alignRight(),

            TextColumn::make('queued')
                ->label('Chờ')
                ->numeric()
                ->color('warning')
                ->alignRight()
                ->toggleable(),

            TextColumn::make('processing')
                ->label('Đang chạy')
                ->numeric()
                ->color('info')
                ->alignRight()
                ->toggleable(),

            TextColumn::make('success_rate')
                ->label('Tỉ lệ')
                ->formatStateUsing(fn ($state) => "{$state}%")
                ->color(fn ($state) => $state >= 90 ? 'success' : ($state >= 70 ? 'warning' : 'danger'))
                ->alignRight(),

            TextColumn::make('avg_gpu')
                ->label('GPU tb')
                ->suffix('s')
                ->color('gray')
                ->alignRight()
                ->toggleable(),

            TextColumn::make('min_gpu')
                ->label('Min')
                ->suffix('s')
                ->color('gray')
                ->alignRight()
                ->toggleable(isToggledHiddenByDefault: true),

            TextColumn::make('max_gpu')
                ->label('Max')
                ->suffix('s')
                ->color('gray')
                ->alignRight()
                ->toggleable(isToggledHiddenByDefault: true),

            TextColumn::make('total_credits')
                ->label('Credits')
                ->numeric()
                ->color('warning')
                ->alignRight(),

            TextColumn::make('last_used')
                ->label('Gần nhất')
                ->dateTime('H:i:s d/m')
                ->since()
                ->color('gray')
                ->toggleable(),
        ];
    }

    public function getTableRecordKey(mixed $row): string
    {
        return $row['model'] ?? uniqid();
    }

    protected function getTableActions(): array
    {
        return [];
    }

    protected function getTableContentGrid(): ?array
    {
        return null;
    }
}
