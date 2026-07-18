<?php

namespace App\Filament\Resources\StoryboardResource\Schemas;

use App\Models\Storyboard;
use App\Models\VideoType;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class StoryboardForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Components\Tabs::make('storyboard_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin chung')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Section::make('Thông tin cơ bản')
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('title')
                                            ->label('Tiêu đề')
                                            ->required()
                                            ->maxLength(255),
                                        Select::make('video_type')
                                            ->label('Loại video')
                                            ->options(fn () => VideoType::where('is_active', true)->pluck('name', 'code')->toArray())
                                            ->required()
                                            ->default('ugc_review'),
                                        Select::make('quality_tier')
                                            ->label('Chất lượng')
                                            ->options(fn () => \App\Models\Plan::all()->mapWithKeys(fn($p) => [$p->getQualityTierCode() => ucfirst($p->getQualityTierCode())])->toArray())
                                            ->required()
                                            ->default('standard'),
                                        Select::make('voice_mood')
                                            ->label('Giọng đọc/Mood')
                                            ->options([
                                                'energetic' => 'Năng động',
                                                'calm' => 'Bình tĩnh',
                                                'professional' => 'Chuyên nghiệp',
                                                'friendly' => 'Thân thiện',
                                                'dramatic' => 'Kịch tính',
                                            ])
                                            ->nullable(),
                                        Textarea::make('description')
                                            ->label('Mô tả')
                                            ->columnSpanFull()
                                            ->rows(3),
                                        Select::make('status')
                                            ->label('Trạng thái')
                                            ->options([
                                                'draft' => 'Nháp',
                                                'analyzing' => 'Đang phân tích',
                                                'analyzed' => 'Đã phân tích',
                                                'rendering' => 'Đang render',
                                                'completed' => 'Hoàn thành',
                                                'failed' => 'Thất bại',
                                                'cancelled' => 'Đã huỷ',
                                            ])
                                            ->required()
                                            ->default('draft')
                                            ->visible(fn (?Storyboard $record) => $record !== null),
                                    ]),
                            ]),
                        Components\Tabs\Tab::make('Style Guide')
                            ->icon('heroicon-o-paint-brush')
                            ->schema([
                                Section::make('Cấu hình style')
                                    ->schema([
                                        KeyValue::make('style_guide')
                                            ->label('Cấu hình style')
                                            ->keyLabel('Thuộc tính')
                                            ->valueLabel('Giá trị')
                                            ->columnSpanFull()
                                            ->hint('VD: colors=#FF6B35,#FFFFFF, mood=lifestyle, lighting=natural'),
                                    ]),
                            ]),
                        Components\Tabs\Tab::make('Cảnh')
                            ->icon('heroicon-o-film')
                            ->schema([
                                Section::make('Danh sách cảnh')
                                    ->schema([
                                        Repeater::make('scenes')
                                            ->relationship('scenes')
                                            ->orderColumn('scene_number')
                                            ->reorderable()
                                            ->cloneable()
                                            ->collapsible()
                                            ->collapsed(false)
                                            ->grid(1)
                                            ->defaultItems(1)
                                            ->minItems(2)
                                            ->maxItems(20)
                                            ->itemLabel(fn (array $state): ?string => "Cảnh " . ($state['scene_number'] ?? '?'))
                                            ->schema([
                                                Textarea::make('prompt')
                                                    ->label('Prompt')
                                                    ->required()
                                                    ->rows(2)
                                                    ->hint('Mô tả cảnh quay chi tiết'),
                                                TextInput::make('duration_seconds')
                                                    ->label('Thời lượng (giây)')
                                                    ->numeric()
                                                    ->required()
                                                    ->default(5)
                                                    ->minValue(3)
                                                    ->maxValue(30),
                                                Select::make('camera_movement')
                                                    ->label('Chuyển động camera')
                                                    ->options([
                                                        'dolly' => 'Dolly (tiến/lùi)',
                                                        'tracking' => 'Tracking (di chuyển theo)',
                                                        'pan' => 'Pan (xoay ngang)',
                                                        'tilt' => 'Tilt (xoay dọc)',
                                                        'zoom' => 'Zoom (phóng to/thu nhỏ)',
                                                        'fixed' => 'Cố định',
                                                    ])
                                                    ->nullable(),
                                                Select::make('lighting')
                                                    ->label('Ánh sáng')
                                                    ->options([
                                                        'natural' => 'Tự nhiên',
                                                        'golden_hour' => 'Giờ vàng',
                                                        'studio' => 'Studio',
                                                        'neon' => 'Neon',
                                                        'dramatic' => 'Kịch tính',
                                                        'soft' => 'Mềm',
                                                    ])
                                                    ->nullable(),
                                                Select::make('aspect_ratio')
                                                    ->label('Tỷ lệ khung hình')
                                                    ->options([
                                                        '16:9' => '16:9 (Ngang)',
                                                        '9:16' => '9:16 (Dọc - Shorts/Reels)',
                                                        '1:1' => '1:1 (Vuông)',
                                                        '4:3' => '4:3 (Cổ điển)',
                                                    ])
                                                    ->required()
                                                    ->default('16:9'),
                                                Select::make('resolution')
                                                    ->label('Độ phân giải')
                                                    ->options([
                                                        '720p' => 'HD 720p',
                                                        '1080p' => 'Full HD 1080p',
                                                    ])
                                                    ->required()
                                                    ->default('720p'),
                                            ]),
                                    ]),
                            ]),
                        Components\Tabs\Tab::make('References')
                            ->icon('heroicon-o-photo')
                            ->schema([
                                Section::make('Tài liệu tham khảo')
                                    ->schema([
                                        Repeater::make('references')
                                            ->relationship('references')
                                            ->orderColumn('sort_order')
                                            ->reorderable()
                                            ->cloneable()
                                            ->collapsible()
                                            ->grid(1)
                                            ->defaultItems(1)
                                            ->itemLabel(fn (array $state): ?string => "{$state['type']} - {$state['description']}")
                                            ->schema([
                                                Select::make('type')
                                                    ->label('Loại')
                                                    ->options([
                                                        'character' => 'Nhân vật',
                                                        'product' => 'Sản phẩm',
                                                        'background' => 'Bối cảnh',
                                                    ])
                                                    ->required(),
                                                TextInput::make('media_path')
                                                    ->label('Đường dẫn file')
                                                    ->required()
                                                    ->hint('Path đến file ảnh tham khảo'),
                                                Textarea::make('description')
                                                    ->label('Mô tả')
                                                    ->rows(2)
                                                    ->hint('Mô tả chi tiết về reference này'),
                                            ]),
                                    ]),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }
}
