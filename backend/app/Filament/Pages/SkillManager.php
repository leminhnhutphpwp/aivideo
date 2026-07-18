<?php

namespace App\Filament\Pages;

use App\Services\SkillAuthoringService;
use App\Services\SkillService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\HtmlString;

class SkillManager extends Page
{
    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-sparkles';

    protected string $view = 'filament.pages.skill-manager';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    protected static ?string $navigationLabel = 'Skills (Local)';

    protected static ?string $title = 'Quản lý Skills (Local)';

    protected static ?int $navigationSort = 5;

    /** @var array<int,array<string,mixed>> */
    public array $skills = [];

    /** Search query (filters id / label / description). */
    public string $search = '';

    /** Per-collection current page (collection => 1-based page). */
    public array $pages = [];

    /** Which collections are expanded (collection => true). */
    public array $open = [];

    /** Skills shown per collection before pagination kicks in. */
    public const PER_PAGE = 10;

    public function mount(): void
    {
        $this->loadSkills();
    }

    public function loadSkills(): void
    {
        $this->skills = app(SkillService::class)->all();
    }

    /** Reset pagination whenever the search term changes. */
    public function updatedSearch(): void
    {
        $this->pages = [];
    }

    public function toggleOpen(string $collection): void
    {
        $this->open[$collection] = ! ($this->open[$collection] ?? false);
    }

    public function gotoPage(string $collection, int $page): void
    {
        $this->pages[$collection] = max(1, $page);
    }

    /**
     * Skills filtered by search, grouped by collection and paginated per group.
     * @return array<string,array{items:array,total:int,type:string,page:int,pageCount:int}>
     */
    public function getGroupsProperty(): array
    {
        $q = trim(mb_strtolower($this->search));

        $filtered = collect($this->skills)->filter(function ($s) use ($q) {
            if ($q === '') {
                return true;
            }
            $hay = mb_strtolower(($s['id'] ?? '').' '.($s['label'] ?? '').' '.($s['description'] ?? ''));

            return str_contains($hay, $q);
        });

        $out = [];
        foreach ($filtered->groupBy('collection')->sortKeys() as $collection => $items) {
            $items = $items->values();
            $total = $items->count();
            $pageCount = max(1, (int) ceil($total / self::PER_PAGE));
            $page = min(max(1, (int) ($this->pages[$collection] ?? 1)), $pageCount);

            $out[$collection] = [
                'items' => $items->slice(($page - 1) * self::PER_PAGE, self::PER_PAGE)->values()->all(),
                'total' => $total,
                'type' => $items->first()['type'] ?? 'unloaded',
                'page' => $page,
                'pageCount' => $pageCount,
            ];
        }

        return $out;
    }

    /** Open the edit modal for a skill (server-side mount avoids JS object-literal parsing). */
    public function openEdit(string $id): void
    {
        $this->mountAction('edit', ['id' => $id]);
    }

    /** Open the delete confirmation for a skill. */
    public function openDelete(string $id): void
    {
        $this->mountAction('delete', ['id' => $id]);
    }

    /** Toggle a skill between draft and published. */
    public function openToggle(string $id): void
    {
        $this->mountAction('togglePublish', ['id' => $id]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('aiAuthor')
                ->label('AI tạo skill')
                ->icon('heroicon-o-sparkles')
                ->color('info')
                ->modalWidth('2xl')
                ->modalSubmitActionLabel('Tạo draft')
                ->form([
                    Select::make('category')
                        ->label('Phân loại (nhóm đa-skill)')
                        ->options(collect(app(SkillService::class)->multiCategories())->mapWithKeys(fn ($c) => [$c => $c])->all())
                        ->required()
                        ->searchable(),
                    Textarea::make('brief')
                        ->label('Mô tả ý tưởng / brief')
                        ->required()
                        ->rows(4)
                        ->placeholder('vd: phong cách ảnh sản phẩm tối giản, nền pastel, ánh sáng mềm studio, bắt trend 2026')
                        ->helperText('AI sẽ sinh 1 skill mới theo cấu trúc category, lưu thành DRAFT để bạn duyệt rồi publish.'),
                ])
                ->action(function (array $data) {
                    try {
                        $draft = app(SkillAuthoringService::class)->authorDraft($data['category'], $data['brief']);
                        $this->loadSkills();
                        $this->notifyDraftAuthored($draft);
                    } catch (\Throwable $e) {
                        Notification::make()->danger()->title('Lỗi AI tạo skill')->body($e->getMessage())->send();
                    }
                }),
            Action::make('create')
                ->label('Tạo skill mới')
                ->icon('heroicon-o-plus')
                ->modalWidth('5xl')
                ->form($this->createSchema())
                ->action(function (array $data) {
                    $name = trim($data['name'] ?? '');
                    $id = $name !== '' ? $data['category'].'/'.$name : $data['category'];
                    try {
                        app(SkillService::class)->save($id, $data['frontmatter'], $data['body']);
                        $this->loadSkills();
                        Notification::make()->success()->title('Đã tạo skill: '.$id)->send();
                    } catch (\Throwable $e) {
                        Notification::make()->danger()->title('Lỗi')->body($e->getMessage())->send();
                    }
                }),
        ];
    }

