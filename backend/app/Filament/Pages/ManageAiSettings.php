<?php

namespace App\Filament\Pages;

use App\Settings\AiSettings;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Group;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Throwable;

class ManageAiSettings extends Page
{
    protected static \BackedEnum | string | null $navigationIcon = 'heroicon-o-cpu-chip';

    protected string $view = 'filament-panels::pages.page';

    public ?array $data = [];

    public static function getNavigationLabel(): string
    {
        return 'Cấu hình AI';
    }

    public static function getNavigationGroup(): ?string
    {
        return 'Hệ thống';
    }

    public function getTitle(): string
    {
        return 'Cấu hình AI (LLM & Web Search)';
    }

    public function mount(): void
    {
        $this->fillForm();
    }

    protected function fillForm(): void
    {
        try {
            $s = app(AiSettings::class);
            $this->form->fill([
                'llm_provider' => $s->llm_provider,
                'llm_base_url' => $s->llm_base_url,
                'llm_api_key' => $s->llm_api_key,
                'llm_model' => $s->llm_model,
                'search_provider' => $s->search_provider,
                'search_api_key' => $s->search_api_key,
            ]);
        } catch (Throwable) {
            $this->form->fill([]);
        }
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('LLM (sinh skill bằng AI)')
                ->description('Dùng cho AI tạo skill và AI-draft storyboard. Để "Theo .env" nếu muốn dùng cấu hình daemon.')
                ->components([
                    Select::make('llm_provider')
                        ->label('Nhà cung cấp LLM')
                        ->options([
                            'env' => 'Theo .env (mặc định)',
                            'ckey' => 'CKey (ckey.vn)',
                            'openai' => 'OpenAI',
                            'gemini' => 'Google Gemini',
                            'custom' => 'Custom API (OpenAI-compatible)',
                        ])
                        ->required()
                        ->live(),
                    TextInput::make('llm_base_url')
                        ->label('Base URL (Custom API)')
                        ->placeholder('https://my-endpoint.com')
                        ->url()
                        ->visible(fn (Get $get): bool => $get('llm_provider') === 'custom')
                        ->required(fn (Get $get): bool => $get('llm_provider') === 'custom')
                        ->helperText('Endpoint OpenAI-compatible — daemon sẽ gọi {base}/v1/chat/completions.'),
                    TextInput::make('llm_api_key')
                        ->label('API Key')
                        ->password()
                        ->revealable()
                        ->visible(fn (Get $get): bool => $get('llm_provider') !== 'env')
                        ->required(fn (Get $get): bool => $get('llm_provider') !== 'env'),
                    TextInput::make('llm_model')
                        ->label('Model')
                        ->placeholder('gpt-4o-mini')
                        ->visible(fn (Get $get): bool => $get('llm_provider') !== 'env'),
                ]),
            Section::make('Web Search (bắt trend khi tạo skill)')
                ->description('Tùy chọn — nhét xu hướng hiện tại vào prompt khi AI tạo skill.')
                ->components([
                    Select::make('search_provider')
                        ->label('Nhà cung cấp Search')
                        ->options([
                            'env' => 'Theo .env (mặc định)',
                            'none' => 'Tắt',
                            'tavily' => 'Tavily',
                        ])
                        ->required()
                        ->live(),
                    TextInput::make('search_api_key')
                        ->label('Tavily API Key')
                        ->password()
                        ->revealable()
                        ->visible(fn (Get $get): bool => $get('search_provider') === 'tavily')
                        ->required(fn (Get $get): bool => $get('search_provider') === 'tavily'),
                ]),
        ])->statePath('data');
    }

    public function save(): void
    {
        $data = $this->form->getState();

        try {
            $s = app(AiSettings::class);
            $s->llm_provider = $data['llm_provider'] ?? 'env';
            $s->llm_base_url = trim($data['llm_base_url'] ?? '');
            $s->llm_api_key = $data['llm_api_key'] ?? '';
            $s->llm_model = trim($data['llm_model'] ?? '') ?: 'gpt-4o-mini';
            $s->search_provider = $data['search_provider'] ?? 'env';
            $s->search_api_key = $data['search_api_key'] ?? '';
            $s->save();

            Notification::make()->title('Đã lưu cấu hình AI')->success()->send();
        } catch (Throwable $e) {
            Notification::make()->title('Lỗi khi lưu')->body($e->getMessage())->danger()->send();
        }
    }

    // --- Form actions footer (same pattern as the other settings pages) ---

    protected function getFormActions(): array
    {
        return [
            Action::make('save')->label('Lưu cấu hình')->action('save')->keyBindings(['mod+s']),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Group::make([EmbeddedSchema::make('form')]),
            $this->getFormActionsContentComponent(),
        ]);
    }

    public function getFormActionsContentComponent(): Component
    {
        return Actions::make($this->getFormActions())->key('form-actions');
    }

    public function defaultForm(Schema $schema): Schema
    {
        return $schema->statePath('data');
    }
}
