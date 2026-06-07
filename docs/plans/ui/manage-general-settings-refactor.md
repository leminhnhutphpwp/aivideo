# Refactor ManageGeneralSettings → Tab-per-File — Design Plan

## Date
2026-05-31

## Overview
`ManageGeneralSettings.php` hiện tại ~604 dòng, chứa trực tiếp 19 tabs. Sắp tới còn thêm nhiều tab landing page, file sẽ sớm vượt 1000+ dòng, khó bảo trì. Tách mỗi tab thành 1 class riêng trong `SettingsTabs/`, mỗi class export 1 `static method make(): Tab`. `ManageGeneralSettings` chỉ còn là "thin orchestrator" lắp ghép các tab.

## User Stories
- As a **developer**, I want each settings tab in its own file → dễ tìm, dễ sửa, giảm merge conflict.
- As a **developer**, I want ManageGeneralSettings to be ~30 dòng → dễ đọc tổng quan cấu trúc.
- As a **developer**, I want tab files reusable → có thể dùng lại 1 tab ở resource khác nếu cần.

---

## Technical Design

### Pattern: Static Factory Method

Mỗi tab class theo pattern:

```php
<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;

class WebsiteTab
{
    public static function make(): Tab
    {
        return Tab::make('website')
            ->label('Thông tin website')
            ->icon('heroicon-o-globe-alt')
            ->schema([...]);
    }
}
```

### Why `make()` (not `configure()`)

- `CreditSettingForm::configure(Schema $schema): Schema` nhận/trả Schema → dùng khi class quản lý toàn bộ form.
- `SettingsTabs\XxxTab::make(): Tab` nhận 0 arg, trả về Tab → đơn giản hơn, mỗi class chỉ tạo 1 Tab.
- `make()` là convention của Laravel/Filament (Eloquent `make()`, Component `make()`, etc.).

### Where do closures live?

Một số tab hiện dùng closures (lazy-evaluated queries):
```php
Select::make('hero_video_id')
    ->options(fn () => Asset::where('type', 'video')...)
```

Các closures này **giữ nguyên bên trong `schema()` của từng Tab class**. Không cần inject dependency — Filament evaluate closures tại runtime khi render form.

**Riêng `$timezones`**: Hiện được tạo trong `form()` method vì cần gọi `timezone_identifiers_list()`. Trong refactor, di chuyển vào `WebsiteTab::make()` — không cần truyền từ ngoài vì là static data.

---

## Directory Structure

### Before
```
app/Filament/Pages/
├── ManageGeneralSettings.php          ← 604 dòng, 19 tabs inline
├── ManageCommunitySettings.php
├── ManageTelegramSettings.php
├── Dashboard.php
├── PricingTable.php
└── SystemTools.php
```

### After
```
app/Filament/Pages/
├── ManageGeneralSettings.php          ← ~40 dòng, thin orchestrator
├── SettingsTabs/
│   ├── WebsiteTab.php                 ← Tab "Thông tin website" + "Định dạng"
│   ├── HeroTab.php                    ← Tab "Hero Video"
│   ├── ShowcaseTab.php               ← Tab "Video Showcase"
│   ├── AuthBackgroundTab.php          ← Tab "Auth Background"
│   ├── SeoTab.php                     ← Tab "SEO"
│   ├── LandingHeroTab.php             ← Tab "Landing Hero"
│   ├── LandingPortalTab.php           ← Tab "Landing Portal"
│   ├── LandingReelTab.php             ← Tab "Landing Reel"
│   ├── LandingIntroTab.php            ← Tab "Landing Intro"
│   ├── LandingGenesisTab.php          ← Tab "Landing Genesis"
│   ├── LandingForgeTab.php            ← Tab "Landing Forge"
│   ├── LandingWorkflowTab.php         ← Tab "Landing Workflow"
│   ├── LandingDirectorTab.php         ← Tab "Landing Director"
│   ├── LandingGalleryTab.php          ← Tab "Landing Gallery"
│   ├── LandingSoundTab.php            ← Tab "Landing Sound"
│   ├── LandingEcosystemTab.php        ← Tab "Landing Ecosystem"
│   ├── LandingStatsTab.php            ← Tab "Landing Stats"
│   ├── LandingVisionTab.php           ← Tab "Landing Vision"
│   └── FooterTab.php                  ← Tab "Footer"
├── ManageCommunitySettings.php
├── ManageTelegramSettings.php
├── Dashboard.php
├── PricingTable.php
└── SystemTools.php
```

