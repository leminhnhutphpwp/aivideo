# Landing Page Settings — Design Plan

## Date
2026-05-31

## Overview
Admin có thể quản lý toàn bộ nội dung text của landing page (hero, portal, section labels, headings) thông qua Filament Settings, thay vì phải deploy code mỗi khi sửa text. Frontend đọc từ API public `GET /api/landing-page` và fallback về hardcoded defaults nếu field trống.

## User Stories
- As an **admin**, I want to edit landing page hero/CTA text without deploying code → nhanh chóng A/B test, điều chỉnh marketing.
- As an **admin**, I want the Vietnamese landing page text managed from one place → không cần mở code, không cần dev.
- As a **visitor**, I see dynamic, up-to-date landing page content → trải nghiệm nhất quán.

---

## Text Inventory (Current Hardcoded)

### 1. Hero Section (`hero-section.tsx`)
| # | Field | Current hardcoded value | Line |
|---|-------|------------------------|------|
| H1 | Label badge | `"Viral Video Platform"` | 178 |
| H2 | Title line 1 | `"Tạo nhanh"` | 188 |
| H3 | Title line 2 | `"sức hút viral"` | 191 |
| H4 | Subtitle | `"Biến ý tưởng thành video triệu view chỉ trong vài phút..."` | 197 |
| H5 | CTA text | `"Trải nghiệm miễn phí"` | 203 |
| H6 | CTA URL | `"/dashboard"` | 202 |

### 2. Portal Section (`portal-section.tsx`)
| # | Field | Current hardcoded value | Line |
|---|-------|------------------------|------|
| P1 | Label morph texts | `["THE END", "IS JUST", "THE BEGINNING"]` | 112 |
| P2 | Title line 1 | `"Câu chuyện của bạn"` | 122 |
| P3 | Title line 2 | `"bắt đầu từ đây."` | 124 |
| P4 | Subtitle | `"Studio sẵn sàng. Máy quay đang chờ..."` | 130 |
| P5 | CTA text | `"Vào Studio"` | 137 |
| P6 | Login prompt | `"Đã có tài khoản? Đăng nhập"` | 145-147 |

### 3. Intro Section (`intro-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| I1 | Badge | `"Social Video Automation"` |
| I2 | Title line 1 | `"Sáng Tạo"` |
| I3 | Title line 2 | `"Video Viral"` |
| I4 | Description | `"Giải pháp sản xuất video tự động..."` |
| I5 | Feature pills | `["Tự động tạo script viral", ...]` (3 items) |

### 4. Reel Section (`reel-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| R1 | Label | `"Showreel"` |
| R2 | Title | `"Mọi phong cách. Mọi thế giới."` |

### 5. Genesis Section (`genesis-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| G1 | Label | `"Cốt Lõi Công Nghệ"` |
| G2 | Title line 1 | `"Một Ý Tưởng."` |
| G3 | Title line 2 | `"Triệu Lượt Xem."` |

### 6. Forge Section (`forge-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| F1 | Label | `"Style Engine"` |
| F2 | CTA text | `"Tạo ngay với phong cách này"` |

### 7. Director Section (`director-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| D1 | Label | `"Master Control"` |
| D2 | Title | `"Bạn là Content Creator."` |
| D3 | Description | `"Tự thiết lập khung hình, ánh sáng & âm thanh..."` |

### 8. Sound Section (`sound-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| S1 | Label | `"Trải Nghiệm Âm Thanh"` |
| S2 | Title | `"Cảm Xúc Từ Từng Tần Số."` |

### 9. Ecosystem Section (`ecosystem-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| E1 | Label | `"Hệ Sinh Thái Toàn Diện"` |
| E2 | Title line 1 | `"Một Nền Tảng."` |
| E3 | Title line 2 | `"Vạn Khả Năng."` |
| E4 | Description | `"Mọi công cụ mạnh mẽ nhất đều hội tụ..."` |

### 10. Gallery Section (`gallery-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| GL1 | Label | `"Phong Cách"` |
| GL2 | Title | `"Tạo ra bởi AI. Đẹp như điện ảnh."` |

