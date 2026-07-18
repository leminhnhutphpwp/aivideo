<?php

namespace App\Filament\Resources\ActivityLogs\Pages;

use App\Filament\Resources\ActivityLogs\ActivityLogResource;
use Filament\Actions\Action;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Support\Facades\Artisan;
use Filament\Notifications\Notification;

class ListActivityLogs extends ListRecords
{
    protected static string $resource = ActivityLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('cleanLogs')
                ->label('Dọn dẹp log cũ')
                ->icon('heroicon-o-trash')
                ->color('danger')
                ->requiresConfirmation()
                ->modalHeading('Dọn dẹp Logs')
                ->modalDescription('Dọn dẹp các bản ghi logs cũ hơn số ngày quy định. Bạn có chắc không?')
                ->action(function () {
                    Artisan::call('activitylog:clean');
                    
                    Notification::make()
                        ->title('Đã dọn dẹp logs thành công!')
                        ->success()
                        ->send();
                }),
        ];
    }
}