### File count
| Category | Count | Files |
|----------|-------|-------|
| Existing tabs (refactored) | 5 | WebsiteTab, HeroTab, ShowcaseTab, AuthBackgroundTab, SeoTab |
| Landing tabs (existing content, refactored) | 12 | LandingHero, LandingPortal, LandingReel, LandingIntro, LandingGenesis, LandingForge, LandingWorkflow, LandingDirector, LandingGallery, LandingSound, LandingEcosystem, LandingStats, LandingVision |
| Footer (existing content, refactored) | 1 | FooterTab |
| **Total new files** | **18** | |
| **Files to edit** | **1** | ManageGeneralSettings.php |
| **Files to delete** | **0** | (ManageGeneralSettings is rewritten, not deleted) |

---

## Implementation Tasks

### Phase 0: Create directory `SettingsTabs/`
```bash
mkdir -p backend/app/Filament/Pages/SettingsTabs
```

### Phase 1: Create 18 Tab classes (independent, parallelizable)

| # | File | Tab ID | Icon | Sections | Lines (est.) |
|---|------|--------|------|----------|--------------|
| 1 | `WebsiteTab.php` | `website` | `heroicon-o-globe-alt` | 2 (Thông tin website + Định dạng Khu vực) | ~85 |
| 2 | `HeroTab.php` | `hero` | `heroicon-o-play-circle` | 1 (Video nền Hero) | ~25 |
| 3 | `ShowcaseTab.php` | `showcase` | `heroicon-o-film` | 1 (Danh sách Video Showcase) | ~90 |
| 4 | `AuthBackgroundTab.php` | `auth_bg` | `heroicon-o-lock-closed` | 1 (Nền trang đăng nhập) | ~15 |
| 5 | `SeoTab.php` | `seo` | `heroicon-o-globe-alt` | 1 (SEO & Meta Tags) | ~30 |
| 6 | `LandingHeroTab.php` | `landing_hero` | `heroicon-o-paint-brush` | 1 (Hero Section) | ~35 |
| 7 | `LandingPortalTab.php` | `landing_portal` | `heroicon-o-arrow-right-circle` | 1 (Portal Section) | ~30 |
| 8 | `LandingReelTab.php` | `landing_reel` | `heroicon-o-film` | 1 (Reel Section) | ~20 |
| 9 | `LandingIntroTab.php` | `landing_intro` | `heroicon-o-sparkles` | 1 (Intro Section) | ~25 |
| 10 | `LandingGenesisTab.php` | `landing_genesis` | `heroicon-o-cpu-chip` | 1 (Genesis Section) | ~20 |
| 11 | `LandingForgeTab.php` | `landing_forge` | `heroicon-o-paint-brush` | 1 (Forge Section) | ~15 |
| 12 | `LandingWorkflowTab.php` | `landing_workflow` | `heroicon-o-queue-list` | 1 (Workflow Section) | ~12 |
| 13 | `LandingDirectorTab.php` | `landing_director` | `heroicon-o-video-camera` | 1 (Director Section) | ~25 |
| 14 | `LandingGalleryTab.php` | `landing_gallery` | `heroicon-o-photo` | 1 (Gallery Section) | ~15 |
| 15 | `LandingSoundTab.php` | `landing_sound` | `heroicon-o-musical-note` | 1 (Sound Section) | ~15 |
| 16 | `LandingEcosystemTab.php` | `landing_ecosystem` | `heroicon-o-globe-alt` | 1 (Ecosystem Section) | ~25 |
| 17 | `LandingStatsTab.php` | `landing_stats` | `heroicon-o-chart-bar` | 1 (Stats Section) | ~15 |
| 18 | `LandingVisionTab.php` | `landing_vision` | `heroicon-o-eye` | 1 (Vision Section) | ~30 |
| 19 | `FooterTab.php` | `landing_footer` | `heroicon-o-document-text` | 1 (Footer) | ~10 |

### Phase 2: Rewrite ManageGeneralSettings.php

Sau khi tạo các Tab class, viết lại `ManageGeneralSettings::form()`:

