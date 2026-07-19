<?php

namespace App\Filament\Pages;

use App\Services\TelegramService;
use App\Settings\TelegramSettings;
use Filament\Actions\Action;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Group;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\Facades\Http;
use Throwable;

class ManageTelegramSettings extends Page
{
    protected static \BackedEnum | string | null $navigationIcon = 'heroicon-o-chat-bubble-bottom-center';

    protected string $view = 'filament-panels::pages.page';

    public ?array $data = [];

    public array $chatOptions = [];

    public static function getNavigationLabel(): string
    {
        return 'Telegram Bot';
    }

    public static function getNavigationGroup(): ?string
    {
        return 'Cấu hình hệ thống';
    }

    public function getTitle(): string
    {
        return 'Cấu hình Telegram Bot';
    }

    public function getSubheading(): ?string
    {
        return 'Nhận thông báo qua Telegram khi có yêu cầu nạp credits hoặc nâng cấp gói.';
    }

    public function mount(): void
    {
        $this->fillForm();
    }

    protected function fillForm(): void
    {
        try {
            $settings = app(TelegramSettings::class);

            foreach ($settings->chat_ids as $id) {
                $this->chatOptions[(string) $id] = "Chat {$id}";
            }

            $this->form->fill([
                'enabled' => $settings->enabled,
                'bot_token' => $settings->bot_token,
                'chat_ids' => $settings->chat_ids,
                'notify_credit_purchase' => $settings->notify_credit_purchase,
                'notify_plan_upgrade' => $settings->notify_plan_upgrade,
            ]);
        } catch (Throwable) {
            // Settings row missing (e.g. migration not run yet) — show safe defaults.
            $this->form->fill([
                'enabled' => false,
                'bot_token' => '',
                'chat_ids' => [],
                'notify_credit_purchase' => true,
                'notify_plan_upgrade' => true,
            ]);
        }
    }

