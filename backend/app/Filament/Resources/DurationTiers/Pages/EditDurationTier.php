<?php

namespace App\Filament\Resources\DurationTiers\Pages;

use App\Filament\Resources\DurationTiers\DurationTierResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditDurationTier extends EditRecord
{
    protected static string $resource = DurationTierResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
