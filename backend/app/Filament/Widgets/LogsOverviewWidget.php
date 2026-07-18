<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

use App\Models\EmailLog;
use App\Models\ActivityLog;

class LogsOverviewWidget extends StatsOverviewWidget
{
    protected static ?int $sort = -2;

    protected static array $extraAttributes = ['class' => 'shadow-none border-0 p-0'];

    protected function getStats(): array
    {
        $emailSentThisMonth = EmailLog::whereMonth('created_at', now()->month)
            ->where('status', 'sent')
            ->count();

        $emailFailedThisMonth = EmailLog::whereMonth('created_at', now()->month)
            ->where('status', 'failed')
            ->count();

        $todayActivities = ActivityLog::whereDate('created_at', now()->toDateString())->count();

        return [
            Stat::make('Email Đã Gửi (Tháng)', $emailSentThisMonth)
            ->description('Số lượng email gửi đi thành công')
            ->descriptionIcon('heroicon-m-envelope')
            ->color('success'),
            Stat::make('Email Gửi Lỗi (Tháng)', $emailFailedThisMonth)
            ->description('Số lượng email lỗi')
            ->descriptionIcon($emailFailedThisMonth > 0 ? 'heroicon-m-exclamation-triangle' : 'heroicon-m-check-circle')
            ->color($emailFailedThisMonth > 0 ? 'danger' : 'success'),
            Stat::make('Thao tác hôm nay', $todayActivities)
            ->description('Nhật ký thao tác phát sinh')
            ->descriptionIcon('heroicon-m-bolt')
            ->color('info'),
        ];
    }
}