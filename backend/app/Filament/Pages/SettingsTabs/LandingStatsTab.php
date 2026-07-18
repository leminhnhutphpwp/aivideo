<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingStatsTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_stats')
            ->label('Stats')
            ->icon('heroicon-o-chart-bar')
            ->schema([
                Section::make('Stats (Hiệu Suất)')
                    ->description('Section thứ 11 — số liệu')
                    ->columns(2)
                    ->schema([
                        TextInput::make('stats_label')->label('Label (badge)')->maxLength(50),
                        TextInput::make('stats_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('stats_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                    ]),
            ]);
    }
}
