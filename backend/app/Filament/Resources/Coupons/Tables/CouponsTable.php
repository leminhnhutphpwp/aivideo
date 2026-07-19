<?php

namespace App\Filament\Resources\Coupons\Tables;

use Filament\Actions\ActionGroup;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class CouponsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('code')
                    ->label('Mã')
                    ->searchable()
                    ->copyable()
                    ->weight('bold'),
                TextColumn::make('type')
                    ->label('Loại')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'credits' => 'success',
                        'percent' => 'warning',
                        'fixed' => 'info',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'credits' => 'Tặng credits',
                        'percent' => 'Giảm %',
                        'fixed' => 'Giảm cố định',
                        default => $state,
                    }),
                TextColumn::make('value')
                    ->label('Giá trị')
                    ->formatStateUsing(fn ($state, $record) => match ($record->type) {
                        'percent' => $state . '%',
                        'fixed' => number_format($state) . '₫',
                        default => number_format($state) . ' cr',
                    }),
                TextColumn::make('used_count')
                    ->label('Đã dùng')
                    ->formatStateUsing(fn ($state, $record) => $state . ' / ' . ($record->max_uses ?? '∞')),
                IconColumn::make('is_welcome')
                    ->label('Chào mừng')
                    ->boolean(),
                IconColumn::make('is_active')
                    ->label('Kích hoạt')
                    ->boolean(),
                TextColumn::make('expires_at')
                    ->label('Hết hạn')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('Không hết hạn')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('type')
                    ->label('Loại mã')
                    ->options([
                        'credits' => 'Tặng credits',
                        'percent' => 'Giảm %',
                        'fixed' => 'Giảm cố định',
                    ]),
                TernaryFilter::make('is_active')->label('Kích hoạt'),
                TernaryFilter::make('is_welcome')->label('Mã chào mừng'),
            ])
            ->actions([
                ActionGroup::make([
                    EditAction::make()->label('Sửa'),
                    DeleteAction::make()->label('Xoá'),
                ])->label('Thao tác')->icon('heroicon-o-ellipsis-vertical'),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('Xoá đã chọn'),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
