<?php

namespace App\Filament\Pages\SettingsTabs;

use App\Models\Asset;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Forms\Components\Select;

class HeroTab
{
    public static function make(): Tab
    {
        return Tab::make('hero')
            ->label('Hero Video')
            ->icon('heroicon-o-play-circle')
            ->schema([
                \Filament\Schemas\Components\Section::make('Video nền Hero')
                    ->description('Video nền hiển thị ở đầu trang dashboard, thay cho dòng chữ gõ tay.')
                    ->schema([
                        Select::make('hero_video_id')
                            ->label('Chọn video nền')
                            ->searchable()
                            ->placeholder('Không chọn (dùng typing text mặc định)')
                            ->options(fn () => Asset::where('type', 'video')
                                ->orderBy('created_at', 'desc')
                                ->get()
                                ->mapWithKeys(fn ($a) => [
                                    $a->uuid => substr($a->original_name, 0, 40)
                                        . ' | ' . round($a->size_bytes / 1024 / 1024, 1) . 'MB'
                                        . ' | ' . $a->created_at->format('d/m/Y')
                                ])
                                ->toArray())
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}
