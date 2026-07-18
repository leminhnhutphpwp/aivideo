<?php

namespace App\Filament\Resources\ResolutionPricings\Pages;

use App\Filament\Resources\ResolutionPricings\ResolutionPricingResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditResolutionPricing extends EditRecord
{
    protected static string $resource = ResolutionPricingResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
