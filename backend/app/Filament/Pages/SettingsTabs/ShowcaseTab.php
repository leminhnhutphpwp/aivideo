<?php

namespace App\Filament\Pages\SettingsTabs;

use App\Models\Asset;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class ShowcaseTab
{
    public static function make(): Tab
    {
        return Tab::make('showcase')
            ->label('Showcase')
            ->icon('heroicon-o-film')
            ->schema([
                \Filament\Schemas\Components\Section::make('Danh sách Showcase')
                    ->description('Hiển thị trên trang chủ dashboard. Chọn video hoặc ảnh từ thư viện assets.')
                    ->schema([
                        Repeater::make('showcase_items')
                            ->label('')
                            ->schema([
                                Select::make('asset_id')
                                    ->label('Chọn video / ảnh')
                                    ->searchable()
                                    // Both video and image assets are selectable; the label is
                                    // prefixed with the media type so admins can tell them apart.
                                    ->options(fn () => Asset::whereIn('type', ['video', 'image'])
                                        ->orderBy('created_at', 'desc')
                                        ->get()
                                        ->mapWithKeys(fn ($a) => [
                                            $a->uuid => ($a->type === 'image' ? '🖼️ Ảnh' : '🎬 Video')
                                                . ' | ' . substr($a->original_name, 0, 34)
                                                . ' | ' . round($a->size_bytes / 1024 / 1024, 1) . 'MB'
                                                . ' | ' . $a->created_at->format('d/m/Y')
                                        ])
                                        ->toArray())
                                    ->required()
                                    ->columnSpan(2),
                                TextInput::make('title')
                                    ->label('Tiêu đề')
                                    ->required()
                                    ->maxLength(255)
                                    ->columnSpan(2),
                                Textarea::make('desc')
                                    ->label('Mô tả')
                                    ->rows(2)
                                    ->maxLength(500)
                                    ->columnSpan(2),
                                Select::make('ratio')
                                    ->label('Tỷ lệ')
                                    ->options([
                                        '16:9' => '16:9 (Ngang)',
                                        '9:16' => '9:16 (Dọc)',
                                        '1:1' => '1:1 (Vuông)',
                                        '4:3' => '4:3 (Cổ điển)',
                                    ])
                                    ->required()
                                    ->columnSpan(1),
                                Select::make('col_span')
                                    ->label('Chiều rộng')
                                    ->options([
                                        '25' => '1/4',
                                        '33' => '1/3',
                                        '50' => '1/2',
                                        '66' => '2/3',
                                        '75' => '3/4',
                                        '100' => 'Full',
                                    ])
                                    ->default('25')
                                    ->required()
                                    ->columnSpan(1),
                                Select::make('row_span')
                                    ->label('Chiều cao')
                                    ->options([
                                        '1' => 'Cơ bản',
                                        '2' => 'Gấp đôi',
                                        '3' => 'Gấp ba',
                                    ])
                                    ->default('1')
                                    ->columnSpan(1),
                                TextInput::make('duration')
                                    ->label('Thời lượng')
                                    ->placeholder('VD: 0:12')
                                    ->columnSpan(1),
                                TextInput::make('res')
                                    ->label('Độ phân giải')
                                    ->placeholder('VD: 1080p')
                                    ->columnSpan(1),
                                TextInput::make('type')
                                    ->label('Loại')
                                    ->placeholder('VD: Text-to-Video')
                                    ->columnSpan(1),
                            ])
                            ->columns(4)
                            ->addActionLabel('+ Thêm mục')
                            ->reorderable()
                            ->defaultItems(0)
                            ->collapsible()
                            ->cloneable(),
                    ]),
            ]);
    }
}
