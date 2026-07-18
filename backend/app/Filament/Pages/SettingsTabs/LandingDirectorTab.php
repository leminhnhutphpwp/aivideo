<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingDirectorTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_director')
            ->label('Director')
            ->icon('heroicon-o-command-line')
            ->schema([
                Section::make('Director (Master Control)')
                    ->description('Section thứ 7 — điều khiển sáng tạo')
                    ->columns(2)
                    ->schema([
                        TextInput::make('director_label')->label('Label')->maxLength(50),
                        TextInput::make('director_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('director_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('director_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                    ]),
            ]);
    }
}
