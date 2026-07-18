<?php

namespace App\Filament\Resources\WhitelistIps\Schemas;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class WhitelistIpForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Chi tiết IP')
                    ->icon('heroicon-o-information-circle')
                    ->columns(['md' => 2])
                    ->columnSpanFull()
                    ->schema([
                        TextInput::make('ip_address')
                            ->label('Địa chỉ IP')
                            ->required()
                            ->maxLength(45)
                            ->placeholder('VD: 192.168.1.1'),
                        Textarea::make('reason')
                            ->label('Lý do')
                            ->rows(2)
                            ->placeholder('Tại sao IP này được cho phép?')
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}
