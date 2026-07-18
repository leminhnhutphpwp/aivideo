<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingIntroTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_intro')
            ->label('Intro')
            ->icon('heroicon-o-megaphone')
            ->schema([
                Section::make('Intro (Social Video Automation)')
                    ->description('Section thứ 3 — giới thiệu tính năng')
                    ->columns(2)
                    ->schema([
                        TextInput::make('intro_label')->label('Label (badge)')->maxLength(50),
                        TextInput::make('intro_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('intro_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('intro_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                        Textarea::make('intro_features')->label('Feature pills (phân cách bằng |)')->rows(2)->maxLength(300)->helperText('VD: Tự động tạo script viral | Sinh hook cuốn hút | Tăng 10x engagement')->columnSpanFull(),
                    ]),
            ]);
    }
}
