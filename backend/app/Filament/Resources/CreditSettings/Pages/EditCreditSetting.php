<?php

namespace App\Filament\Resources\CreditSettings\Pages;

use App\Filament\Resources\CreditSettings\CreditSettingResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditCreditSetting extends EditRecord
{
    protected static string $resource = CreditSettingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
