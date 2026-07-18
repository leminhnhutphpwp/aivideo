<?php

namespace App\Filament\Resources\CreditSettings\Pages;

use App\Filament\Resources\CreditSettings\CreditSettingResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCreditSettings extends ListRecords
{
    protected static string $resource = CreditSettingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
