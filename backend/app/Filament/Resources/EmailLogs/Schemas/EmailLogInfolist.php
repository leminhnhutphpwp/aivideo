<?php

namespace App\Filament\Resources\EmailLogs\Schemas;

use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class EmailLogInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                \Filament\Schemas\Components\Section::make('Thông tin chung')
                    ->columns(['md' => 2])
                    ->components([
                        TextEntry::make('to')
                            ->label('Người nhận'),
                        TextEntry::make('created_at')
                            ->label('Thời gian gửi')
                            ->dateTime()
                            ->placeholder('-'),
                        TextEntry::make('status')
                            ->label('Trạng thái')
                            ->badge()
                            ->color(fn ($state) => $state === 'sent' ? 'success' : 'danger'),
                        TextEntry::make('subject')
                            ->label('Tiêu đề')
                            ->columnSpanFull(),
                    ]),
                \Filament\Schemas\Components\Section::make('Nội dung Email')
                    ->components([
                        TextEntry::make('body')
                            ->label('Nội dung')
                            ->html()
                            ->columnSpanFull(),
                    ]),
                \Filament\Schemas\Components\Section::make('Chi tiết Lỗi')
                    ->components([
                        TextEntry::make('error_message')
                            ->label('Mã báo lỗi thực tế')
                            ->placeholder('-')
                            ->columnSpanFull(),
                    ])->visible(fn ($record) => !empty($record->error_message)),
            ]);
    }
}
