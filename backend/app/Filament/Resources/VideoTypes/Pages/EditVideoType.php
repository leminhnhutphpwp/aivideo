<?php

namespace App\Filament\Resources\VideoTypes\Pages;

use App\Filament\Resources\VideoTypes\VideoTypeResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditVideoType extends EditRecord
{
    protected static string $resource = VideoTypeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
