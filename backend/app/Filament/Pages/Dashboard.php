<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\CreditsOverviewWidget;
use App\Filament\Widgets\DaemonInfoWidget;
use App\Filament\Widgets\JobsOverviewWidget;
use App\Filament\Widgets\ModelUsageWidget;
use App\Filament\Widgets\ProviderInfoWidget;
use App\Filament\Widgets\ProviderModelsWidget;
use App\Filament\Widgets\RecentAssetsWidget;
use App\Filament\Widgets\RecentJobsWidget;
use App\Filament\Widgets\ServiceHealthWidget;
use App\Filament\Widgets\StorageOverviewWidget;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    protected static ?string $title = 'Tổng quan hệ thống';

    protected static ?string $navigationLabel = 'Tổng quan';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-home';

    public function getWidgets(): array
    {
        return [
            ServiceHealthWidget::class,
            JobsOverviewWidget::class,
            ProviderInfoWidget::class,
            ModelUsageWidget::class,
            StorageOverviewWidget::class,
            DaemonInfoWidget::class,
            CreditsOverviewWidget::class,
            ProviderModelsWidget::class,
            RecentAssetsWidget::class,
            RecentJobsWidget::class,
        ];
    }
}
