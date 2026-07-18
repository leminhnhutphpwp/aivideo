<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingGalleryTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_gallery')
            ->label('Gallery')
            ->icon('heroicon-o-photo')
            ->schema([
                Section::make('Gallery (Phong Cách)')
                    ->description('Section thứ 8 — thư viện ảnh')
                    ->columns(2)
                    ->schema([
                        TextInput::make('gallery_label')->label('Label')->maxLength(50),
                        TextInput::make('gallery_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('gallery_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                    ]),
            ]);
    }
}
