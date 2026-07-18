<?php

namespace App\Filament\Resources\DurationTiers\Pages;

use App\Filament\Resources\DurationTiers\DurationTierResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListDurationTiers extends ListRecords
{
    protected static string $resource = DurationTierResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
