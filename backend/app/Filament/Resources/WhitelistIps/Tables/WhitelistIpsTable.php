<?php

namespace App\Filament\Resources\WhitelistIps\Tables;

use App\Models\WhitelistIp;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class WhitelistIpsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('ip_address')
                    ->label('Địa chỉ IP')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Đã copy IP'),
                TextColumn::make('reason')
                    ->label('Lý do')
                    ->searchable()
                    ->limit(40),
                TextColumn::make('creator.name')
                    ->label('Người thêm')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Thêm lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make()->label('Sửa'),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make()->label('Xóa đã chọn'),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
