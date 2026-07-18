<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Forms;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;
use Awcodes\Curator\Components\Forms\CuratorPicker;

class WebsiteTab
{
    public static function make(): Tab
    {
        $timezones = collect(timezone_identifiers_list())->mapWithKeys(fn($tz) => [$tz => $tz])->toArray();

        return Tab::make('website')
            ->label('Thông tin website')
            ->icon('heroicon-o-globe-alt')
            ->schema([
                \Filament\Schemas\Components\Section::make('Thông tin website')
                    ->columns(3)
                    ->schema([
                        Forms\Components\Placeholder::make('app_url')
                            ->label('Địa chỉ trang web (URL)')
                            ->content(config('app.url'))
                            ->helperText('Đường dẫn lấy tự động từ file .env.')
                            ->columnSpan(1),
                        TextInput::make('site_name')
                            ->label('Tên Website')
                            ->required()
                            ->maxLength(255)
                            ->columnSpan(2),
                        Textarea::make('site_description')
                            ->label('Dòng mô tả')
                            ->rows(5)
                            ->maxLength(500)
                            ->columnSpan(2),
                        CuratorPicker::make('site_favicon')
                            ->label('Favicon / Logo')
                            ->columnSpan(1),
                        TextInput::make('admin_email')
                            ->label('Email Quản trị')
                            ->email()
                            ->afterStateHydrated(function (TextInput $component, $state) {
                                if (empty($state)) {
                                    $component->state(\App\Models\User::role('super_admin')->first()?->email ?? \App\Models\User::first()?->email);
                                }
                            })
                            ->maxLength(255)
                            ->columnSpan(2),
                        Toggle::make('site_active')
                            ->label('Kích hoạt Website')
                            ->inline(false)
                            ->columnSpan(1),
                    ]),
                \Filament\Schemas\Components\Section::make('Định dạng Khu vực')
                    ->columns(3)
                    ->schema([
                        Select::make('timezone')
                            ->label('Múi giờ')
                            ->options($timezones)
                            ->searchable()
                            ->required(),
                        TextInput::make('date_format')
                            ->label('Định dạng ngày')
                            ->required(),
                        TextInput::make('time_format')
                            ->label('Định dạng giờ')
                            ->required(),
                    ]),
            ]);
    }
}
