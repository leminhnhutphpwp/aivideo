<?php

namespace App\Filament\Resources\CouponEvents\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class CouponEventForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Components\Tabs::make('coupon_event_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin')
                            ->icon('heroicon-o-megaphone')
                            ->schema([
                                Components\Section::make('Sự kiện')
                                    ->schema([
                                        TextInput::make('name')
                                            ->label('Tên sự kiện')
                                            ->required()
                                            ->maxLength(255),
                                        TextInput::make('slug')
                                            ->label('Slug')
                                            ->required()
                                            ->maxLength(255)
                                            ->unique(ignoreRecord: true)
                                            ->helperText('Định danh dùng trong URL/API. Tự chuẩn hoá khi lưu.'),
                                        Textarea::make('description')
                                            ->label('Mô tả')
                                            ->rows(2)
                                            ->maxLength(1000)
                                            ->columnSpanFull(),
                                    ])->columns(2),
                                Components\Section::make('Trạng thái')
                                    ->schema([
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->default(true)
                                            ->helperText('Tắt để dừng sự kiện ngay lập tức.'),
                                        Toggle::make('is_public')
                                            ->label('Công khai')
                                            ->default(true)
                                            ->helperText('Hiện trong danh sách sự kiện cho user nhận.'),
                                        Select::make('trigger')
                                            ->label('Cách kích hoạt')
                                            ->required()
                                            ->default('manual')
                                            ->options([
                                                'manual' => 'Thủ công (user bấm nhận)',
                                                'signup' => 'Tự động khi đăng ký',
                                                'birthday' => 'Tự động vào sinh nhật',
                                            ])
                                            ->helperText('Đăng ký / sinh nhật là tự động (user không cần thao tác) và chỉ áp dụng cho phần thưởng "Tặng credits".'),
                                        Toggle::make('require_verified')
                                            ->label('Yêu cầu xác thực email')
                                            ->helperText('User phải xác thực email mới nhận được mã.'),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Phần thưởng')
                            ->icon('heroicon-o-banknotes')
                            ->schema([
                                Components\Section::make('Phần thưởng mỗi mã')
                                    ->schema([
                                        Select::make('reward_type')
                                            ->label('Loại phần thưởng')
                                            ->required()
                                            ->default('credits')
                                            ->live()
                                            ->options([
                                                'credits' => 'Tặng credits',
                                                'percent' => 'Giảm giá %',
                                                'fixed' => 'Giảm số tiền cố định',
                                            ]),
                                        TextInput::make('reward_value')
                                            ->label('Giá trị')
                                            ->required()
                                            ->numeric()
                                            ->minValue(1)
                                            ->helperText('Credits → số credits. Giảm % → phần trăm. Giảm cố định → VNĐ.'),
                                        TextInput::make('max_discount')
                                            ->label('Trần giảm tối đa (VNĐ)')
                                            ->numeric()
                                            ->suffix('₫')
                                            ->visible(fn (Get $get) => $get('reward_type') === 'percent')
                                            ->helperText('Chỉ cho giảm %: số tiền giảm tối đa.'),
                                        TextInput::make('min_purchase_amount')
                                            ->label('Đơn tối thiểu (VNĐ)')
                                            ->numeric()
                                            ->suffix('₫')
                                            ->visible(fn (Get $get) => in_array($get('reward_type'), ['percent', 'fixed'], true))
                                            ->helperText('Chỉ cho mã giảm giá: đơn nạp phải ≥ mức này.'),
                                        TextInput::make('code_prefix')
                                            ->label('Tiền tố mã')
                                            ->maxLength(32)
                                            ->helperText('VD: "TET" → mã sẽ dạng TET-XXXXXXXX. Để trống = không tiền tố.'),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Giới hạn & hiệu lực')
                            ->icon('heroicon-o-clock')
                            ->schema([
                                Components\Section::make('Giới hạn')
                                    ->schema([
                                        TextInput::make('max_claims')
                                            ->label('Tổng lượt nhận tối đa')
                                            ->numeric()
                                            ->minValue(1)
                                            ->helperText('Tổng số mã có thể phát ra. Để trống = không giới hạn.'),
                                        TextInput::make('per_user_uses')
                                            ->label('Số lần dùng / mã')
                                            ->required()
                                            ->numeric()
                                            ->minValue(1)
                                            ->default(1)
                                            ->helperText('Mỗi mã user nhận được dùng tối đa bao nhiêu lần.'),
                                        TextInput::make('code_valid_days')
                                            ->label('Số ngày hiệu lực của mã')
                                            ->numeric()
                                            ->minValue(1)
                                            ->helperText('Mã hết hạn sau N ngày kể từ khi nhận. Để trống = theo ngày kết thúc sự kiện.'),
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự sắp xếp')
                                            ->numeric()
                                            ->default(0),
                                    ])->columns(2),
                                Components\Section::make('Thời gian sự kiện')
                                    ->schema([
                                        DateTimePicker::make('starts_at')
                                            ->label('Bắt đầu')
                                            ->helperText('Để trống = có hiệu lực ngay.'),
                                        DateTimePicker::make('ends_at')
                                            ->label('Kết thúc')
                                            ->helperText('Để trống = không kết thúc.'),
                                    ])->columns(2),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }
}
