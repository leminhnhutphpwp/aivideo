<?php

namespace App\Filament\Resources\ActivityLogs\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ActivityLogInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Thông tin chung')
                    ->columnSpanFull()
                    ->components([
                        TextEntry::make('created_at')
                            ->label('Thời gian')
                            ->dateTime(),
                        TextEntry::make('causer.name')
                            ->label('Người thực hiện')
                            ->placeholder('-'),
                        TextEntry::make('event')
                            ->label('Thao tác')
                            ->badge()
                            ->color(fn ($state) => match ($state) {
                                'created' => 'success',
                                'updated' => 'warning',
                                'deleted' => 'danger',
                                default => 'gray',
                            })
                            ->formatStateUsing(fn ($state) => match ($state) {
                                'created' => 'Tạo mới',
                                'updated' => 'Cập nhật',
                                'deleted' => 'Xóa',
                                default => $state,
                            }),
                        TextEntry::make('subject_type')
                            ->label('Đối tượng')
                            ->formatStateUsing(fn ($state) => class_basename($state)),
                        TextEntry::make('subject_id')
                            ->label('ID Đối tượng')
                            ->placeholder('-'),
                        TextEntry::make('description')
                            ->label('Mô tả')
                            ->columnSpanFull(),
                    ]),
                Section::make('Dữ liệu chi tiết (Thay đổi)')
                    ->columnSpanFull()
                    ->components([
                        TextEntry::make('properties')
                            ->label('Thuộc tính')
                            ->state(fn ($record) => $record->properties && count($record->properties->toArray()) > 0 ? json_encode($record->properties->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : '-')
                            ->columnSpanFull()
                            ->extraAttributes(['class' => 'whitespace-pre-wrap font-mono text-sm']),
                    ]),
            ]);
    }
}
