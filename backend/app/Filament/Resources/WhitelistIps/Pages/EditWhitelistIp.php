<?php

namespace App\Filament\Resources\WhitelistIps\Pages;

use App\Filament\Resources\WhitelistIps\WhitelistIpResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditWhitelistIp extends EditRecord
{
    protected static string $resource = WhitelistIpResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