```php
public function form(Schema $schema): Schema
{
    return $schema
        ->components([
            Tabs::make('SettingsTabs')
                ->tabs([
                    // Core tabs
                    SettingsTabs\WebsiteTab::make(),
                    SettingsTabs\HeroTab::make(),
                    SettingsTabs\ShowcaseTab::make(),
                    SettingsTabs\AuthBackgroundTab::make(),
                    SettingsTabs\SeoTab::make(),
                    // Landing page tabs
                    SettingsTabs\LandingHeroTab::make(),
                    SettingsTabs\LandingPortalTab::make(),
                    SettingsTabs\LandingReelTab::make(),
                    SettingsTabs\LandingIntroTab::make(),
                    SettingsTabs\LandingGenesisTab::make(),
                    SettingsTabs\LandingForgeTab::make(),
                    SettingsTabs\LandingWorkflowTab::make(),
                    SettingsTabs\LandingDirectorTab::make(),
                    SettingsTabs\LandingGalleryTab::make(),
                    SettingsTabs\LandingSoundTab::make(),
                    SettingsTabs\LandingEcosystemTab::make(),
                    SettingsTabs\LandingStatsTab::make(),
                    SettingsTabs\LandingVisionTab::make(),
                    SettingsTabs\FooterTab::make(),
                ])
                ->columnSpanFull(),
        ]);
}
```

`ManageGeneralSettings` import list reduced from 9 → 2 (Tabs + Schema), plus the 19 tab classes.

### Phase 3: Verify

1. `docker exec backend-app-1 php artisan optimize:clear`
2. Open Filament admin → Cài đặt chung → verify all tabs render correctly
3. Verify save works (settings persisted)
4. No PHP errors in logs
5. `docker exec backend-app-1 php artisan test` → 18/18 still pass

---

## Edge Cases

1. **Website tab có `$timezones` collection** → Di chuyển vào `WebsiteTab::make()`, gọi `timezone_identifiers_list()` bên trong method.
2. **Tab dùng `use` import ở file gốc** (ví dụ `CuratorPicker`, `Select`, `TextInput`, `Asset`) → Mỗi Tab class sẽ tự import các dependency của riêng nó.
3. **Duplicate icon `heroicon-o-globe-alt`** giữa WebsiteTab và SeoTab, `heroicon-o-paint-brush` giữa LandingHero và LandingForge, `heroicon-o-film` giữa Showcase và LandingReel → OK, mỗi tab riêng biệt, trùng icon không ảnh hưởng.
4. **Tab có Repeater (ShowcaseTab)** → Vẫn dùng closure cho `->options(fn () => Asset::where(...))`, giữ nguyên logic.
5. **Admin email `afterStateHydrated`** trong WebsiteTab → Vẫn dùng closure tự tham chiếu đến `Models\User`, giữ nguyên.

## Risks & Trade-offs

| Risk | Mitigation |
|------|-----------|
| Mỗi Tab class tự import → duplicate import lines | Mỗi file ~5-10 dòng import, chấp nhận được. Tốt hơn 1 file khổng lồ. |
| Performance: 19 file autoload | Composer autoload PSR-4, không ảnh hưởng perf. |
| Tab class nào đó bị bỏ sót import | Phase 3 verify bằng cách mở admin page và check error log. |
| Sau refactor, thêm tab mới phải tạo file mới + sửa ManageGeneralSettings | Đúng, nhưng đây là trade-off có chủ đích: 2 file thay vì sửa 1 file 1000+ dòng. |

## Refactoring Principles

1. **1:1 copy-paste** — Không thay đổi logic, chỉ di chuyển code từ `ManageGeneralSettings::form()` vào `XxxTab::make()`.
2. **Không thay đổi field name, validation, tab ID** — Chỉ thay đổi vị trí code.
3. **Giữ nguyên tất cả label, description, helper text** tiếng Việt.
4. **Import tối thiểu** — Mỗi tab tự import components nó dùng.
5. **Static factory is stateless** — `make()` không nhận args, không có state.

---

## File Manifest

### Files to CREATE (19 files)

