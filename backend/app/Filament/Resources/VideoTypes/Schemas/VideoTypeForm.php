<?php

namespace App\Filament\Resources\VideoTypes\Schemas;

use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Schema;

class VideoTypeForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Tabs::make('video_type_tabs')
                    ->columnSpanFull()
                    ->tabs([
                        Tabs\Tab::make('Thông tin chung')
                            ->icon('heroicon-o-information-circle')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('code')
                                            ->label('Mã loại')
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->hint('Ví dụ: text_to_video, image_to_video'),
                                        TextInput::make('name')
                                            ->label('Tên loại')
                                            ->required()
                                            ->hint('Ví dụ: Text to Video, Image to Video'),
                                        Textarea::make('description')
                                            ->label('Mô tả')
                                            ->columnSpanFull(),
                                        TextInput::make('icon')
                                            ->label('Icon')
                                            ->hint('Tên icon (VD: heroicon-o-video-camera)'),
                                    ]),
                            ]),
                        Tabs\Tab::make('Cấu hình giá')
                            ->icon('heroicon-o-currency-dollar')
                            ->schema([
                                Section::make()
                                    ->columns(['md' => 2])
                                    ->schema([
                                        TextInput::make('base_credits')
                                            ->label('Credits cơ bản')
                                            ->required()
                                            ->numeric()
                                            ->hint('Số credits gốc cho loại video này'),
                                        TextInput::make('sort_order')
                                            ->label('Thứ tự')
                                            ->required()
                                            ->numeric()
                                            ->default(0),
                                        Toggle::make('is_active')
                                            ->label('Kích hoạt')
                                            ->required()
                                            ->columnSpanFull(),
                                    ]),
                            ]),
                    ]),
            ]);
    }
}
