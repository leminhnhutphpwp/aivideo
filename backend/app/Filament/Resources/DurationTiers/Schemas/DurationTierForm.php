<?php

namespace App\Filament\Resources\DurationTiers\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Schema;

class DurationTierForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Tabs::make('duration_tier_tabs')
                    ->columnSpanFull()
                    ->tabs([
                        Tabs\Tab::make('Thông tin chung')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('code')
                                            ->label('Mã')
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->hint('Ví dụ: 3s, 5s, 10s'),
                                        TextInput::make('name')
                                            ->label('Tên')
                                            ->required()
                                            ->hint('Ví dụ: 3 giây, 5 giây'),
                                        TextInput::make('seconds')
                                            ->label('Số giây')
                                            ->required()
                                            ->numeric()
                                            ->hint('Thời lượng tính bằng giây'),
                                    ]),
                            ]),
                        Tabs\Tab::make('Cấu hình giá')
                            ->icon('heroicon-o-currency-dollar')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('multiplier')
                                            ->label('Hệ số nhân')
                                            ->required()
                                            ->numeric()
                                            ->default(1.0)
                                            ->hint('Nhân với credits cơ bản của loại video'),
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự')
                                            ->required()
                                            ->numeric()
                                            ->default(0),
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->required()
                                            ->columnSpanFull(),
                                    ]),
                            ]),
                    ]),
            ]);
    }
}