| # | File Path | Source Content From |
|---|-----------|---------------------|
| 1 | `backend/app/Filament/Pages/SettingsTabs/WebsiteTab.php` | Lines 49-104 of ManageGeneralSettings |
| 2 | `backend/app/Filament/Pages/SettingsTabs/HeroTab.php` | Lines 106-128 of ManageGeneralSettings |
| 3 | `backend/app/Filament/Pages/SettingsTabs/ShowcaseTab.php` | Lines 130-215 of ManageGeneralSettings |
| 4 | `backend/app/Filament/Pages/SettingsTabs/AuthBackgroundTab.php` | Lines 217-229 of ManageGeneralSettings |
| 5 | `backend/app/Filament/Pages/SettingsTabs/SeoTab.php` | Lines 232-261 of ManageGeneralSettings |
| 6 | `backend/app/Filament/Pages/SettingsTabs/LandingHeroTab.php` | Lines 263-297 of ManageGeneralSettings |
| 7 | `backend/app/Filament/Pages/SettingsTabs/LandingPortalTab.php` | Lines 299-331 of ManageGeneralSettings |
| 8 | `backend/app/Filament/Pages/SettingsTabs/LandingReelTab.php` | Lines 333-354 of ManageGeneralSettings |
| 9 | `backend/app/Filament/Pages/SettingsTabs/LandingIntroTab.php` | Lines 355-381 of ManageGeneralSettings |
| 10 | `backend/app/Filament/Pages/SettingsTabs/LandingGenesisTab.php` | Lines 382-403 of ManageGeneralSettings |
| 11 | `backend/app/Filament/Pages/SettingsTabs/LandingForgeTab.php` | Lines 404-421 of ManageGeneralSettings |
| 12 | `backend/app/Filament/Pages/SettingsTabs/LandingWorkflowTab.php` | Lines 422-434 of ManageGeneralSettings |
| 13 | `backend/app/Filament/Pages/SettingsTabs/LandingDirectorTab.php` | Lines 436-462 of ManageGeneralSettings |
| 14 | `backend/app/Filament/Pages/SettingsTabs/LandingGalleryTab.php` | Lines 463-484 of ManageGeneralSettings |
| 15 | `backend/app/Filament/Pages/SettingsTabs/LandingSoundTab.php` | Lines 485-506 of ManageGeneralSettings |
| 16 | `backend/app/Filament/Pages/SettingsTabs/LandingEcosystemTab.php` | Lines 507-533 of ManageGeneralSettings |
| 17 | `backend/app/Filament/Pages/SettingsTabs/LandingStatsTab.php` | Lines 534-555 of ManageGeneralSettings |
| 18 | `backend/app/Filament/Pages/SettingsTabs/LandingVisionTab.php` | Lines 556-587 of ManageGeneralSettings |
| 19 | `backend/app/Filament/Pages/SettingsTabs/FooterTab.php` | Lines 588-601 of ManageGeneralSettings |

### Files to EDIT (1 file)

| # | File Path | Change |
|---|-----------|--------|
| 1 | `backend/app/Filament/Pages/ManageGeneralSettings.php` | Rewrite `form()` thành thin orchestrator, cập nhật imports |

### Files to DELETE (0 files)

Không xóa file nào. `ManageGeneralSettings.php` được viết lại (in-place edit), không xóa.

---

## Effort Estimate

| Phase | Description | Est. |
|-------|-------------|------|
| Phase 0 | Tạo thư mục `SettingsTabs/` | 1m |
| Phase 1 | Tạo 19 Tab classes (copy-paste, wrap in class) | 30m |
| Phase 2 | Viết lại ManageGeneralSettings thin orchestrator | 10m |
| Phase 3 | Verify (clear cache, open admin, test save) | 15m |
| **Total** | | **~56m (≈ 1h)** |

---

## Sample Implementation

### complex tab: `WebsiteTab.php` (2 sections, timezone, closures)

