<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Dashboard;
use App\Filament\Pages\SystemTools;
use BezhanSalleh\FilamentShield\FilamentShieldPlugin;
use Nuxtifyts\DashStackTheme\DashStackThemePlugin;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->brandLogo(asset('logo-transparent.png'))
            ->favicon(asset('favicon.ico'))
            ->login()
            ->multiFactorAuthentication(
                AppAuthentication::make()->recoverable(),
                isRequired: false,
            )
            ->profile()
            ->colors([
                'primary' => Color::Amber,
            ])
            ->plugins([
                FilamentShieldPlugin::make(),
                DashStackThemePlugin::make(),
                \Awcodes\Curator\CuratorPlugin::make()
                    ->label('Media')
                    ->pluralLabel('Media')
                    ->navigationIcon('heroicon-o-photo')
                    ->navigationGroup('Cấu hình hệ thống'),
            ])
            ->navigationGroups([
                'Video Platform',
                'Cấu hình hệ thống',
                'Hệ thống',
                'Billing & Credits',
            ])
            ->viteTheme('resources/css/filament/admin/theme.css')
            ->resources([
                \App\Filament\Resources\PendingCreditPurchaseResource::class,
                \App\Filament\Resources\PlanUpgradeResource::class,
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\\Filament\\Pages')
            ->pages([
                Dashboard::class,
                SystemTools::class,
                \App\Filament\Pages\ManageTelegramSettings::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
            ->widgets([
                \App\Filament\Widgets\ServiceHealthWidget::class,
                \App\Filament\Widgets\JobsOverviewWidget::class,
                \App\Filament\Widgets\ProviderInfoWidget::class,
                \App\Filament\Widgets\ModelUsageWidget::class,
                \App\Filament\Widgets\StorageOverviewWidget::class,
                \App\Filament\Widgets\DaemonInfoWidget::class,
                \App\Filament\Widgets\CreditsOverviewWidget::class,
                \App\Filament\Widgets\ProviderModelsWidget::class,
                \App\Filament\Widgets\RecentAssetsWidget::class,
                \App\Filament\Widgets\RecentJobsWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}