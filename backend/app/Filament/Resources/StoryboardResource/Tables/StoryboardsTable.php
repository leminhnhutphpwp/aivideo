<?php

namespace App\Filament\Resources\StoryboardResource\Tables;

use App\Filament\Resources\StoryboardResource\StoryboardResource;
use App\Models\Storyboard;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Tables\Table;
use Filament\Tables;

class StoryboardsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('uuid')
                    ->label('UUID')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Đã copy UUID')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Người dùng'),
                Tables\Columns\TextColumn::make('title')
                    ->label('Tiêu đề')
                    ->searchable(),
                Tables\Columns\TextColumn::make('video_type')
                    ->label('Loại video')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'text_to_video' => 'Text to Video',
                        'image_to_video' => 'Image to Video',
                        'ugc_review' => 'UGC Review',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('quality_tier')
                    ->label('Chất lượng')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'standard' => 'gray',
                        'premium' => 'warning',
                        'ultra' => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'standard' => 'Standard',
                        'premium' => 'Premium',
                        'ultra' => 'Ultra',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'draft' => 'gray',
                        'analyzing' => 'warning',
                        'analyzed' => 'info',
                        'ready' => 'success',
                        'rendering' => 'warning',
                        'completed' => 'success',
                        'failed' => 'danger',
                        'cancelled' => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'draft' => 'Nháp',
                        'analyzing' => 'Đang phân tích',
                        'analyzed' => 'Đã phân tích',
                        'rendering' => 'Đang render',
                        'completed' => 'Hoàn thành',
                        'failed' => 'Thất bại',
                        'cancelled' => 'Đã huỷ',
                        'ready' => 'Sẵn sàng',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('scene_count')
                    ->label('Số cảnh')
                    ->badge(),
                Tables\Columns\TextColumn::make('credits_cost')
                    ->label('Credits'),
                Tables\Columns\TextColumn::make('consistency_score')
                    ->label('Nhất quán')
                    ->suffix('%'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Trạng thái')
                    ->options([
                        'draft' => 'Nháp',
                        'analyzing' => 'Đang phân tích',
                        'analyzed' => 'Đã phân tích',
                        'rendering' => 'Đang render',
                        'completed' => 'Hoàn thành',
                        'failed' => 'Thất bại',
                        'cancelled' => 'Đã huỷ',
                        'ready' => 'Sẵn sàng',
                    ]),
                Tables\Filters\SelectFilter::make('video_type')
                    ->label('Loại video')
                    ->options([
                        'text_to_video' => 'Text to Video',
                        'image_to_video' => 'Image to Video',
                    ]),
                Tables\Filters\SelectFilter::make('quality_tier')
                    ->label('Chất lượng')
                    ->options([
                        'standard' => 'Standard',
                        'premium' => 'Premium',
                        'ultra' => 'Ultra',
                    ]),
            ])
            ->actions([
                Action::make('edit')
                    ->label('Sửa')
                    ->url(fn (Storyboard $record) => StoryboardResource::getUrl('edit', ['record' => $record]))
                    ->icon('heroicon-o-pencil'),
                Action::make('analyze')
                    ->label('Phân tích')
                    ->icon('heroicon-o-magnifying-glass')
                    ->action(function (Storyboard $record) {
                        $record->markAsAnalyzing();
                    })
                    ->requiresConfirmation()
                    ->visible(fn (Storyboard $record) => $record->status === 'draft'),
                Action::make('render')
                    ->label('Render')
                    ->icon('heroicon-o-play')
                    ->action(function (Storyboard $record) {
                        $record->markAsRendering();
                    })
                    ->requiresConfirmation()
                    ->visible(fn (Storyboard $record) => $record->status === 'ready'),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