    public function save(): void
    {
        $enabled = (bool) ($this->data['enabled'] ?? false);

        $rules = [
            'data.enabled' => ['boolean'],
            'data.notify_credit_purchase' => ['boolean'],
            'data.notify_plan_upgrade' => ['boolean'],
            'data.bot_token' => ['nullable', 'regex:/^\d+:[\w-]+$/'],
            'data.chat_ids' => ['nullable', 'array'],
            'data.chat_ids.*' => ['string'],
        ];

        // When notifications are turned on, credentials become mandatory.
        if ($enabled) {
            $rules['data.bot_token'] = ['required', 'regex:/^\d+:[\w-]+$/'];
            $rules['data.chat_ids'] = ['required', 'array', 'min:1'];
        }

        $this->validate($rules, [
            'data.bot_token.required' => 'Bot Token là bắt buộc khi bật thông báo.',
            'data.bot_token.regex' => 'Bot Token không đúng định dạng (vd: 123456:ABCdef...).',
            'data.chat_ids.required' => 'Cần chọn ít nhất 1 Chat ID khi bật thông báo.',
            'data.chat_ids.min' => 'Cần chọn ít nhất 1 Chat ID khi bật thông báo.',
        ]);

        try {
            $data = $this->data;

            $settings = app(TelegramSettings::class);
            $settings->enabled = (bool) ($data['enabled'] ?? false);
            $settings->bot_token = $data['bot_token'] ?? '';
            $settings->chat_ids = array_values(array_filter(array_map('strval', $data['chat_ids'] ?? [])));
            $settings->notify_credit_purchase = (bool) ($data['notify_credit_purchase'] ?? true);
            $settings->notify_plan_upgrade = (bool) ($data['notify_plan_upgrade'] ?? true);
            $settings->save();

            Notification::make()
                ->title('Đã lưu cấu hình Telegram Bot')
                ->success()
                ->send();
        } catch (Throwable $e) {
            // Never log the token — message/trace could embed it via an HTTP URL.
            logger('TelegramSettings save error', ['error' => $e->getMessage()]);
            Notification::make()
                ->title('Lỗi khi lưu cấu hình')
                ->body('Không thể lưu cấu hình. Vui lòng kiểm tra log hệ thống.')
                ->danger()
                ->send();
        }
    }

    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction(),
        ];
    }

    protected function getSaveFormAction(): Action
    {
        return Action::make('save')
            ->label('Lưu cấu hình')
            ->action('save')
            ->keyBindings(['mod+s']);
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                Group::make([
                    EmbeddedSchema::make('form'),
                ]),
                $this->getFormActionsContentComponent(),
            ]);
    }

    public function getFormActionsContentComponent(): Component
    {
        return Actions::make($this->getFormActions())
            ->alignment($this->getFormActionsAlignment())
            ->fullWidth($this->hasFullWidthFormActions())
            ->sticky($this->areFormActionsSticky())
            ->key('form-actions');
    }

    public function defaultForm(Schema $schema): Schema
    {
        return $schema
            ->statePath('data');
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Kích hoạt thông báo')
                    ->description('Bật/tắt toàn bộ thông báo Telegram. Khi tắt, hệ thống sẽ không gửi bất kỳ thông báo tự động nào.')
                    ->icon('heroicon-o-power')
                    ->components([
                        Toggle::make('enabled')
                            ->label('Bật thông báo Telegram')
                            ->helperText('Khi bật, cần khai báo Bot Token và ít nhất 1 Chat ID.')
                            ->live(),
                        Placeholder::make('bot_info')
                            ->label('Trạng thái Bot')
                            ->content(function () {
                                $telegram = app(TelegramService::class);
                                $info = $telegram->getBotInfo();
                                if ($info) {
                                    $name = $info['first_name'] ?? 'Unknown';
                                    $username = $info['username'] ?? 'unknown';

                                    return "✅ Hoạt động: @{$username} ({$name})";
                                }

                                return '❌ Chưa cấu hình hoặc token không hợp lệ';
                            }),
                    ])
                    ->columns(2),

                Section::make('Kết nối Bot')
                    ->description('Thông tin xác thực với Telegram Bot API.')
                    ->icon('heroicon-o-key')
                    ->components([
                        TextInput::make('bot_token')
                            ->label('Bot Token')
                            ->placeholder('1234567890:ABCdefGHIjklmNOPqrstUVwxyz')
                            ->password()
                            ->revealable()
                            ->autocomplete('off')
                            ->required(fn (Get $get): bool => (bool) $get('enabled'))
                            ->rule('regex:/^\d+:[\w-]+$/')
                            ->helperText('Lấy từ @BotFather trên Telegram. Token được ẩn và không ghi vào log.'),
                    ]),

                Section::make('Kênh nhận thông báo')
                    ->description('Danh sách Chat/Group sẽ nhận thông báo. Hãy gửi "/start" tới bot trong nhóm trước khi đồng bộ.')
                    ->icon('heroicon-o-user-group')
                    ->components([
                        Select::make('chat_ids')
                            ->label('Chat IDs')
                            ->multiple()
                            ->options(fn () => $this->chatOptions)
                            ->searchable()
                            ->required(fn (Get $get): bool => (bool) $get('enabled'))
                            ->hintAction(
                                Action::make('syncChats')
                                    ->label('Đồng bộ danh sách chat')
                                    ->icon('heroicon-o-arrow-path')
                                    ->action(function (Get $get, Set $set) {
                                        $token = $get('bot_token');
                                        if (! $token) {
                                            Notification::make()
                                                ->title('Vui lòng nhập Bot Token trước')
                                                ->warning()
                                                ->send();

                                            return;
                                        }

                                        try {
                                            $response = Http::timeout(10)
                                                ->get("https://api.telegram.org/bot{$token}/getUpdates");
                                        } catch (Throwable) {
                                            Notification::make()
                                                ->title('Không kết nối được tới Telegram API')
                                                ->danger()
                                                ->send();

                                            return;
                                        }

                                        $updates = $response->json('result') ?? [];

                                        $seen = [];
                                        $options = [];
                                        foreach ($updates as $update) {
                                            $chat = $update['message']['chat']
                                                ?? $update['channel_post']['chat']
                                                ?? $update['my_chat_member']['chat']
                                                ?? null;
                                            if ($chat && ! isset($seen[$chat['id']])) {
                                                $seen[$chat['id']] = true;
                                                $title = $chat['title'] ?? $chat['first_name'] ?? "Chat {$chat['id']}";
                                                $options[(string) $chat['id']] = "{$title} ({$chat['id']})";
                                            }
                                        }

                                        if (empty($options)) {
                                            Notification::make()
                                                ->title('Không tìm thấy chat nào')
                                                ->body('Hãy gửi tin nhắn "/start" vào bot trước.')
                                                ->warning()
                                                ->send();

                                            return;
                                        }

                                        ksort($options);
                                        $this->chatOptions = $options;
                                        $set('chat_ids', array_keys($options));

                                        Notification::make()
                                            ->title('Đã đồng bộ ' . count($options) . ' chat')
                                            ->success()
                                            ->send();
                                    })
                            )
                            ->helperText('Chọn các chat sẽ nhận thông báo. Bấm nút đồng bộ để lấy danh sách từ API.'),
                    ]),

                Section::make('Sự kiện gửi thông báo')
                    ->description('Chọn loại sự kiện sẽ kích hoạt thông báo Telegram.')
                    ->icon('heroicon-o-bell-alert')
                    ->components([
                        Toggle::make('notify_credit_purchase')
                            ->label('Yêu cầu nạp credits')
                            ->helperText('Gửi thông báo khi người dùng tạo yêu cầu nạp credits.'),
                        Toggle::make('notify_plan_upgrade')
                            ->label('Yêu cầu nâng cấp gói')
                            ->helperText('Gửi thông báo khi người dùng tạo yêu cầu nâng cấp gói.'),
                    ])
                    ->columns(2),
            ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('test')
                ->label('Gửi tin nhắn test')
                ->icon('heroicon-o-paper-airplane')
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Gửi tin nhắn test')
                ->modalDescription('Bot sẽ gửi tin nhắn test đến tất cả chat IDs đã cấu hình (bỏ qua công tắc bật/tắt).')
                ->action(function (TelegramService $telegram) {
                    if (! $telegram->isConfigured()) {
                        Notification::make()
                            ->title('Chưa cấu hình Bot Token hoặc Chat IDs')
                            ->body('Hãy lưu cấu hình trước khi gửi tin nhắn test.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $ok = $telegram->sendTestMessage();
                    if ($ok) {
                        Notification::make()
                            ->title('Đã gửi tin nhắn test thành công!')
                            ->success()
                            ->send();
                    } else {
                        Notification::make()
                            ->title('Gửi thất bại. Kiểm tra log để biết chi tiết.')
                            ->danger()
                            ->send();
                    }
                }),

            Action::make('getUpdates')
                ->label('Lấy danh sách nhóm/Chat')
                ->icon('heroicon-o-arrow-path')
                ->color('info')
                ->action(function (TelegramService $telegram) {
                    $updates = $telegram->getUpdates();
                    if (empty($updates)) {
                        Notification::make()
                            ->title('Không tìm thấy update nào. Gửi tin nhắn "/start" vào bot trước.')
                            ->warning()
                            ->send();

                        return;
                    }

                    $chats = collect($updates)
                        ->map(fn ($u) => $u['message']['chat'] ?? $u['my_chat_member']['chat'] ?? null)
                        ->filter()
                        ->unique('id')
                        ->values();

                    if ($chats->isEmpty()) {
                        Notification::make()
                            ->title('Không tìm thấy chat nào.')
                            ->warning()
                            ->send();

                        return;
                    }

                    $lines = $chats->map(fn ($c) => $c['id'] . ' — ' . ($c['title'] ?? $c['first_name'] ?? 'Unknown') . ' (' . ($c['type'] ?? '?') . ')');

                    $message = "Các Chat/Groups tìm thấy:\n" . $lines->implode("\n");

                    Notification::make()
                        ->title('Chat IDs')
                        ->body('<pre>' . e($message) . '</pre>')
                        ->info()
                        ->send();
                }),
        ];
    }

    protected function hasFullWidthFormActions(): bool
    {
        return false;
    }

    public function areFormActionsSticky(): bool
    {
        return true;
    }

    public function getFormActionsAlignment(): string
    {
        return 'end';
    }
}
