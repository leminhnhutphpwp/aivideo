<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Awcodes\Curator\Components\Forms\CuratorPicker;

class SeoTab
{
    public static function make(): Tab
    {
        return Tab::make('seo')
            ->label('SEO')
            ->icon('heroicon-o-globe-alt')
            ->schema([
                \Filament\Schemas\Components\Section::make('SEO & Meta Tags')
                    ->description('Tiêu đề, mô tả, từ khoá xuất hiện trên Google, Facebook, Twitter khi chia sẻ.')
                    ->columns(2)
                    ->schema([
                        TextInput::make('seo_title')
                            ->label('Tiêu đề SEO (title)')
                            ->placeholder('Horizon AI - Tạo Video AI Chuyên Nghiệp')
                            ->maxLength(120)
                            ->columnSpanFull(),
                        Textarea::make('seo_description')
                            ->label('Mô tả SEO (description)')
                            ->placeholder('Nền tảng tạo video AI chuyên nghiệp. Tạo phim điện ảnh, video marketing...')
                            ->rows(3)
                            ->maxLength(500)
                            ->columnSpanFull(),
                        TextInput::make('seo_keywords')
                            ->label('Từ khoá (keywords)')
                            ->placeholder('tạo video AI, video AI, sản xuất phim AI, text to video')
                            ->helperText('Phân cách bằng dấu phẩy')
                            ->columnSpanFull(),
                        CuratorPicker::make('seo_og_image')
                            ->label('Ảnh OG (Open Graph / Facebook / Twitter)')
                            ->buttonLabel('Chọn ảnh')
                            ->preserveFilenames()
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}
