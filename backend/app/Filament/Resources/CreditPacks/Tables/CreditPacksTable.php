<?php

namespace App\Filament\Resources\CreditPacks\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\ActionGroup;
use Filament\Actions\EditAction;
use Filament\Actions\DeleteAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CreditPacksTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label('Tên gói')
                    ->searchable(),
                TextColumn::make('price')
                    ->label('Giá tiền')
                    ->formatStateUsing(fn ($state) => number_format($state) . '₫')
                    ->sortable(),
                TextColumn::make('credits')
                    ->label('Credits')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('label')
                    ->label('Nhãn')
                    ->badge()
                    ->color(fn (?string $state): string => match (true) {
                        $state === null || $state === '' => 'gray',
                        default => 'warning',
                    })
                    ->searchable(),
                IconColumn::make('is_active')
                    ->label('Kích hoạt')
                    ->boolean(),
                TextColumn::make('sort_order')
                    ->label('Thứ tự')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->label('Cập nhật')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([])
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
            ->defaultSort('sort_order', 'asc');
    }
}
