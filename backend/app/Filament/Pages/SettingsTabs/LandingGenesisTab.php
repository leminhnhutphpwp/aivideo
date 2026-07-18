<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingGenesisTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_genesis')
            ->label('Genesis')
            ->icon('heroicon-o-cpu-chip')
            ->schema([
                Section::make('Genesis (Cốt Lõi Công Nghệ)')
                    ->description('Section thứ 4')
                    ->columns(2)
                    ->schema([
                        TextInput::make('genesis_label')->label('Label')->maxLength(50),
                        TextInput::make('genesis_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('genesis_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                    ]),
            ]);
    }
}
