# Pricing Plan Final — Worklog

## Date
2026-05-31

## Overview
Chốt kế hoạch giá cuối cùng cho Wavise Studio. Điều chỉnh DurationTier multipliers theo margin tăng dần (10%→50%), cập nhật PlanSeeder, cleanup CreditSettings.

## Files Changed

| File | Change |
|------|--------|
| `backend/database/seeders/PricingSystemSeeder.php` | DurationTier: 5s=0.78, 10s=1.75, 15s=3.0, +20s=4.67, 30s=8.40 |
| `backend/database/seeders/PlanSeeder.php` | Free=2.000, Pro=18.000/210k, Studio=coming_soon |
| `backend/database/seeders/CreditSettingsSeeder.php` | Gọn còn 3 settings: exchange_rate, min/max_purchase_amount |
| `backend/app/Models/Plan.php` | Thêm `price_regular`, `price_sale` vào `$fillable` |
| `backend/app/Http/Controllers/API/CreditController.php` | Validation min/max giờ đọc từ `CreditSetting::get()` thay vì hardcode |
| `backend/app/Services/CreditCalculator.php` | `calculate()` giờ delegate sang `PricingCalculator` thay vì config cứng |
| `backend/app/Services/Pricing/PricingCalculator.php` | Image types (image_generation, image_editing) skip duration/resolution multiplier; xóa addon logic |
| `backend/app/Http/Requests/Pricing/CalculatePricingRequest.php` | Xóa validation rules cho addons |
| `backend/database/seeders/PricingSystemSeeder.php` | QualityTier premium/ultra multiplier=1.0; xóa toàn bộ addons seeding |
| `backend/app/Filament/Pages/PricingTable.php` | Xóa `getAddonsProperty()` |
| `backend/app/Models/PricingAddon.php` | **Đã xóa** — dead code |
| `backend/app/Filament/Resources/PricingAddons/` | **Đã xóa** — 6 files |
| `backend/tests/Unit/PricingCalculatorTest.php` | Xóa addon tests |
| `backend/tests/Feature/PricingApiTest.php` | Xóa addon tests |
| `backend/tests/Feature/PricingSecurityTest.php` | Xóa addon tests |
| `backend/tests/Feature/RenderJobTest.php` | Cập nhật expected values cho CreditCalculator mới |
| DB `pricing_addons` | **Đã drop** bảng |
| `docs/plans/billing/final-pricing-plan.md` | Plan tổng hợp cuối cùng (gộp 4 plans cũ) |

## Key Decisions

1. **Margin tăng dần theo duration**: 5s=10%, 10s=20%, 15s=30%, 20s=40%, 30s=50%. Video ngắn giá mềm hút user, video dài lời nhiều.
2. **Chỉ tập trung Free + Pro** — Studio để status `coming_soon`, chưa có giá.
3. **Pro 210k/tháng, 18.000 credits** (~11 video 5s). Mua gói rẻ hơn nạp lẻ 47%.
4. **Credit Pack lẻ** 50k/100k/200k — margin cao hơn subscription, không hết hạn.
5. **Giữ exchange_rate = 0.1** (1 credit = 10đ) — số tròn, không phá vỡ hệ thống hiện tại.
6. **Quality tier không nhân giá** — premium/ultra multiplier = 1.0, chỉ ảnh hưởng model AI.
7. **CreditCalculator thống nhất về PricingCalculator** — xóa hardcode config, dùng chung 1 công thức.
8. **Image flat fee** — image_generation/image_editing không bị nhân duration/resolution.
9. **Xóa PricingAddon** — không còn dùng, xóa model + resource + table + tests.

## Verification

- [x] DurationTier multipliers: 5s=0.78, 10s=1.75, 15s=3.0, 20s=4.67, 30s=8.40
- [x] API `/pricing/calculate` 5s → 1.560 credits ✅
- [x] API `/pricing/calculate` 30s → 16.800 credits ✅
- [x] API `/plans` → Pro=210k, Studio=coming_soon ✅
- [x] Backend tests 19/19 passed ✅
- [x] Daemon `tsc --noEmit` clean ✅
- [x] Web `tsc --noEmit` clean ✅
- [x] CreditSettings DB: 3 settings only (exchange_rate, min/max_purchase) ✅

## Plans Deleted (deprecated)
- `docs/plans/billing/daily-weekly-monthly-credit-cap.md`
- `docs/plans/billing/pricing-strategy-research.md`
- `docs/plans/billing/pricing-strategy-vn-market.md`
- `docs/plans/billing/video-duration-profit-margin.md`

## Handoff Notes
- **@web cần cập nhật**: `toSnapshot()` trả về `price_regular`, frontend cần hiển thị giá mới 210k cho Pro. Studio hiển thị badge "Sắp ra mắt".
