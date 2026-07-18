<?php

namespace App\Filament\Resources\ResolutionPricings\Pages;

use App\Filament\Resources\ResolutionPricings\ResolutionPricingResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListResolutionPricings extends ListRecords
{
    protected static string $resource = ResolutionPricingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
