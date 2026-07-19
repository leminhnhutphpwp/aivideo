<?php

namespace App\Filament\Resources\ModerationQueueResource\Pages;

use App\Filament\Resources\ModerationQueueResource;
use Filament\Resources\Pages\ListRecords;

class ListModerationQueue extends ListRecords
{
    protected static string $resource = ModerationQueueResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
