<?php
namespace App\Filament\Resources;

use App\Filament\Resources\PlanResource\Pages;
use App\Models\Plan;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class PlanResource extends Resource
{
    public static function getKnownProviders(): array
    {
        $providers = config('media_providers.providers', []);
        $known = [];
        foreach ($providers as $id => $data) {
            $known[$id] = $data['label'] ?? $id;
        }
        return $known;
    }

    protected static ?string $model = Plan::class;

    protected static ?string $modelLabel = 'Gói dịch vụ';

    protected static ?string $pluralModelLabel = 'Gói dịch vụ';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-credit-card';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Components\Tabs::make('plan_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin cơ bản')
                            ->icon('heroicon-o-information-circle')
                             ->schema([
                                 Components\Section::make('Thông tin gói')
                                     ->description('Thông tin chung về gói dịch vụ')
                                     ->schema([
                                         Forms\Components\TextInput::make('name')
                                             ->label('Tên gói')
                                             ->required()
                                             ->maxLength(255),
                                         Forms\Components\TextInput::make('slug')
                                             ->label('Slug')
                                             ->required()
                                             ->unique(ignoreRecord: true)
                                             ->helperText('Ví dụ: free, pro, studio'),
                                         Forms\Components\Textarea::make('description')
                                             ->label('Mô tả')
                                             ->rows(3),

                                         Forms\Components\Select::make('status')
                                             ->label('Trạng thái')
                                             ->options([
                                                 'active' => 'Hoạt động',
                                                 'coming_soon' => 'Sắp ra mắt',
                                                 'archived' => 'Đã lưu trữ',
                                             ])
                                             ->default('active'),
                                     ])->columns(2),
                             ]),
                        Components\Tabs\Tab::make('Giá & Credits')
                            ->icon('heroicon-o-banknotes')
                            ->schema([
                                Components\Section::make('Định giá')
                                    ->schema([
                                        Forms\Components\TextInput::make('price_regular')
                                            ->label('Giá thường (VNĐ)')
                                            ->numeric()
                                            ->required()
                                            ->suffix('₫')
                                            ->helperText('Ví dụ: 149000 = 149.000₫/tháng'),
                                        Forms\Components\TextInput::make('price_sale')
                                            ->label('Giá khuyến mãi (VNĐ)')
                                            ->numeric()
                                            ->suffix('₫')
                                            ->helperText('Để trống nếu không có khuyến mãi'),
                                         Forms\Components\TextInput::make('monthly_credits')
                                            ->label('Credits/tháng')
                                            ->numeric()
                                            ->disabled()
                                            ->helperText('Tự động tính: ceil(giá × exchange_rate) + bonus_credits'),
                                         Forms\Components\TextInput::make('bonus_credits')
                                            ->label('Bonus credits')
                                            ->numeric()
                                            ->default(0)
                                            ->helperText('Tặng thêm credits (cho khuyến mãi). Ví dụ: 5000 = thêm 5.000 credits/tháng'),
                                    ])->columns(3),
                            ]),
                        Components\Tabs\Tab::make('Giới hạn')
                            ->icon('heroicon-o-shield-check')
                            ->schema([
                                 Components\Section::make('Giới hạn sử dụng')
                                     ->schema([
                                          Forms\Components\TextInput::make('max_concurrent_jobs')
                                              ->label('Số job đồng thời')
                                              ->numeric(),
                                          Forms\Components\Select::make('queue_priority')
                                              ->label('Ưu tiên queue')
                                              ->options([
                                                  'low' => 'Thấp',
                                                  'high' => 'Cao',
                                              ]),
                                          Forms\Components\TextInput::make('api_rate_limit')
                                              ->label('Giới hạn API (req/min)')
                                              ->numeric()
                                              ->default(60)
                                              ->helperText('Số request tối đa mỗi phút cho API của gói này.'),
                                      ])->columns(3),
                            ]),
                        Components\Tabs\Tab::make('Model & Provider')
                            ->icon('heroicon-o-cpu-chip')
                            ->schema([
                                Components\Section::make('Chất lượng & Model')
                                    ->schema([
                                        Forms\Components\TextInput::make('quality_multiplier')
                                            ->label('Hệ số nhân chất lượng (Quality Multiplier)')
                                            ->numeric()
                                            ->default(1.00)
                                            ->required()
                                            ->helperText('Hệ số nhân giá credits cơ bản (ví dụ: standard=1.00, premium=1.30, ultra=1.80)'),
                                         Forms\Components\Repeater::make('model_mapping')
                                             ->label('Ánh xạ Model (Model Mapping)')
                                             ->helperText('Mỗi dòng = 1 tính năng được BẬT cho gói này. Tính năng KHÔNG có trong danh sách sẽ hiển thị "Tính năng đang bảo trì" với user thuộc gói (vd: bỏ "video_editing" ⇒ bảo trì Video Editing; bỏ "image_multi_panel" ⇒ bảo trì Storyboard).')
                                             ->itemLabel(fn (array $state): ?string => isset($state['video_type_code']) ? ucfirst($state['video_type_code']) : null)
                                             ->schema([
                                                 Forms\Components\Select::make('video_type_code')
                                                     ->label('Loại Video / Capability')
                                                     ->options(function () {
                                                         $videoTypes = \App\Models\VideoType::active()
                                                             ->orderBy('sort_order')
                                                             ->pluck('name', 'code')
                                                             ->toArray();
                                                         return array_merge(['default' => 'Mặc định (Default)'], $videoTypes);
                                                     })
                                                     ->required()
                                                     ->distinct()
                                                     ->helperText('Chọn loại video cần cấu hình model.'),
                                                 Forms\Components\Select::make('model_id')
                                                     ->label('Model ID')
                                                     ->options(function () {
                                                         $available = collect((new \App\Services\ModelSelector())->getAvailableModels())
                                                             ->map(fn($group) => collect($group)->mapWithKeys(fn($name, $id) => [$id => "$id ($name)"])->toArray())
                                                             ->toArray();
                                                         return array_merge(['custom' => '-- Thêm mới / Tùy chỉnh (Nhập thủ công) --'], $available);
                                                     })
                                                     ->required()
                                                     ->live()
                                                     ->searchable()
                                                     ->helperText('Chọn model ID cụ thể hoặc chọn Tùy chỉnh để nhập mới.'),
                                                 Forms\Components\TextInput::make('custom_model_id')
                                                     ->label('Nhập Model ID tùy chỉnh')
                                                     ->required()
                                                     ->visible(fn($get) => $get('model_id') === 'custom')
                                                     ->placeholder('e.g., my-custom-model-v1')
                                                     ->columnSpanFull(),
                                             ])
                                             ->columns(2)
                                             ->afterStateHydrated(function ($component, $state) {
                                                 if (!is_array($state)) {
                                                     $state = json_decode($state ?? '', true) ?? [];
                                                 }
                                                 $list = [];
                                                 foreach ($state as $key => $value) {
                                                     // Recover from corrupted list format
                                                     if (is_numeric($key) && is_array($value) && isset($value['video_type_code'])) {
                                                         $key = $value['video_type_code'];
                                                         $value = $value['model_id'] === 'custom' ? ($value['custom_model_id'] ?? '') : $value['model_id'];
                                                     }
                                                     if (empty($key)) continue;

                                                     $availableModels = collect((new \App\Services\ModelSelector())->getAvailableModels())
                                                         ->flatMap(fn($group) => array_keys($group))
                                                         ->toArray();

                                                     $isCustom = !in_array($value, $availableModels);
                                                     $list[\Illuminate\Support\Str::uuid()->toString()] = [
                                                         'video_type_code' => $key,
                                                         'model_id' => $isCustom ? 'custom' : $value,
                                                         'custom_model_id' => $isCustom ? $value : null,
                                                     ];
                                                 }
                                                 $component->state($list);
                                             })
                                             ->dehydrateStateUsing(function ($state) {
                                                 // Repeater rows → associative map {video_type_code: model_id},
                                                 // the format the app expects (resolveModelForType / capabilities).
                                                 // Without this the raw row list was saved back, corrupting
                                                 // model_mapping (array_keys became numeric → capabilities empty,
                                                 // every feature wrongly gated as "maintenance").
                                                 if (!is_array($state)) {
                                                     return [];
                                                 }
                                                 $map = [];
                                                 foreach ($state as $row) {
                                                     if (!is_array($row)) {
                                                         continue;
                                                     }
                                                     $code = $row['video_type_code'] ?? null;
                                                     if (empty($code)) {
                                                         continue;
                                                     }
                                                     $model = ($row['model_id'] ?? null) === 'custom'
                                                         ? trim((string) ($row['custom_model_id'] ?? ''))
                                                         : ($row['model_id'] ?? '');
                                                     if ($model === '' || $model === null) {
                                                         continue;
                                                     }
                                                     $map[$code] = $model;
                                                 }
                                                 return $map;
                                             })
                                             ->columnSpanFull(),
                                     ])->columns(2),
                                Components\Section::make('Cấu hình Provider')
                                    ->schema([
                                        Forms\Components\Select::make('default_provider')
                                            ->label('Nhà cung cấp mặc định (Default Provider)')
                                            ->options(array_merge(['custom' => '-- Thêm mới / Tùy chỉnh (Nhập thủ công) --'], self::getKnownProviders()))
                                            ->required()
                                            ->live()
                                            ->searchable()
                                            ->afterStateHydrated(function ($component, $state, $set) {
                                                if ($state && !array_key_exists($state, self::getKnownProviders())) {
                                                    $set('custom_default_provider', $state);
                                                    $component->state('custom');
                                                }
                                            })
                                            ->dehydrateStateUsing(function ($state, $get) {
                                                if ($state === 'custom') {
                                                    return $get('custom_default_provider') ?: '';
                                                }
                                                return $state;
                                            })
                                            ->helperText('Chọn nhà cung cấp mặc định khi không tìm thấy model khớp.'),
                                        Forms\Components\TextInput::make('custom_default_provider')
                                            ->label('Nhập mã nhà cung cấp tùy chỉnh')
                                            ->visible(fn ($get) => $get('default_provider') === 'custom')
                                            ->required(fn ($get) => $get('default_provider') === 'custom')
                                            ->dehydrated(false)
                                            ->placeholder('e.g., my-custom-provider')
                                            ->helperText('Nhập mã nhà cung cấp mới (không dấu, viết thường, dùng dấu gạch ngang).'),
                                        

                                        Forms\Components\Repeater::make('provider_config')
                                            ->label('Cấu hình chi tiết các Nhà cung cấp')
                                            ->itemLabel(fn (array $state): ?string => 
                                                isset($state['provider_id']) 
                                                    ? ($state['provider_id'] === 'custom' 
                                                        ? ucfirst($state['custom_provider_id'] ?? 'Tùy chỉnh')
                                                        : ucfirst($state['provider_id']))
                                                    : null
                                            )
                                            ->schema([
                                                Forms\Components\Select::make('provider_id')
                                                    ->label('Nhà cung cấp')
                                                    ->options(array_merge(['custom' => '-- Thêm mới / Tùy chỉnh (Nhập thủ công) --'], self::getKnownProviders()))
                                                    ->required()
                                                    ->live()
                                                    ->searchable()
                                                    ->helperText('Chọn mã nhà cung cấp hoặc chọn "Thêm mới / Tùy chỉnh" để nhập nhà cung cấp khác.'),
                                                Forms\Components\TextInput::make('custom_provider_id')
                                                    ->label('Nhập mã nhà cung cấp tùy chỉnh')
                                                    ->required()
                                                    ->visible(fn ($get) => $get('provider_id') === 'custom')
                                                    ->placeholder('e.g., my-custom-provider')
                                                    ->helperText('Nhập mã nhà cung cấp mới (không dấu, viết thường).'),
                                                
                                                Forms\Components\Toggle::make('is_enabled')
                                                    ->label('Kích hoạt')
                                                    ->default(true),
                                                Forms\Components\TagsInput::make('mapped_models')
                                                    ->label('Các Model ID thuộc nhà cung cấp này')
                                                    ->placeholder('Nhập model ID rồi nhấn Enter')
                                                    ->helperText('Hệ thống tự động nhận diện nếu Model ID bắt đầu bằng mã nhà cung cấp (VD: provider là vsllm, model là vsllmimage). Nếu tên model khác hoàn toàn, hãy thêm thủ công vào đây.')
                                                    ->columnSpanFull(),
                                                Forms\Components\Select::make('api_protocol')
                                                    ->label('Giao thức API')
                                                    ->options([
                                                        'auto' => 'Tự động (Theo mã cung cấp)',
                                                        'openai' => 'Chuẩn OpenAI (OpenAI Compatible)',
                                                    ])
                                                    ->default('auto')
                                                    ->helperText('Chọn "Chuẩn OpenAI" nếu đây là provider mới hỗ trợ API giống OpenAI.'),
                                                Forms\Components\TextInput::make('multiplier')
                                                    ->label('Hệ số giá (Multiplier)')
                                                    ->numeric()
                                                    ->default(1.0)
                                                    ->required(),
                                                Forms\Components\TextInput::make('api_key')
                                                    ->label('API Key')
                                                    ->password()
                                                    ->revealable()
                                                    ->placeholder('Nhập API Key nếu có'),
                                                Forms\Components\TextInput::make('base_url')
                                                    ->label('Base URL')
                                                    ->url()
                                                    ->placeholder('Nhập Base URL nếu cần thay đổi'),
                                            ])
                                            ->columns(2)
                                            ->afterStateHydrated(function ($component, $state) {
                                                if (!is_array($state)) {
                                                    $state = json_decode($state ?? '', true) ?? [];
                                                }
                                                $list = [];
                                                foreach ($state as $key => $value) {
                                                    // Recover from corrupted list format
                                                    if (is_numeric($key) && is_array($value) && (isset($value['provider_id']) || isset($value['custom_provider_id']))) {
                                                        $key = $value['provider_id'] === 'custom' ? ($value['custom_provider_id'] ?? '') : $value['provider_id'];
                                                        // Ensure value doesn't overwrite real keys in array_merge
                                                        unset($value['provider_id'], $value['custom_provider_id']);
                                                    }
                                                    if (empty($key)) continue;

                                                    $isCustom = !array_key_exists($key, self::getKnownProviders());
                                                    $entry = array_merge([
                                                        'provider_id' => $isCustom ? 'custom' : $key,
                                                        'custom_provider_id' => $isCustom ? $key : null,
                                                    ], is_array($value) ? $value : []);
                                                    $list[\Illuminate\Support\Str::uuid()->toString()] = $entry;
                                                }
                                                $component->state($list);
                                            })
                                            ->columnSpanFull(),
                                    ]),
                            ]),
                        Components\Tabs\Tab::make('Tính năng')
                            ->icon('heroicon-o-star')
                            ->schema([
                                Components\Section::make('Tính năng')
                                    ->schema([
                                        Forms\Components\Toggle::make('audio_generation')
                                            ->label('Tạo âm thanh')
                                            ->helperText('Cho phép tạo nhạc nền/voiceover'),
                                    
                                    ])->columns(2),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Tên gói')
                    ->searchable(),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'free' => 'success',
                        'pro' => 'warning',
                        'studio' => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('price_regular')
                    ->label('Giá thường')
                    ->formatStateUsing(fn ($state) => $state ? number_format($state) . '₫' : 'Miễn phí'),
                Tables\Columns\TextColumn::make('price_sale')
                    ->label('Giá KM')
                    ->formatStateUsing(fn ($state) => $state ? number_format($state) . '₫' : '—'),
                Tables\Columns\TextColumn::make('users_count')
                    ->label('Người dùng')
                    ->counts('users'),
                 Tables\Columns\TextColumn::make('quality_multiplier')
                     ->label('Hệ số chất lượng'),
                 Tables\Columns\TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([])
            ->actions([
                \Filament\Actions\ActionGroup::make([
                    \Filament\Actions\EditAction::make()->label('Sửa'),
                    \Filament\Actions\DeleteAction::make()->label('Xoá'),
                ])->label('Thao tác')->icon('heroicon-o-ellipsis-vertical'),
            ])
            ->bulkActions([
                \Filament\Actions\BulkActionGroup::make([
                    \Filament\Actions\DeleteBulkAction::make()->label('Xoá đã chọn'),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlans::route('/'),
            'create' => Pages\CreatePlan::route('/create'),
            'edit' => Pages\EditPlan::route('/{record}/edit'),
        ];
    }
}
