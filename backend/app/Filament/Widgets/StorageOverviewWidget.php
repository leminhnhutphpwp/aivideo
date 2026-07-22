<?php

namespace App\Filament\Widgets;

use App\Models\Asset;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StorageOverviewWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 3;

    protected ?string $pollingInterval = '30s';

    protected function getStats(): array
    {
        $totalAssets = Asset::count();
        $totalBytes = (int) Asset::sum('size_bytes');
        $totalMb = round($totalBytes / 1048576, 2);

        $videoCount = Asset::where('type', 'video')->count();
        $videoBytes = (int) Asset::where('type', 'video')->sum('size_bytes');
        $thumbnailCount = Asset::where('type', 'thumbnail')->count();
        $otherCount = $totalAssets - $videoCount - $thumbnailCount;

        $today = now()->startOfDay();
        $todayAssets = Asset::where('created_at', '>=', $today)->count();

        $disk = null;
        $diskUsed = 0;
        try {
            $disk = config('filesystems.default');
            $diskUsed = round($totalBytes / 1073741824, 4);
        } catch (\Throwable) {}

        return [
            Stat::make('Tổng tập tin', $totalAssets)
                ->description("Video: {$videoCount} • Hôm nay: +{$todayAssets}")
                ->descriptionIcon('heroicon-m-folder')
                ->color('info'),

            Stat::make('Dung lượng', $totalMb > 0 ? "{$totalMb} MB" : '0 MB')
                ->description("{$videoCount} videos • {$thumbnailCount} thumbnails")
                ->descriptionIcon('heroicon-m-circle-stack')
                ->color($totalMb > 100 ? 'warning' : 'success'),

            Stat::make('Disk', strtoupper($disk ?? 'N/A'))
                ->description($diskUsed > 0 ? $diskUsed . ' GB used' : 'Chưa có dữ liệu')
                ->descriptionIcon('heroicon-m-server')
                ->color('gray'),
        ];
    }
}
