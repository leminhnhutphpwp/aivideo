<?php

namespace App\Filament\Resources\StoryboardResource\Pages;

use App\Filament\Resources\StoryboardResource\StoryboardResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListStoryboards extends ListRecords
{
    protected static string $resource = StoryboardResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
