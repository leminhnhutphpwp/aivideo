# 2026-05-31 — Worklog Tổng Hợp

## Date
2026-05-31

---

## I. Pricing System

### Files Changed
| File | Change |
|------|--------|
| `backend/database/seeders/PricingSystemSeeder.php` | DurationTier: 5s=0.78, 10s=1.75, 15s=3.0, +20s=4.67, 30s=8.40; QualityTier premium/ultra multiplier=1.0; xóa addons |
| `backend/database/seeders/PlanSeeder.php` | Free=2.000, Pro=18.000/210k, Studio=coming_soon |
| `backend/database/seeders/CreditSettingsSeeder.php` | Gọn còn 3: exchange_rate, min/max_purchase_amount |
| `backend/database/seeders/EmailTemplateSeeder.php` | +template `plan_upgraded` |
| `backend/app/Models/Plan.php` | Thêm `price_regular`, `price_sale` vào `$fillable` |
| `backend/app/Services/CreditCalculator.php` | `calculate()` delegate sang `PricingCalculator` |
| `backend/app/Services/Pricing/PricingCalculator.php` | Image types skip duration/resolution; xóa addon logic |
| `backend/app/Http/Controllers/API/CreditController.php` | Validation min/max từ `CreditSetting::get()` |
| `backend/app/Http/Requests/Pricing/CalculatePricingRequest.php` | Xóa addons validation |
| `backend/app/Filament/Pages/PricingTable.php` | Xóa `getAddonsProperty()` |
| `backend/app/Filament/Resources/CreditSettings/Tables/CreditSettingsTable.php` | Fix format VNĐ hiển thị |
| `backend/app/Filament/Resources/NotificationResource.php` | Email template select dynamic từ DB |
| `backend/app/Models/PricingAddon.php` | **Đã xóa** |
| `backend/app/Filament/Resources/PricingAddons/` | **Đã xóa** — 6 files |
| `backend/resources/views/emails/plan_upgraded.blade.php` | **Tạo mới** |
| DB `pricing_addons` | **Đã drop** |
| `docs/plans/billing/final-pricing-plan.md` | Plan tổng hợp cuối cùng |

### Key Decisions
1. Margin tăng dần: 5s=10%, 10s=20%, 15s=30%, 20s=40%, 30s=50%
2. Pro 210k/tháng, 18.000 credits. Studio coming_soon
3. Quality tier không nhân giá (multiplier=1.0), chỉ ảnh hưởng model
4. CreditCalculator → PricingCalculator: 1 công thức duy nhất
5. Image flat fee, không nhân duration/resolution
6. Xóa toàn bộ PricingAddon

---

## II. Landing Page — Settings (Admin)

### Overview
Toàn bộ text landing page (44 fields) giờ quản lý được từ `/admin/manage-general-settings`.

### Files Changed
| File | Change |
|------|--------|
| `backend/app/Settings/GeneralSettings.php` | +34 fields cho 12 section landing page |
| `backend/app/Filament/Pages/ManageGeneralSettings.php` | Refactor: 57 dòng, gọi 6 Tab class |
| `backend/app/Filament/Pages/SettingsTabs/LandingPageTab.php` | 1 tab gộp toàn bộ 14 section với Section collapsible |
| `backend/app/Filament/Pages/SettingsTabs/WebsiteTab.php` | Tách từ ManageGeneralSettings |
| `backend/app/Filament/Pages/SettingsTabs/HeroTab.php` | Tách |
| `backend/app/Filament/Pages/SettingsTabs/ShowcaseTab.php` | Tách |
| `backend/app/Filament/Pages/SettingsTabs/AuthBackgroundTab.php` | Tách |
| `backend/app/Filament/Pages/SettingsTabs/SeoTab.php` | Tách |
| `backend/routes/api.php` | `GET /api/landing-page` — 44 fields JSON |
| `apps/web/src/hooks/use-landing-settings.ts` | Hook fetch API + DEFAULTS fallback |
| `apps/web/src/sections/hero-section.tsx` | Dynamic text từ `ls.*` |
| `apps/web/src/sections/reel-section.tsx` | Dynamic text |
| `apps/web/src/sections/intro-section.tsx` | Dynamic text + feature pills |
| `apps/web/src/sections/genesis-section.tsx` | Dynamic text |
| `apps/web/src/sections/forge-section.tsx` | Dynamic text |
| `apps/web/src/sections/workflow-section.tsx` | Dynamic text |
| `apps/web/src/sections/director-section.tsx` | Dynamic text |
| `apps/web/src/sections/gallery-section.tsx` | Dynamic text |
| `apps/web/src/sections/sound-section.tsx` | Dynamic text |
| `apps/web/src/sections/ecosystem-section.tsx` | Dynamic text |
| `apps/web/src/sections/stats-section.tsx` | Dynamic text |
| `apps/web/src/sections/vision-section.tsx` | Dynamic text |
| `apps/web/src/sections/portal-section.tsx` | Dynamic text + login text |
| `apps/web/src/components/landing/footer.tsx` | Dynamic copyright + link URLs |

