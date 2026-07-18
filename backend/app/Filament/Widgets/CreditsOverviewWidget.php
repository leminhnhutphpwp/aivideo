<?php

namespace App\Filament\Widgets;

use App\Models\CreditTransaction;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class CreditsOverviewWidget extends StatsOverviewWidget
{
    protected static ?int $sort = -2;

    protected ?string $pollingInterval = '30s';

    protected function getStats(): array
    {
        $today = now()->startOfDay();
        $thisMonth = now()->startOfMonth();

        $todayUsage = 0;
        $monthUsage = 0;
        $monthTopup = 0;
        try {
            $todayUsage = CreditTransaction::where('created_at', '>=', $today)
                ->where('amount', '<', 0)
                ->sum('amount');

            $monthUsage = CreditTransaction::where('created_at', '>=', $thisMonth)
                ->where('amount', '<', 0)
                ->sum('amount');

            $monthTopup = CreditTransaction::where('created_at', '>=', $thisMonth)
                ->where('amount', '>', 0)
                ->sum('amount');
        } catch (\Throwable) {}

        $totalCredits = User::sum('credits');
        $totalUsers = User::count();

        return [
            Stat::make('Credits dùng hôm nay', number_format(abs($todayUsage)))
                ->description('Tổng credits đã tiêu thụ')
                ->descriptionIcon('heroicon-m-currency-dollar')
                ->color('danger'),

            Stat::make('Credits dùng tháng này', number_format(abs($monthUsage)))
                ->description('Tổng credits tháng')
                ->descriptionIcon('heroicon-m-calendar')
                ->color('warning'),

            Stat::make('Nạp trong tháng', number_format($monthTopup))
                ->description('Credits đã nạp vào hệ thống')
                ->descriptionIcon('heroicon-m-banknotes')
                ->color('success'),

            Stat::make('Tổng quan', number_format($totalCredits))
                ->description("{$totalUsers} người dùng")
                ->descriptionIcon('heroicon-m-users')
                ->color('info'),
        ];
    }
}