### 11. Vision Section (`vision-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| V1 | Label | `"ĐIỀU KHIỂN"` |
| V2 | Title | `"Bạn là Director."` |
| V3 | Description 1 | `"Chọn góc máy. Điều chỉnh ánh sáng..."` |
| V4 | Description 2 | `"Đây không phải là bộ lọc..."` |

### 12. Workflow Section (`workflow-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| W1 | Label | `"Quy Trình Hoạt Động"` |

### 13. Stats Section (`stats-section.tsx`)
| # | Field | Current hardcoded value |
|---|-------|------------------------|
| ST1 | Title | (none — uses GlassCard layout, stats data hardcoded) |

---

## Technical Design

### Data Flow
```
Admin (Filament) → ManageGeneralSettings.php → GeneralSettings.php (Spatie Laravel Settings)
                                                         │
                                              DB table: settings (key-value)
                                                         │
Frontend ← GET /api/landing-page (public, rate-limited) ← PHP closure reads GeneralSettings
    │
    └── Component receives settings as props (or via hook)
    └── Falls back to hardcoded Vietnamese defaults if field empty/null
```

### Decision: Public API vs. Server-Side Props

**Chọn: Public API endpoint** vì landing page hiện là **static Next.js page** (`app/page.tsx`), không cần auth. Server-side fetch (SSR/ISR) cũng là 1 option nhưng phức tạp hơn. Đơn giản nhất là:

1. Backend: `GET /api/landing-page` — public, rate-limited (30 req/min)
2. Frontend: `useEffect` hoặc `fetch` tại `page.tsx`, truyền xuống sections qua props hoặc context

Có thể nâng cấp lên ISR sau (revalidate mỗi 60s).

### API Contract

#### `GET /api/landing-page` (Public, no auth)

Response:
```json
{
  "success": true,
  "data": {
    "hero": {
      "label": "Viral Video Platform",
      "title_line1": "Tạo nhanh",
      "title_line2": "sức hút viral",
      "subtitle": "Biến ý tưởng thành video triệu view...",
      "cta_text": "Trải nghiệm miễn phí",
      "cta_url": "/dashboard"
    },
    "portal": {
      "label_texts": ["THE END", "IS JUST", "THE BEGINNING"],
      "title_line1": "Câu chuyện của bạn",
      "title_line2": "bắt đầu từ đây.",
      "subtitle": "Studio sẵn sàng...",
      "cta_text": "Vào Studio",
      "login_prompt": "Đã có tài khoản? Đăng nhập"
    },
    "labels": {
      "intro": "Social Video Automation",
      "reel": "Showreel",
      "genesis": "Cốt Lõi Công Nghệ",
      "forge": "Style Engine",
      "workflow": "Quy Trình Hoạt Động",
      "director": "Master Control",
      "sound": "Trải Nghiệm Âm Thanh",
      "ecosystem": "Hệ Sinh Thái Toàn Diện",
      "gallery": "Phong Cách",
      "vision": "ĐIỀU KHIỂN"
    },
    "headings": {
      "intro_title1": "Sáng Tạo",
      "intro_title2": "Video Viral",
      "intro_desc": "Giải pháp sản xuất...",
      "reel_title": "Mọi phong cách. Mọi thế giới.",
      "genesis_title1": "Một Ý Tưởng.",
      "genesis_title2": "Triệu Lượt Xem.",
      "forge_cta": "Tạo ngay với phong cách này",
      "director_title": "Bạn là Content Creator.",
      "director_desc": "Tự thiết lập khung hình...",
      "sound_title": "Cảm Xúc Từ Từng Tần Số.",
      "ecosystem_title1": "Một Nền Tảng.",
      "ecosystem_title2": "Vạn Khả Năng.",
      "ecosystem_desc": "Mọi công cụ mạnh mẽ nhất...",
      "gallery_title": "Tạo ra bởi AI. Đẹp như điện ảnh.",
      "vision_label": "ĐIỀU KHIỂN",
      "vision_title": "Bạn là Director.",
      "vision_desc1": "Chọn góc máy. Điều chỉnh ánh sáng...",
      "vision_desc2": "Đây không phải là bộ lọc..."
    }
  }
}
```

### Database Changes

