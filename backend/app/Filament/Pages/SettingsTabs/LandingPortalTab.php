<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingPortalTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_portal')
            ->label('Portal')
            ->icon('heroicon-o-arrow-right-circle')
            ->schema([
                Section::make('Portal (CTA cuối trang)')
                    ->description('Section áp chót — kêu gọi hành động')
                    ->columns(2)
                    ->schema([
                        Textarea::make('portal_label_texts')->label('Label morph (phân cách bằng /)')->rows(2)->maxLength(300)->columnSpanFull(),
                        TextInput::make('portal_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('portal_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('portal_subtitle')->label('Mô tả')->rows(2)->maxLength(300)->columnSpanFull(),
                        TextInput::make('portal_cta_text')->label('Text nút CTA')->maxLength(50),
                        TextInput::make('portal_login_text')->label('Text "Đã có tài khoản?"')->maxLength(100),
                        TextInput::make('portal_login_label')->label('Text nút Đăng nhập')->maxLength(50),
                    ]),
            ]);
    }
}
