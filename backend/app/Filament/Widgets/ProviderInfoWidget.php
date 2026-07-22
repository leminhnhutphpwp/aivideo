<?php

namespace App\Filament\Widgets;

use App\Models\RenderJob;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ProviderInfoWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 0;

    protected ?string $pollingInterval = '15s';

    protected function getStats(): array
    {
        $models = [];
        try {
            $models = RenderJob::select('model')
                ->selectRaw('count(*) as total')
                ->selectRaw("sum(case when status='completed' then 1 else 0 end) as completed")
                ->selectRaw("sum(case when status='failed' then 1 else 0 end) as failed")
                ->selectRaw('COALESCE(avg(gpu_seconds), 0) as avg_gpu')
                ->selectRaw('COALESCE(sum(credits_cost), 0) as total_credits')
                ->groupBy('model')
                ->orderByDesc('total')
                ->get();
        } catch (\Throwable) {}

        $totalJobs = $models->sum('total');
        $totalDone = $models->sum('completed');
        $totalFail = $models->sum('failed');
        $totalCredits = $models->sum('total_credits');
        $avgGpu = RenderJob::whereNotNull('gpu_seconds')->avg('gpu_seconds');
        $modelCount = $models->count();

        $today = now()->startOfDay();
        $todayJobs = RenderJob::where('created_at', '>=', $today)->count();
        $todayCredits = RenderJob::where('created_at', '>=', $today)->sum('credits_cost');

        return [
            Stat::make('Tổng jobs', $totalJobs)
                ->description("{$modelCount} models • hôm nay: {$todayJobs}")
                ->descriptionIcon('heroicon-m-play')
                ->color('info'),

            Stat::make('Thành công', $totalDone)
                ->description("Thất bại: {$totalFail}")
                ->descriptionIcon('heroicon-m-check-circle')
                ->color($totalFail > 0 ? 'warning' : 'success'),

            Stat::make('Credits đã dùng', number_format($totalCredits))
                ->description("Hôm nay: " . number_format($todayCredits))
                ->descriptionIcon('heroicon-m-currency-dollar')
                ->color('danger'),

            Stat::make('GPU trung bình', $avgGpu ? round($avgGpu, 1) . 's' : 'N/A')
                ->description('Trên mỗi job')
                ->descriptionIcon('heroicon-m-cpu-chip')
                ->color('gray'),
        ];
    }
}
