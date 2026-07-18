<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingReelTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_reel')
            ->label('Reel')
            ->icon('heroicon-o-film')
            ->schema([
                Section::make('Reel (Showreel)')
                    ->description('Section thứ 2 — video showreel')
                    ->columns(2)
                    ->schema([
                        TextInput::make('reel_label')->label('Label')->maxLength(50),
                        TextInput::make('reel_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('reel_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                    ]),
            ]);
    }
}
