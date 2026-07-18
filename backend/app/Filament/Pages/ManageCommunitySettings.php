<?php

namespace App\Filament\Pages;

use App\Settings\CommunitySettings;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\SettingsPage;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;

class ManageCommunitySettings extends SettingsPage
{
    protected static \BackedEnum | string | null $navigationIcon = 'heroicon-o-globe-alt';

    protected static string $settings = CommunitySettings::class;

    public static function getNavigationLabel(): string
    {
        return 'Cộng đồng';
    }

    public static function getNavigationGroup(): ?string
    {
        return 'Cấu hình hệ thống';
    }

    public function getTitle(): string
    {
        return 'Cấu hình Cộng đồng';
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Tabs::make('CommunityTabs')
                    ->columnSpanFull()
                    ->tabs([
                        Tab::make('payout')
                            ->label('Trả phí Creator')
                            ->schema([
                                Section::make('Cấu hình trả phí')
                                    ->schema([
                                        TextInput::make('creator_payout_percent')
                                            ->label('Phần trăm trả cho Creator (%)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->maxValue(100)
                                            ->required()
                                            ->helperText('Admin trả % credits gốc cho creator khi publish asset Public. 0 = không trả.'),
                                    ]),
                            ]),
                        Tab::make('trending')
                            ->label('Trending')
                            ->schema([
                                Section::make('Trọng số Trending')
                                    ->schema([
                                        TextInput::make('like_weight')
                                            ->label('Trọng số Like')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('view_weight')
                                            ->label('Trọng số View')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('trending_limit')
                                            ->label('Số lượng Top Assets')
                                            ->numeric()
                                            ->minValue(1)
                                            ->maxValue(100)
                                            ->required(),
                                        TextInput::make('top_creators_limit')
                                            ->label('Số lượng Top Creators')
                                            ->numeric()
                                            ->minValue(1)
                                            ->maxValue(100)
                                            ->required(),
                                    ])->columns(4),
                            ]),
                        Tab::make('limits')
                            ->label('Giới hạn Publish')
                            ->schema([
                                Section::make('Giới hạn publish mỗi ngày')
                                    ->schema([
                                        TextInput::make('pro_publish_limit')
                                            ->label('Pro (lần/ngày)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('studio_publish_limit')
                                            ->label('Studio (lần/ngày)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                    ])->columns(4),
                            ]),
                        Tab::make('reputation')
                            ->label('Cấp bậc uy tín')
                            ->schema([
                                Section::make('Trọng số tính điểm')
                                    ->schema([
                                        TextInput::make('rep_pub_weight')
                                            ->label('Trọng số đã publish')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('rep_like_weight')
                                            ->label('Trọng số total likes')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('rep_usage_weight')
                                            ->label('Trọng số lượt dùng')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                        TextInput::make('rep_age_weight')
                                            ->label('Trọng số tuổi tài khoản')
                                            ->numeric()
                                            ->minValue(0)
                                            ->required(),
                                    ])->columns(4),
                                Section::make('Ngưỡng cấp bậc')
                                    ->schema([
                                        KeyValue::make('rep_thresholds')
                                            ->label('Ngưỡng (level => điểm tối thiểu)')
                                            ->keyLabel('Level')
                                            ->valueLabel('Điểm tối thiểu')
                                            ->addable(false)
                                            ->deletable(false)
                                            ->editableKeys(false)
                                            ->required(),
                                    ]),
                            ]),
                    ]),
            ]);
    }

    public function save(): void
    {
        parent::save();

        Notification::make()
            ->title('Đã lưu cấu hình Cộng đồng')
            ->success()
            ->send();
    }
}