```php
<?php

namespace App\Filament\Pages\SettingsTabs;

use App\Models\User;
use Filament\Forms\Components\Placeholder;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs\Tab;
use Awcodes\Curator\Components\Forms\CuratorPicker;

class WebsiteTab
{
    public static function make(): Tab
    {
        $timezones = collect(timezone_identifiers_list())
            ->mapWithKeys(fn($tz) => [$tz => $tz])
            ->toArray();

        return Tab::make('website')
            ->label('Thông tin website')
            ->icon('heroicon-o-globe-alt')
            ->schema([
                Section::make('Thông tin website')
                    ->columns(3)
                    ->schema([
                        Placeholder::make('app_url')
                            ->label('Địa chỉ trang web (URL)')
                            ->content(config('app.url'))
                            ->helperText('Đường dẫn lấy tự động từ file .env.')
                            ->columnSpan(1),
                        TextInput::make('site_name')
                            ->label('Tên Website')
                            ->required()
                            ->maxLength(255)
                            ->columnSpan(2),
                        Textarea::make('site_description')
                            ->label('Dòng mô tả')
                            ->rows(5)
                            ->maxLength(500)
                            ->columnSpan(2),
                        CuratorPicker::make('site_favicon')
                            ->label('Favicon / Logo')
                            ->columnSpan(1),
                        TextInput::make('admin_email')
                            ->label('Email Quản trị')
                            ->email()
                            ->afterStateHydrated(function (TextInput $component, $state) {
                                if (empty($state)) {
                                    $component->state(
                                        User::role('super_admin')->first()?->email
                                        ?? User::first()?->email
                                    );
                                }
                            })
                            ->maxLength(255)
                            ->columnSpan(2),
                        Toggle::make('site_active')
                            ->label('Kích hoạt Website')
                            ->inline(false)
                            ->columnSpan(1),
                    ]),
                Section::make('Định dạng Khu vực')
                    ->columns(3)
                    ->schema([
                        Select::make('timezone')
                            ->label('Múi giờ')
                            ->options($timezones)
                            ->searchable()
                            ->required(),
                        TextInput::make('date_format')
                            ->label('Định dạng ngày')
                            ->required(),
                        TextInput::make('time_format')
                            ->label('Định dạng giờ')
                            ->required(),
                    ]),
            ]);
    }
}
```

### complex tab with Repeater: `ShowcaseTab.php`

```php
<?php

namespace App\Filament\Pages\SettingsTabs;

use App\Models\Asset;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs\Tab;

class ShowcaseTab
{
    public static function make(): Tab
    {
        return Tab::make('showcase')
            ->label('Video Showcase')
            ->icon('heroicon-o-film')
            ->schema([
                Section::make('Danh sách Video Showcase')
                    ->description('Hiển thị trên trang chủ dashboard. Chọn video từ thư viện assets.')
                    ->schema([
                        Repeater::make('showcase_items')
                            ->label('')
                            ->schema([
                                Select::make('asset_id')
                                    ->label('Chọn video')
                                    ->searchable()
                                    ->options(fn () => Asset::where('type', 'video')
                                        ->orderBy('created_at', 'desc')
                                        ->get()
                                        ->mapWithKeys(fn ($a) => [
                                            $a->uuid => substr($a->original_name, 0, 40)
                                                . ' | ' . round($a->size_bytes / 1024 / 1024, 1) . 'MB'
                                                . ' | ' . $a->created_at->format('d/m/Y')
                                        ])
                                        ->toArray())
                                    ->required()
                                    ->columnSpan(2),
                                // ... rest of schema
                            ])
                            ->columns(4)
                            ->addActionLabel('+ Thêm video')
                            ->reorderable()
                            ->defaultItems(0)
                            ->collapsible()
                            ->cloneable(),
                    ]),
            ]);
    }
}
```

### simple tab: `LandingWorkflowTab.php` (1 field)

```php
<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs\Tab;

class LandingWorkflowTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_workflow')
            ->label('Landing Workflow')
            ->icon('heroicon-o-queue-list')
            ->schema([
                Section::make('Workflow Section')
                    ->description('Text hiển thị ở Workflow section trên landing page. Để trống để dùng text mặc định.')
                    ->columns(2)
                    ->schema([
                        TextInput::make('workflow_label')
                            ->label('Label')
                            ->maxLength(50)
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}
```

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Files | 1 (`ManageGeneralSettings.php`) | 20 (`ManageGeneralSettings.php` + 19 tab classes) |
| Lines in main file | 604 | ~40 |
| Max lines in any file | 604 | ~90 (ShowcaseTab, WebsiteTab) |
| Add new tab | Edit 604-line file | Create 1 new class + add 1 line in orchestrator |
| Merge conflicts | High (all tabs in 1 file) | Low (tabs are separate files) |
| IDE autocomplete | Cluttered | Clean per-tab scope |
