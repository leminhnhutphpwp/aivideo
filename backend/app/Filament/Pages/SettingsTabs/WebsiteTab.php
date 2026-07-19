<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms;
use Filament\Forms\Components\TextInput;
use Awcodes\Curator\Components\Forms\CuratorPicker;

class WebsiteTab
{
    public static function make(): Tab
    {
        return Tab::make('website')
            ->label('Thông tin website')
            ->icon('heroicon-o-globe-alt')
            ->schema([
                Section::make('Thông tin website')
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
                        CuratorPicker::make('site_favicon')
                            ->label('Favicon / Logo')
                            ->columnSpan(1),
                    ]),
            ]);
    }
}
