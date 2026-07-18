<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingHeroTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_hero')
            ->label('Hero')
            ->icon('heroicon-o-play')
            ->schema([
                Section::make('Hero Section')
                    ->description('Section đầu tiên của landing page')
                    ->columns(2)
                    ->schema([
                        TextInput::make('hero_label')->label('Label (badge)')->maxLength(50),
                        TextInput::make('hero_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('hero_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('hero_subtitle')->label('Mô tả')->rows(2)->maxLength(300)->columnSpanFull(),
                        TextInput::make('hero_cta_text')->label('Text nút CTA')->maxLength(50),
                        TextInput::make('hero_cta_url')->label('Link nút CTA')->maxLength(255),
                        Textarea::make('hero_typewriter_words')->label('Typewriter words (phân cách bằng dấu phẩy)')->rows(2)->maxLength(200)->helperText('VD: viral, triệu view, xu hướng, đột phá')->columnSpanFull(),
                    ]),
            ]);
    }
}
