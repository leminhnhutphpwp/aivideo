<?php

namespace App\Filament\Resources\RegistrationLogResource\Pages;

use App\Filament\Resources\RegistrationLogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListRegistrationLogs extends ListRecords
{
    protected static string $resource = RegistrationLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('refresh')
                ->label('Làm mới')
                ->icon('heroicon-o-arrow-path')
                ->action(fn () => $this->resetTable()),
        ];
    }
}
