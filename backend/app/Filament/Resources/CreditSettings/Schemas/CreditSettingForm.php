<?php

namespace App\Filament\Resources\CreditSettings\Schemas;

use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Schema;

class CreditSettingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Tabs::make('credit_setting_tabs')
                    ->columnSpanFull()
                    ->tabs([
                        Tabs\Tab::make('Thông tin chung')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('key')
                                            ->label('Mã cấu hình')
                                            ->required()
                                            ->maxLength(100)
                                            ->disabled(fn ($record) => $record !== null)
                                            ->hint('Ví dụ: exchange_rate, min_purchase_amount'),
                                        TextInput::make('label')
                                            ->label('Nhãn hiển thị')
                                            ->required()
                                            ->maxLength(255)
                                            ->hint('Hiển thị trong admin panel'),
                                        Textarea::make('description')
                                            ->label('Mô tả')
                                            ->rows(3)
                                            ->columnSpanFull()
                                            ->hint('Mô tả chi tiết cách sử dụng'),
                                    ]),
                            ]),
                        Tabs\Tab::make('Giá trị')
                            ->icon('heroicon-o-currency-dollar')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('value')
                                            ->label('Giá trị')
                                            ->required()
                                            ->numeric()
                                            ->step(0.000001)
                                            ->hint('Giá trị quy đổi hoặc cấu hình'),
                                        TextInput::make('unit')
                                            ->label('Đơn vị')
                                            ->placeholder('VNĐ, credits, seconds...')
                                            ->maxLength(50)
                                            ->hint('Ví dụ: VNĐ, credits, %'),
                                    ]),
                            ]),
                        Tabs\Tab::make('Hiển thị')
                            ->icon('heroicon-o-eye')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->default(true)
                                            ->helperText('Tắt để vô hiệu hóa cấu hình này'),
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự sắp xếp')
                                            ->numeric()
                                            ->default(0)
                                            ->hint('Số nhỏ sẽ hiển thị trước'),
                                    ]),
                            ]),
                    ]),
            ]);
    }
}