Không cần migration mới. Spatie Laravel Settings lưu trong bảng `settings` (key-value). Các field mới được tự động serialize vào JSON column.

### Frontend Integration Pattern

```tsx
// Pattern: Component nhận settings qua props, fallback hardcoded defaults
interface HeroSettings {
  label?: string;
  title_line1?: string;
  title_line2?: string;
  subtitle?: string;
  cta_text?: string;
  cta_url?: string;
}

const DEFAULTS: HeroSettings = {
  label: "Viral Video Platform",
  title_line1: "Tạo nhanh",
  title_line2: "sức hút viral",
  subtitle: "Biến ý tưởng thành video triệu view...",
  cta_text: "Trải nghiệm miễn phí",
  cta_url: "/dashboard",
};

export function HeroSection({ settings }: { settings?: HeroSettings }) {
  const s = { ...DEFAULTS, ...settings };
  // ... use s.title_line1, s.subtitle, etc.
}
```

---

## Phase Breakdown

### Phase 1 — Minimal: Hero + Portal (2 tabs, 11 fields)
**Target**: Cho phép admin sửa quick-win marketing text (hero CTA, portal CTA).

| # | Field | Type | Label tiếng Việt | Default |
|---|-------|------|-----------------|---------|
| 1 | `hero_label` | string (nullable) | Badge Hero | "Viral Video Platform" |
| 2 | `hero_title_line1` | string | Tiêu đề dòng 1 | "Tạo nhanh" |
| 3 | `hero_title_line2` | string | Tiêu đề dòng 2 | "sức hút viral" |
| 4 | `hero_subtitle` | text | Mô tả Hero | (hardcoded) |
| 5 | `hero_cta_text` | string | Text nút CTA | "Trải nghiệm miễn phí" |
| 6 | `hero_cta_url` | string | Link CTA | "/dashboard" |
| 7 | `portal_label_texts` | text (JSON array) | Label portal (JSON) | `["THE END","IS JUST","THE BEGINNING"]` |
| 8 | `portal_title_line1` | string | Tiêu đề dòng 1 | "Câu chuyện của bạn" |
| 9 | `portal_title_line2` | string | Tiêu đề dòng 2 | "bắt đầu từ đây." |
| 10 | `portal_subtitle` | text | Mô tả Portal | (hardcoded) |
| 11 | `portal_cta_text` | string | Text nút CTA | "Vào Studio" |

**Effort**: ~3h (Backend: 1.5h, Frontend: 1.5h)

### Phase 2 — Section Labels & Headings (4 tabs, ~25 fields)
**Target**: Admin sửa được tất cả section labels và headings chính.

Tổ chức thành 4 tab:
- **Tab "Intro & Reel"**: intro_label, intro_title1, intro_title2, intro_desc, reel_label, reel_title
- **Tab "Genesis & Forge & Workflow"**: genesis_label, genesis_title1, genesis_title2, forge_label, forge_cta, workflow_label
- **Tab "Director & Sound & Gallery"**: director_label, director_title, director_desc, sound_label, sound_title, gallery_label, gallery_title
- **Tab "Ecosystem & Vision"**: ecosystem_label, ecosystem_title1, ecosystem_title2, ecosystem_desc, vision_label, vision_title, vision_desc1, vision_desc2

**Effort**: ~5h (Backend: 2h, Frontend: 3h)

### Phase 3 — Advanced Content (chưa plan)
- Quản lý ảnh/video demo từng section
- Showcase items (đã có sẵn `showcase_items` array)
- Stats data, workflow steps, style catalog → cần data model phức tạp hơn (Elast/DB table hoặc JSON editor)
- **Recommendation**: Skip now, keep hardcoded

---

## Implementation Tasks

### Phase 1 Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
| 1 | Backend | Thêm 11 field vào `GeneralSettings.php` (hero_*, portal_*) | @backend | 15m |
| 2 | Backend | Thêm tab "Landing Hero" + "Landing Portal" vào `ManageGeneralSettings.php` | @backend | 45m |
| 3 | Backend | Tạo public API `GET /api/landing-page` trong `routes/api.php` | @backend | 30m |
| 4 | Backend | Viết test cho API endpoint | @tester | 15m |
| 5 | Web | Tạo `LandingSettingsContext` / hook `useLandingSettings()` fetch API | @web | 30m |
| 6 | Web | Refactor `HeroSection` nhận settings props, fallback defaults | @web | 30m |
| 7 | Web | Refactor `PortalSection` nhận settings props, fallback defaults | @web | 30m |

