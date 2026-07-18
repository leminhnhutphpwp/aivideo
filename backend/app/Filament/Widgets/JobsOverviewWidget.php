<?php

namespace App\Filament\Widgets;

use App\Models\RenderJob;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class JobsOverviewWidget extends StatsOverviewWidget
{
    protected static ?int $sort = -4;

    protected ?string $pollingInterval = '15s';

    protected function getStats(): array
    {
        $today = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();

        $todayTotal = RenderJob::where('created_at', '>=', $today)->count();
        $yesterdayTotal = RenderJob::whereBetween('created_at', [$yesterday, $today])->count();

        $todayCompleted = RenderJob::where('created_at', '>=', $today)
            ->where('status', 'completed')->count();

        $todayFailed = RenderJob::where('created_at', '>=', $today)
            ->where('status', 'failed')->count();

        $avgGpuSeconds = RenderJob::where('created_at', '>=', $today)
            ->whereNotNull('gpu_seconds')
            ->avg('gpu_seconds');

        $change = $yesterdayTotal > 0
            ? round((($todayTotal - $yesterdayTotal) / $yesterdayTotal) * 100, 1)
            : 0;

        $changeLabel = $change >= 0 ? "+{$change}%" : "{$change}%";

        return [
            Stat::make('Job hôm nay', $todayTotal)
                ->description("{$changeLabel} so với hôm qua")
                ->descriptionIcon($change >= 0 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->color($change >= 0 ? 'success' : 'danger'),

            Stat::make('Hoàn thành', $todayCompleted)
                ->description('Job hoàn thành thành công')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),

            Stat::make('Thất bại', $todayFailed)
                ->description($todayFailed > 0 ? 'Cần kiểm tra lại' : 'Không có lỗi')
                ->descriptionIcon($todayFailed > 0 ? 'heroicon-m-exclamation-triangle' : 'heroicon-m-check-circle')
                ->color($todayFailed > 0 ? 'danger' : 'success'),

            Stat::make('GPU trung bình', $avgGpuSeconds ? round($avgGpuSeconds, 1) . 's' : 'N/A')
                ->description('Thời gian xử lý trung bình')
                ->descriptionIcon('heroicon-m-cpu-chip')
                ->color('info'),
        ];
    }
}
