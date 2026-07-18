<?php

namespace App\Filament\Resources\ResolutionPricings\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Schema;

class ResolutionPricingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Tabs::make('resolution_pricing_tabs')
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
                                            ->hint('Ví dụ: hd_720p, full_hd_1080p, uhd_4k'),
                                        TextInput::make('name')
                                            ->label('Tên')
                                            ->required()
                                            ->hint('Ví dụ: HD 720p, Full HD 1080p'),
                                        TextInput::make('width')
                                            ->label('Chiều rộng (px)')
                                            ->required()
                                            ->numeric(),
                                        TextInput::make('height')
                                            ->label('Chiều cao (px)')
                                            ->required()
                                            ->numeric(),
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
                                            ->hint('Nhân với credits cơ bản theo độ phân giải'),
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
