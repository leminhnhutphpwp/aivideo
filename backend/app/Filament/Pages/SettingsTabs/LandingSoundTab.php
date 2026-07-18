<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingSoundTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_sound')
            ->label('Sound')
            ->icon('heroicon-o-musical-note')
            ->schema([
                Section::make('Sound (Trải Nghiệm Âm Thanh)')
                    ->description('Section thứ 9')
                    ->columns(2)
                    ->schema([
                        TextInput::make('sound_label')->label('Label')->maxLength(50),
                        TextInput::make('sound_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('sound_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                    ]),
            ]);
    }
}
