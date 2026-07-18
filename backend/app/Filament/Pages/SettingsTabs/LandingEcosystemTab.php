<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingEcosystemTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_ecosystem')
            ->label('Ecosystem')
            ->icon('heroicon-o-square-3-stack-3d')
            ->schema([
                Section::make('Ecosystem (Hệ Sinh Thái)')
                    ->description('Section thứ 10')
                    ->columns(2)
                    ->schema([
                        TextInput::make('ecosystem_label')->label('Label')->maxLength(50),
                        TextInput::make('ecosystem_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('ecosystem_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('ecosystem_subtitle')->label('Mô tả')->rows(3)->maxLength(300)->columnSpanFull(),
                    ]),
            ]);
    }
}
