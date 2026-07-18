<?php

namespace App\Filament\Resources\StoryboardResource\Pages;

use App\Filament\Resources\StoryboardResource\StoryboardResource;
use App\Models\Storyboard;
use Filament\Actions\Action;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Enums\Alignment;

class ViewStoryboard extends ViewRecord
{
    protected static string $resource = StoryboardResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('edit')
                ->label('Sửa')
                ->icon('heroicon-o-pencil')
                ->url(fn (Storyboard $record) => static::getResource()::getUrl('edit', ['record' => $record])),
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

    public function getContent(): array
    {
        /** @var Storyboard $storyboard */
        $storyboard = $this->record;

        return [
            \Filament\Infolists\Components\TextEntry::make('title')
                ->label('Tiêu đề'),
            \Filament\Infolists\Components\TextEntry::make('description')
                ->label('Mô tả')
                ->columnSpanFull(),
            \Filament\Infolists\Components\TextEntry::make('video_type')
                ->label('Loại video'),
            \Filament\Infolists\Components\TextEntry::make('quality_tier')
                ->label('Chất lượng'),
            \Filament\Infolists\Components\TextEntry::make('voice_mood')
                ->label('Giọng đọc/Mood'),
            \Filament\Infolists\Components\TextEntry::make('status')
                ->label('Trạng thái')
                ->badge(),
            \Filament\Infolists\Components\TextEntry::make('scene_count')
                ->label('Số cảnh'),
            \Filament\Infolists\Components\TextEntry::make('credits_cost')
                ->label('Credits'),
            \Filament\Infolists\Components\TextEntry::make('consistency_score')
                ->label('Độ nhất quán')
                ->suffix('%'),
            \Filament\Infolists\Components\RepeatableEntry::make('scenes')
                ->label('Cảnh')
                ->schema([
                    \Filament\Infolists\Components\TextEntry::make('scene_number')->label('Số cảnh'),
                    \Filament\Infolists\Components\TextEntry::make('prompt')->label('Prompt')->columnSpanFull(),
                    \Filament\Infolists\Components\TextEntry::make('duration_seconds')->label('Thời lượng')->suffix('s'),
                    \Filament\Infolists\Components\TextEntry::make('camera_movement')->label('Camera'),
                    \Filament\Infolists\Components\TextEntry::make('lighting')->label('Ánh sáng'),
                    \Filament\Infolists\Components\TextEntry::make('status')->label('Trạng thái')->badge(),
                ])
                ->columns(2)
                ->columnSpanFull(),
            \Filament\Infolists\Components\RepeatableEntry::make('references')
                ->label('References')
                ->schema([
                    \Filament\Infolists\Components\TextEntry::make('type')->label('Loại'),
                    \Filament\Infolists\Components\TextEntry::make('description')->label('Mô tả')->columnSpanFull(),
                    \Filament\Infolists\Components\TextEntry::make('media_path')->label('Path'),
                ])
                ->columns(2)
                ->columnSpanFull(),
        ];
    }
}
