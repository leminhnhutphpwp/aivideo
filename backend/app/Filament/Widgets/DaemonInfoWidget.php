<?php

namespace App\Filament\Widgets;

use App\Services\DaemonClient;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class DaemonInfoWidget extends StatsOverviewWidget
{
    protected static ?int $sort = -1;

    protected ?string $pollingInterval = '30s';

    protected function getStats(): array
    {
        $daemon = app(DaemonClient::class);
        $ok = $daemon->health();

        if (!$ok) {
            return [
                Stat::make('Daemon', 'Mất kết nối')
                    ->description('Không thể kết nối tới daemon')
                    ->descriptionIcon('heroicon-m-exclamation-triangle')
                    ->color('danger'),
            ];
        }

        $models = [];
        try {
            $response = \Illuminate\Support\Facades\Http::timeout(5)
                ->get(config('daemon.base_url') . '/api/media/models');
            if ($response->successful()) {
                $data = $response->json();
                $models = $data['video'] ?? [];
            }
        } catch (\Throwable) {}

        $videoModels = count($models);
        $activeTasks = 0;
        try {
            $tasks = \Illuminate\Support\Facades\Http::timeout(3)
                ->get(config('daemon.base_url') . '/api/media/tasks');
            if ($tasks->successful()) {
                $allTasks = $tasks->json();
                $activeTasks = count(array_filter($allTasks, fn($t) => in_array($t['status'] ?? '', ['queued', 'processing'])));
            }
        } catch (\Throwable) {}

        return [
            Stat::make('Daemon', 'Hoạt động')
                ->description('Cổng 7456')
                ->descriptionIcon('heroicon-m-server')
                ->color('success'),

            Stat::make('Model Video', $videoModels)
                ->description('Số lượng model video khả dụng')
                ->descriptionIcon('heroicon-m-cube')
                ->color('info'),

            Stat::make('Task đang chạy', $activeTasks)
                ->description('Task đang xử lý trên daemon')
                ->descriptionIcon('heroicon-m-play')
                ->color($activeTasks > 0 ? 'warning' : 'success'),
        ];
    }
}
