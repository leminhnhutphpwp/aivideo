<?php

namespace App\Filament\Resources\WhitelistIps\Pages;

use App\Filament\Resources\WhitelistIps\WhitelistIpResource;
use App\Services\AntiAbuse\AntiAbuseService;
use Filament\Actions\CreateAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListWhitelistIps extends ListRecords
{
    protected static string $resource = WhitelistIpResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()
                ->label('Thêm IP'),
            \Filament\Actions\Action::make('add_current_ip')
                ->label('Thêm IP hiện tại')
                ->icon('heroicon-o-plus-circle')
                ->color('success')
                ->action(function () {
                    $ip = request()->ip();
                    $service = app(AntiAbuseService::class);

                    if ($service->isWhitelisted($ip)) {
                        Notification::make()
                            ->title("IP {$ip} đã có trong danh sách cho phép")
                            ->warning()
                            ->send();
                        return;
                    }

                    $service->whitelistIp($ip, 'IP admin', auth()->id());
                    Notification::make()
                        ->title("Đã thêm IP {$ip} vào danh sách cho phép")
                        ->success()
                        ->send();
                }),
        ];
    }
}