---

## III. Landing Page — Mobile Optimization

| Section | Fix |
|---------|-----|
| Forge (Style Engine) | Bỏ `min-h-[100dvh]` mobile, spacer chỉ `lg:block` |
| Workflow (Quy Trình) | Bỏ `min-h-[100dvh]` mobile, spacer chỉ `lg:block` |
| Ecosystem (Hệ Sinh Thái) | Bỏ `min-h-[100dvh]`, grid `flex-1` → `lg:flex-1`, `min-h-[200px]` cards |
| Sound (Âm Thanh) | Bỏ `min-h-[100dvh]`, accordion `flex-1` → `lg:flex-1`, description visible mobile |

---

## IV. Landing Page — Visual Fixes

| Fix | File |
|-----|------|
| SectionLabel `whitespace-nowrap` — "Phong Cách" không rớt 1 chữ | `section-label.tsx` |
| Giảm độ tối ảnh: brightness 0.4→0.6, bỏ grayscale (Workflow, Ecosystem, Forge, Sound, Genesis) | 6 section files |
| Tăng glow orb: opacity 0.03→0.08 (Ecosystem, Sound, Genesis, Stats) | 4 section files |
| GlowButton responsive size mobile | `glow-button.tsx` |
| Hero button nhỏ hơn mobile, bỏ "Xem Cách Hoạt Động" | `hero-section.tsx` |
| Preloader chỉ hiện %, bỏ text "Đang khởi động..." | `preloader.tsx` |

---

## V. SEO

| Fix | File |
|-----|------|
| og-image.svg: "HORIZON AI" → "Wavise Studio" | `public/og-image.svg` |
| Sitemap: 3 → 17 URLs | `sitemap.ts` |
| 13 Server Shells render text cho Googlebot | `sections/server/*-shell.tsx` |
| 13 Client Components + `hideText` prop | `sections/*.tsx` |
| page.tsx import từ Shell | `app/page.tsx` |

---

## VI. Verification

- [x] Backend tests: 19/19 passed
- [x] Daemon tsc: clean
- [x] Web tsc: clean
- [x] API `/pricing/calculate`: 5s=1560, 10s=3500, 30s=16800
- [x] API `/plans`: Pro=210k, Studio=coming_soon
- [x] API `/landing-page`: 44 fields JSON
- [x] Email templates: 13/13 render OK
- [x] CreditSettings: 3 settings, format VNĐ đúng

---

## Plans Created
- `docs/plans/billing/final-pricing-plan.md`
- `docs/plans/ui/landing-page-settings.md`
- `docs/plans/ui/manage-general-settings-refactor.md`
- `docs/plans/ui/server-render-landing-seo.md`

## Plans Deleted (deprecated)
- `docs/plans/billing/daily-weekly-monthly-credit-cap.md`
- `docs/plans/billing/pricing-strategy-research.md`
- `docs/plans/billing/pricing-strategy-vn-market.md`
- `docs/plans/billing/video-duration-profit-margin.md`