### Phase 2 Tasks

| # | Layer | Task | Agent | Est. |
|---|-------|------|-------|------|
| 8 | Backend | Thêm ~24 section label/heading fields vào `GeneralSettings.php` | @backend | 20m |
| 9 | Backend | Thêm 4 tab section content vào `ManageGeneralSettings.php` | @backend | 1h |
| 10 | Backend | Cập nhật API `/api/landing-page` trả thêm `labels` + `headings` | @backend | 15m |
| 11 | Web | Refactor tất cả 11 section components nhận settings props | @web | 2h |
| 12 | Web | Tích hợp context vào `page.tsx`, fetch 1 lần, pass xuống | @web | 45m |
| 13 | Web | Verify typecheck, test manual landing page | @tester | 30m |

---

## Edge Cases

1. **Admin để trống field** → API trả về `null`, frontend fallback về hardcoded default.
2. **API lỗi / không reachable** → Frontend vẫn hiển thị bình thường với hardcoded defaults (graceful degradation).
3. **Rate limit** → `GET /api/landing-page` dùng `ThrottleApiRequests:30,1` (30 req/phút, đủ cho landing page traffic).
4. **Cache** → Có thể cache response 60s với `Cache::remember()` để giảm DB hit.
5. **Portal label morph** → là JSON array `["A", "B", "C"]`, frontend parse JSON → string[].

## Risks & Trade-offs

| Risk | Mitigation |
|------|-----------|
| Quá nhiều field trong GeneralSettings (bloat) | Dùng nullable, chỉ serialize field có giá trị. Spatie tự động xử lý. |
| Admin nhập sai format JSON (portal_label_texts) | Validation `json` trong Filament; dùng `->rules(['json'])` |
| Frontend fetch API mỗi lần load landing page | Cache 60s server-side; có thể nâng cấp ISR sau |
| Breaking change với section components hiện tại | Thêm props optional, giữ nguyên default export behavior nếu không truyền props |

---

## Code Mẫu

### `GeneralSettings.php` — Phase 1 additions

```php
// === Landing Page — Hero ===
public ?string $hero_label;
public ?string $hero_title_line1;
public ?string $hero_title_line2;
public ?string $hero_subtitle;
public ?string $hero_cta_text;
public ?string $hero_cta_url;

// === Landing Page — Portal ===
public ?string $portal_label_texts; // JSON array string
public ?string $portal_title_line1;
public ?string $portal_title_line2;
public ?string $portal_subtitle;
public ?string $portal_cta_text;
```

### `ManageGeneralSettings.php` — Tab additions

