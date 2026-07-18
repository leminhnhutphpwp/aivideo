<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class FooterTab
{
    public static function make(): Tab
    {
        return Tab::make('footer')
            ->label('Footer')
            ->icon('heroicon-o-bars-3-bottom-left')
            ->schema([
                Section::make('Footer')
                    ->description('Chân trang')
                    ->columns(2)
                    ->schema([
                        TextInput::make('footer_copyright')->label('Copyright')->maxLength(100)->columnSpanFull(),
                        TextInput::make('footer_privacy_url')->label('Link Privacy')->maxLength(255),
                        TextInput::make('footer_terms_url')->label('Link Terms')->maxLength(255),
                        TextInput::make('footer_contact_url')->label('Link Contact')->maxLength(255),
                    ]),
            ]);
    }
}