    /**
     * Notify the admin that an AI draft was created, surfacing the daemon's optional
     * auto-verify sample (a generated sample image + style-match verdict) so they can
     * decide whether to publish. Degrades gracefully: no sample / a degraded sample /
     * a simulated sample each produce a sensible message instead of an error.
     *
     * @param  array<string,mixed>  $draft
     */
    protected function notifyDraftAuthored(array $draft): void
    {
        $id = (string) ($draft['id'] ?? '');
        $sample = is_array($draft['sample'] ?? null) ? $draft['sample'] : null;

        // No auto-verify at all → the original happy-path message.
        if ($sample === null) {
            Notification::make()->success()
                ->title('Đã tạo draft: '.$id)
                ->body('Kiểm tra nội dung rồi bấm Publish khi ưng.')
                ->send();

            return;
        }

        // Daemon tried to verify but couldn't (no verify model / gen error).
        if (! empty($sample['degraded'])) {
            $reason = is_string($sample['error'] ?? null) && $sample['error'] !== '' ? ' ('.$sample['error'].')' : '';
            Notification::make()->warning()
                ->title('Đã tạo draft: '.$id)
                ->body('Chưa tự verify được ảnh mẫu'.$reason.'. Hãy tự kiểm tra nội dung rồi Publish.')
                ->persistent()
                ->send();

            return;
        }

        $match = is_array($sample['styleMatch'] ?? null) ? $sample['styleMatch'] : [];
        $verdict = $match['match'] ?? null;
        $score = $match['score'] ?? null;
        $notes = is_string($match['notes'] ?? null) ? trim($match['notes']) : '';
        $imageUrl = $sample['imageFullUrl'] ?? $sample['imageUrl'] ?? null;
        $simulated = ! empty($sample['simulated']);

        $verdictText = $verdict === true
            ? '✅ Khớp phong cách'
            : ($verdict === false ? '⚠️ Chưa khớp phong cách' : 'Chưa có kết luận khớp phong cách');
        if (is_numeric($score)) {
            $verdictText .= ' — điểm '.round(((float) $score) * 100).'%';
        }
        if ($simulated) {
            $verdictText .= ' (ảnh mô phỏng)';
        }

        $lines = ['<strong>'.e($verdictText).'</strong>'];
        if ($notes !== '') {
            $lines[] = e($notes);
        }
        if (is_string($imageUrl) && $imageUrl !== '') {
            $lines[] = '<img src="'.e($imageUrl).'" alt="sample" style="max-width:100%;border-radius:6px;margin-top:4px" />';
            $lines[] = '<a href="'.e($imageUrl).'" target="_blank" rel="noopener">Mở ảnh mẫu</a>';
        }
        $lines[] = 'Kiểm tra rồi bấm Publish khi ưng.';

        $notification = ($verdict === false ? Notification::make()->warning() : Notification::make()->success())
            ->title('Đã tạo draft: '.$id)
            ->body(new HtmlString(implode('<br>', $lines)))
            ->persistent();

        $notification->send();
    }

    public function editAction(): Action
    {
        return Action::make('edit')
            ->label('Sửa')
            ->modalWidth('5xl')
            ->fillForm(fn (array $arguments): array => app(SkillService::class)->get($arguments['id']) ?? [])
            ->form($this->formSchema(true))
            ->action(function (array $data, array $arguments) {
                try {
                    app(SkillService::class)->save($arguments['id'], $data['frontmatter'], $data['body']);
                    $this->loadSkills();
                    Notification::make()->success()->title('Đã lưu: '.$arguments['id'])->send();
                } catch (\Throwable $e) {
                    Notification::make()->danger()->title('Lỗi')->body($e->getMessage())->send();
                }
            });
    }

