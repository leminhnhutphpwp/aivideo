<?php

namespace App\Filament\Resources\StoryboardResource\Pages;

use App\Filament\Resources\StoryboardResource\StoryboardResource;
use App\Models\Storyboard;
use Filament\Resources\Pages\CreateRecord;

class CreateStoryboard extends CreateRecord
{
    protected static string $resource = StoryboardResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = auth()->id();

        return $data;
    }

    protected function afterCreate(): void
    {
        /** @var Storyboard $storyboard */
        $storyboard = $this->record;
        $storyboard->updateCreditsCost();
    }
}
