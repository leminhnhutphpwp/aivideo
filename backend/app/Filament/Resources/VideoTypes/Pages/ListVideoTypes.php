<?php

namespace App\Filament\Resources\VideoTypes\Pages;

use App\Filament\Resources\VideoTypes\VideoTypeResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListVideoTypes extends ListRecords
{
    protected static string $resource = VideoTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
