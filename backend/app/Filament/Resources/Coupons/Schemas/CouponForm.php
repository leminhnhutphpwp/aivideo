<?php

namespace App\Filament\Resources\Coupons\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class CouponForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Components\Tabs::make('coupon_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin mã')
                            ->icon('heroicon-o-ticket')
                            ->schema([
                                Components\Section::make('Mã & loại')
                                    ->schema([
                                        TextInput::make('code')
                                            ->label('Mã coupon')
                                            ->required()
                                            ->maxLength(64)
                                            ->unique(ignoreRecord: true)
                                            ->default(fn () => strtoupper(Str::random(8)))
                                            ->helperText('Tự động viết HOA khi lưu. Bấm tạo mới để dùng mã ngẫu nhiên.'),
                                        Select::make('type')
                                            ->label('Loại mã')
                                            ->required()
                                            ->default('credits')
                                            ->options([
                                                'credits' => 'Tặng credits (user nhập → nhận credits)',
                                                'percent' => 'Giảm giá % (khi mua gói nạp)',
                                                'fixed' => 'Giảm số tiền cố định (khi mua gói nạp)',
                                            ])
                                            ->helperText('Mã tặng credits: đổi trực tiếp. Mã giảm giá: áp khi mua gói nạp.'),
                                        Textarea::make('description')
                                            ->label('Ghi chú (nội bộ)')
                                            ->rows(2)
                                            ->maxLength(255)
                                            ->columnSpanFull(),
                                    ])->columns(2),
                                Components\Section::make('Trạng thái')
                                    ->schema([
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->default(true)
                                            ->helperText('Tắt để vô hiệu hoá mã ngay lập tức.'),
                                        Toggle::make('is_welcome')
                                            ->label('Mã chào mừng tự động')
                                            ->helperText('Nếu bật (chỉ nên 1 mã loại "tặng credits"): tự cấp cho user khi xác thực email / đăng nhập Google lần đầu.'),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Giá trị & giảm giá')
                            ->icon('heroicon-o-banknotes')
                            ->schema([
                                Components\Section::make('Giá trị')
                                    ->schema([
                                        TextInput::make('value')
                                            ->label('Giá trị')
                                            ->required()
                                            ->numeric()
                                            ->minValue(1)
                                            ->helperText('Tặng credits → số credits. Giảm % → phần trăm (1–100). Giảm cố định → số tiền VNĐ.'),
                                        TextInput::make('max_discount')
                                            ->label('Trần giảm tối đa (VNĐ)')
                                            ->numeric()
                                            ->suffix('₫')
                                            ->helperText('Chỉ cho mã giảm %: số tiền giảm tối đa. Để trống = không giới hạn.'),
                                        TextInput::make('min_purchase_amount')
                                            ->label('Đơn tối thiểu (VNĐ)')
                                            ->numeric()
                                            ->suffix('₫')
                                            ->helperText('Chỉ cho mã giảm giá: đơn nạp phải ≥ mức này. Để trống = không yêu cầu.'),
                                    ])->columns(3),
                            ]),
                        Components\Tabs\Tab::make('Giới hạn & hiệu lực')
                            ->icon('heroicon-o-clock')
                            ->schema([
                                Components\Section::make('Giới hạn lượt dùng')
                                    ->schema([
                                        TextInput::make('max_uses')
                                            ->label('Tổng lượt tối đa')
                                            ->numeric()
                                            ->minValue(1)
                                            ->helperText('Tổng số lần mã được dùng. Để trống = không giới hạn.'),
                                        TextInput::make('max_uses_per_user')
                                            ->label('Tối đa / user')
                                            ->required()
                                            ->numeric()
                                            ->minValue(1)
                                            ->default(1)
                                            ->helperText('Mỗi user được dùng tối đa bao nhiêu lần.'),
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự sắp xếp')
                                            ->numeric()
                                            ->default(0),
                                    ])->columns(3),
                                Components\Section::make('Thời gian hiệu lực')
                                    ->schema([
                                        DateTimePicker::make('starts_at')
                                            ->label('Bắt đầu')
                                            ->helperText('Để trống = có hiệu lực ngay.'),
                                        DateTimePicker::make('expires_at')
                                            ->label('Hết hạn')
                                            ->helperText('Để trống = không hết hạn.'),
                                    ])->columns(2),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }
}
