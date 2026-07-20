<?php

namespace App\Filament\Resources\CouponEvents\Tables;

use Filament\Actions\ActionGroup;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class CouponEventsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label('Tên')
                    ->searchable()
                    ->weight('bold'),
                TextColumn::make('slug')
                    ->label('Slug')
                    ->searchable()
                    ->copyable()
                    ->toggleable(),
                TextColumn::make('reward_type')
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
                TextColumn::make('reward_value')
                    ->label('Giá trị')
                    ->formatStateUsing(fn ($state, $record) => match ($record->reward_type) {
                        'percent' => $state . '%',
                        'fixed' => number_format($state) . '₫',
                        default => number_format($state) . ' cr',
                    }),
                TextColumn::make('claims_count')
                    ->label('Đã nhận')
                    ->formatStateUsing(fn ($state, $record) => $state . ' / ' . ($record->max_claims ?? '∞')),
                TextColumn::make('trigger')
                    ->label('Kích hoạt')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'manual' => 'gray',
                        'signup' => 'info',
                        'birthday' => 'warning',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'manual' => 'Thủ công',
                        'signup' => 'Đăng ký',
                        'birthday' => 'Sinh nhật',
                        default => $state,
                    }),
                ToggleColumn::make('is_active')
                    ->label('Kích hoạt'),
                TextColumn::make('ends_at')
                    ->label('Kết thúc')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('Không kết thúc')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('reward_type')
                    ->label('Loại phần thưởng')
                    ->options([
                        'credits' => 'Tặng credits',
                        'percent' => 'Giảm %',
                        'fixed' => 'Giảm cố định',
                    ]),
                TernaryFilter::make('is_active')->label('Kích hoạt'),
                SelectFilter::make('trigger')
                    ->label('Cách kích hoạt')
                    ->options([
                        'manual' => 'Thủ công',
                        'signup' => 'Đăng ký',
                        'birthday' => 'Sinh nhật',
                    ]),
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
