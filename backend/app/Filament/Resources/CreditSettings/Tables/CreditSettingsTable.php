<?php

namespace App\Filament\Resources\CreditSettings\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class CreditSettingsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('label')
                    ->label('Cấu hình')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('key')
                    ->label('Mã')
                    ->searchable()
                    ->color('gray')
                    ->extraAttributes(['class' => 'font-mono']),

                TextColumn::make('value')
                    ->label('Giá trị')
                    ->numeric()
                    ->sortable()
                    ->formatStateUsing(function ($state, $record) {
                        $numeric = (float) $state;
                        $decimals = $numeric != (int) $numeric ? 2 : 0;
                        $formatted = number_format($numeric, $decimals);
                        $unit = $record->unit ? ' ' . $record->unit : '';
                        return $unit === ' VNĐ' ? number_format($numeric, 0) . 'đ' : $formatted . $unit;
                    }),

                TextColumn::make('description')
                    ->label('Mô tả')
                    ->limit(50)
                    ->color('gray'),

                IconColumn::make('is_active')
                    ->label('Trạng thái')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle'),

                TextColumn::make('sort_order')
                    ->label('Thứ tự')
                    ->numeric()
                    ->sortable()
                    ->alignment('center'),
            ])
            ->filters([
                SelectFilter::make('is_active')
                    ->label('Trạng thái')
                    ->options([
                        '1' => 'Đang hoạt động',
                        '0' => 'Đã tắt',
                    ]),
            ])
            ->recordActions([
                EditAction::make()
                    ->label('Sửa')
                    ->icon('heroicon-m-pencil-square'),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('sort_order', 'asc');
    }
}