    public function deleteAction(): Action
    {
        return Action::make('delete')
            ->label('Xoá')
            ->color('danger')
            ->requiresConfirmation()
            ->modalHeading('Xoá skill?')
            ->modalDescription(fn (array $arguments) => 'Xoá file SKILL.md của: '.($arguments['id'] ?? ''))
            ->action(function (array $arguments) {
                app(SkillService::class)->delete($arguments['id']);
                $this->loadSkills();
                Notification::make()->success()->title('Đã xoá: '.$arguments['id'])->send();
            });
    }

    public function togglePublishAction(): Action
    {
        return Action::make('togglePublish')
            ->requiresConfirmation()
            ->modalHeading('Đổi trạng thái skill?')
            ->action(function (array $arguments) {
                $svc = app(SkillService::class);
                $current = $svc->get($arguments['id']);
                $next = ($current['status'] ?? 'published') === 'draft' ? 'published' : 'draft';
                $svc->setStatus($arguments['id'], $next);
                $this->loadSkills();
                Notification::make()->success()
                    ->title($next === 'published' ? 'Đã publish (studio thấy)' : 'Đã chuyển nháp (ẩn khỏi studio)')
                    ->send();
            });
    }

    /** @return array<int,\Filament\Forms\Components\Component> */
    protected function formSchema(bool $editing): array
    {
        return [
            TextInput::make('id')
                ->label('Đường dẫn / ID')
                ->placeholder('vd: image-direction/natural-photo')
                ->required()
                ->disabled($editing)
                ->dehydrated(! $editing)
                ->helperText('Thư mục tương đối dưới /skills (chỉ chữ/số/-/_//). File lưu tại <id>/SKILL.md.'),
            Textarea::make('frontmatter')
                ->label('Frontmatter (YAML — phần giữa hai dấu ---)')
                ->rows(10)
                ->required()
                ->extraInputAttributes(['style' => 'font-family: ui-monospace, monospace; font-size: 12px;'])
                ->helperText('Ví dụ: id, label, description, style_keywords, mood_tones...'),
            Textarea::make('body')
                ->label('Nội dung (Markdown)')
                ->rows(16)
                ->extraInputAttributes(['style' => 'font-family: ui-monospace, monospace; font-size: 12px;']),
        ];
    }

    /** Create form: pick a category (classification) → frontmatter template auto-fills. */
    protected function createSchema(): array
    {
        $svc = app(SkillService::class);
        // Only multi-skill collections accept new skills — the daemon ignores
        // sub-folders in single-file categories, so creating there = a dead file.
        $categories = collect($svc->multiCategories())->mapWithKeys(fn ($c) => [$c => $c])->all();

        return [
            Select::make('category')
                ->label('Phân loại (Category) — chỉ nhóm đa-skill')
                ->options($categories)
                ->required()
                ->searchable()
                ->live()
                ->afterStateUpdated(function ($state, callable $set) use ($svc) {
                    if (! $state) {
                        return;
                    }
                    $tpl = $svc->template($state);
                    $set('frontmatter', $tpl['frontmatter']);
                    $set('body', $tpl['body']);
                })
                ->helperText('Chỉ nhóm đa-skill mới thêm được (daemon quét subfolder). Nhóm 1-file (video-contract…) chỉ Sửa skill có sẵn — không thêm.'),
            TextInput::make('name')
                ->label('Tên skill (thư mục con)')
                ->placeholder('vd: natural-photo')
                ->required()
                ->rule('regex:/^[A-Za-z0-9_-]+$/')
                ->helperText('File lưu tại <category>/<tên>/SKILL.md.'),
            Textarea::make('frontmatter')
                ->label('Frontmatter (YAML — phần giữa hai dấu ---)')
                ->rows(12)
                ->required()
                ->extraInputAttributes(['style' => 'font-family: ui-monospace, monospace; font-size: 12px;'])
                ->helperText('Tự điền theo category đã chọn — sửa lại id/label/description + giá trị cho skill mới.'),
            Textarea::make('body')
                ->label('Nội dung (Markdown)')
                ->rows(12)
                ->extraInputAttributes(['style' => 'font-family: ui-monospace, monospace; font-size: 12px;']),
        ];
    }
}
