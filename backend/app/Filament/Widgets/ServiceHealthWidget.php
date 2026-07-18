<?php

namespace App\Filament\Widgets;

use App\Services\DaemonClient;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;

class ServiceHealthWidget extends StatsOverviewWidget
{
    protected static ?int $sort = -5;

    protected ?string $pollingInterval = '10s';

    protected function getStats(): array
    {
        $daemonOk = app(DaemonClient::class)->health();

        $redisOk = false;
        try {
            Cache::store('redis')->set('health:ping', true, 10);
            $redisOk = Cache::store('redis')->get('health:ping') === true;
        } catch (\Throwable) {}

        $dbOk = false;
        try {
            DB::connection()->getPdo();
            $dbOk = true;
        } catch (\Throwable) {}

        $pendingQueues = 0;
        try {
            $pendingQueues = Queue::size();
        } catch (\Throwable) {}

        return [
            Stat::make('Daemon', $daemonOk ? 'Hoạt động' : 'Mất kết nối')
                ->description($daemonOk ? 'Cổng 7456' : 'Kiểm tra lại daemon')
                ->descriptionIcon($daemonOk ? 'heroicon-m-server' : 'heroicon-m-exclamation-triangle')
                ->color($daemonOk ? 'success' : 'danger'),

            Stat::make('Database', $dbOk ? 'Kết nối OK' : 'Lỗi')
                ->description('MySQL')
                ->descriptionIcon('heroicon-m-circle-stack')
                ->color($dbOk ? 'success' : 'danger'),

            Stat::make('Redis', $redisOk ? 'Kết nối OK' : 'Lỗi')
                ->description('Cache + Queue')
                ->descriptionIcon('heroicon-m-square-3-stack-3d')
                ->color($redisOk ? 'success' : 'danger'),

            Stat::make('Queue', $pendingQueues > 0 ? "{$pendingQueues} job chờ" : 'Không có job')
                ->description($pendingQueues > 0 ? 'Đang chờ xử lý' : 'Hàng đợi trống')
                ->descriptionIcon('heroicon-m-list-bullet')
                ->color($pendingQueues > 0 ? 'warning' : 'success'),
        ];
    }
}
