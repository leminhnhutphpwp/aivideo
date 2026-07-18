<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Awcodes\Curator\Components\Forms\CuratorPicker;

class AuthBackgroundTab
{
    public static function make(): Tab
    {
        return Tab::make('auth_bg')
            ->label('Auth Background')
            ->icon('heroicon-o-lock-closed')
            ->schema([
                \Filament\Schemas\Components\Section::make('Nền trang đăng nhập / đăng ký')
                    ->description('Hình nền hoặc video hiển thị bên phải của các trang đăng nhập, đăng ký, quên mật khẩu.')
                    ->schema([
                        CuratorPicker::make('auth_bg_media_id')
                            ->label('Chọn hình nền hoặc video')
                            ->buttonLabel('Chọn media')
                            ->preserveFilenames()
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}
