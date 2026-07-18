<?php

namespace App\Filament\Resources\StoryboardResource\Pages;

use App\Filament\Resources\StoryboardResource\StoryboardResource;
use App\Models\Storyboard;
use Filament\Actions\Action;
use Filament\Resources\Pages\EditRecord;

class EditStoryboard extends EditRecord
{
    protected static string $resource = StoryboardResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('analyze')
                ->label('Phân tích')
                ->icon('heroicon-o-magnifying-glass')
                ->action(function (Storyboard $record) {
                    $record->markAsAnalyzing();
                    $this->redirect($this->getResource()::getUrl('view', ['record' => $record]));
                })
                ->requiresConfirmation()
                ->visible(fn (Storyboard $record) => $record->status === 'draft'),
            Action::make('render')
                ->label('Render')
                ->icon('heroicon-o-play')
                ->action(function (Storyboard $record) {
                    $record->markAsRendering();
                    $this->redirect($this->getResource()::getUrl('view', ['record' => $record]));
                })
                ->requiresConfirmation()
                ->visible(fn (Storyboard $record) => in_array($record->status, ['draft', 'analyzed'])),
        ];
    }

    protected function afterSave(): void
    {
        /** @var Storyboard $storyboard */
        $storyboard = $this->record;
        $storyboard->updateCreditsCost();
    }
}
