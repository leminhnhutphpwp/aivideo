<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class LandingVisionTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_vision')
            ->label('Vision')
            ->icon('heroicon-o-eye')
            ->schema([
                Section::make('Vision (Điều Khiển)')
                    ->description('Section thứ 12')
                    ->columns(2)
                    ->schema([
                        TextInput::make('vision_label')->label('Label')->maxLength(50),
                        TextInput::make('vision_title_line1')->label('Tiêu đề dòng 1')->maxLength(100),
                        TextInput::make('vision_title_line2')->label('Tiêu đề dòng 2 (accent)')->maxLength(100),
                        Textarea::make('vision_description_p1')->label('Mô tả đoạn 1')->rows(3)->maxLength(300)->columnSpanFull(),
                        Textarea::make('vision_description_p2')->label('Mô tả đoạn 2')->rows(3)->maxLength(300)->columnSpanFull(),
                    ]),
            ]);
    }
}