```php
Tab::make('landing_hero')
    ->label('Landing Hero')
    ->icon('heroicon-o-home')
    ->schema([
        Section::make('Hero Section')
            ->description('Nội dung phần Hero (trang chủ landing page)')
            ->columns(2)
            ->schema([
                TextInput::make('hero_label')
                    ->label('Badge nhỏ')
                    ->placeholder('Viral Video Platform')
                    ->maxLength(100),
                TextInput::make('hero_title_line1')
                    ->label('Tiêu đề dòng 1')
                    ->placeholder('Tạo nhanh')
                    ->maxLength(255),
                TextInput::make('hero_title_line2')
                    ->label('Tiêu đề dòng 2')
                    ->placeholder('sức hút viral')
                    ->maxLength(255),
                Textarea::make('hero_subtitle')
                    ->label('Mô tả')
                    ->rows(3)
                    ->maxLength(500),
                TextInput::make('hero_cta_text')
                    ->label('Text nút CTA')
                    ->placeholder('Trải nghiệm miễn phí')
                    ->maxLength(100),
                TextInput::make('hero_cta_url')
                    ->label('Link CTA')
                    ->placeholder('/dashboard')
                    ->url()
                    ->maxLength(255),
            ]),
    ]),

Tab::make('landing_portal')
    ->label('Landing Portal')
    ->icon('heroicon-o-arrow-right-circle')
    ->schema([
        Section::make('Portal/CTA Section')
            ->description('Nội dung phần CTA cuối trang landing page')
            ->columns(2)
            ->schema([
                Textarea::make('portal_label_texts')
                    ->label('Text label xoay vòng (JSON)')
                    ->placeholder('["THE END","IS JUST","THE BEGINNING"]')
                    ->rows(2)
                    ->helperText('Nhập mảng JSON, VD: ["A", "B", "C"]. Mỗi text một dòng chạy morph.')
                    ->rules(['json']),
                TextInput::make('portal_title_line1')
                    ->label('Tiêu đề dòng 1')
                    ->placeholder('Câu chuyện của bạn')
                    ->maxLength(255),
                TextInput::make('portal_title_line2')
                    ->label('Tiêu đề dòng 2')
                    ->placeholder('bắt đầu từ đây.')
                    ->maxLength(255),
                Textarea::make('portal_subtitle')
                    ->label('Mô tả')
                    ->rows(3)
                    ->maxLength(500),
                TextInput::make('portal_cta_text')
                    ->label('Text nút CTA')
                    ->placeholder('Vào Studio')
                    ->maxLength(100),
            ]),
    ]),
```

### `routes/api.php` — Public landing page endpoint

```php
// Public: Landing page content settings
Route::get('/landing-page', function () {
    $settings = app(\App\Settings\GeneralSettings::class);

    return response()->json([
        'success' => true,
        'data' => [
            'hero' => [
                'label' => $settings->hero_label,
                'title_line1' => $settings->hero_title_line1,
                'title_line2' => $settings->hero_title_line2,
                'subtitle' => $settings->hero_subtitle,
                'cta_text' => $settings->hero_cta_text,
                'cta_url' => $settings->hero_cta_url,
            ],
            'portal' => [
                'label_texts' => $settings->portal_label_texts
                    ? json_decode($settings->portal_label_texts, true)
                    : null,
                'title_line1' => $settings->portal_title_line1,
                'title_line2' => $settings->portal_title_line2,
                'subtitle' => $settings->portal_subtitle,
                'cta_text' => $settings->portal_cta_text,
            ],
            // Phase 2 additions below...
        ],
    ]);
})->middleware(ThrottleApiRequests::class . ':30,1');
```

### Frontend — `useLandingSettings` hook

```ts
// apps/web/src/hooks/use-landing-settings.ts
"use client";

import { useState, useEffect } from "react";

interface LandingSettings {
  hero: { ... };
  portal: { ... };
  labels: { ... };
  headings: { ... };
}

const FALLBACK: LandingSettings = { /* hardcoded defaults */ };

export function useLandingSettings(): LandingSettings {
  const [settings, setSettings] = useState<LandingSettings>(FALLBACK);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing-page`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({ ...FALLBACK, ...json.data });
        }
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  return settings;
}
```

---

## Estimate Summary

| Phase | Scope | Effort |
|-------|-------|--------|
| Phase 1 | Hero + Portal (11 fields, 2 tabs, 1 API, 2 components) | ~3h |
| Phase 2 | Section labels + headings (~25 fields, 4 tabs, 11 components) | ~5h |
| **Total** | | **~8h** |

---

## File Manifest

| File | Action |
|------|--------|
| `backend/app/Settings/GeneralSettings.php` | **Edit** — thêm 11-35 nullable fields |
| `backend/app/Filament/Pages/ManageGeneralSettings.php` | **Edit** — thêm 2-6 tabs |
| `backend/routes/api.php` | **Edit** — thêm `GET /api/landing-page` |
| `apps/web/src/hooks/use-landing-settings.ts` | **New** — fetch hook |
| `apps/web/src/app/page.tsx` | **Edit** — wrap with context/provider |
| `apps/web/src/sections/hero-section.tsx` | **Edit** — nhận props |
| `apps/web/src/sections/portal-section.tsx` | **Edit** — nhận props |
| `apps/web/src/sections/*.tsx` (11 files) | **Edit** — nhận props (Phase 2) |
