<?php

namespace App\Filament\Resources\CreditPacks\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components;
use Filament\Schemas\Schema;

class CreditPackForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Components\Tabs::make('credit_pack_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin gói nạp')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Components\Section::make('Thông tin cơ bản')
                                    ->description('Tên gói và nhãn hiển thị trên giao diện người dùng')
                                    ->schema([
                                        TextInput::make('name')
                                            ->label('Tên gói')
                                            ->required()
                                            ->maxLength(255)
                                            ->helperText('Ví dụ: Gói Nhỏ, Gói Vừa, Premium'),
                                        TextInput::make('label')
                                            ->label('Nhãn hiển thị')
                                            ->maxLength(255)
                                            ->helperText('Ví dụ: Phổ biến nhất, Giá tốt nhất. Để trống nếu không cần'),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Giá & Credits')
                            ->icon('heroicon-o-banknotes')
                            ->schema([
                                Components\Section::make('Định giá')
                                    ->description('Cấu hình giá tiền và số credits nhận được')
                                    ->schema([
                                        TextInput::make('price')
                                            ->label('Giá tiền (VNĐ)')
                                            ->required()
                                            ->numeric()
                                            ->suffix('₫')
                                            ->helperText('Số tiền nạp. Ví dụ: 50000 = 50.000₫'),
                                        TextInput::make('credits')
                                            ->label('Số Credits nhận được')
                                            ->required()
                                            ->numeric()
                                            ->helperText('Số credits thực nhận. Ví dụ: 5000 = 5.000 credits'),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Cấu hình hiển thị')
                            ->icon('heroicon-o-cog-6-tooth')
                            ->schema([
                                Components\Section::make('Tuỳ chỉnh')
                                    ->description('Thứ tự sắp xếp và trạng thái kích hoạt')
                                    ->schema([
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự sắp xếp')
                                            ->required()
                                            ->numeric()
                                            ->default(0)
                                            ->helperText('Số nhỏ hiển thị trước'),
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->default(true)
                                            ->helperText('Tắt để ẩn gói nạp khỏi giao diện người dùng'),
                                    ])->columns(2),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }
}
