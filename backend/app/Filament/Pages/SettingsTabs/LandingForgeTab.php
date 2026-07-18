<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingForgeTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_forge')
            ->label('Forge')
            ->icon('heroicon-o-swatch')
            ->schema([
                Section::make('Forge (Style Engine)')
                    ->description('Section thứ 5 — chọn phong cách')
                    ->columns(2)
                    ->schema([
                        TextInput::make('forge_label')->label('Label')->maxLength(50),
                        TextInput::make('forge_cta_text')->label('Text nút CTA')->maxLength(50),
                    ]),
            ]);
    }
}
