<?php

namespace App\Filament\Resources\WhitelistIps\Pages;

use App\Filament\Resources\WhitelistIps\WhitelistIpResource;
use Filament\Resources\Pages\CreateRecord;

class CreateWhitelistIp extends CreateRecord
{
    protected static string $resource = WhitelistIpResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        return $data;
    }
}
