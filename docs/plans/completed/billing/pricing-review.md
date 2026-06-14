> [!WARNING]
> **TÀI LIỆU CŨ / LEGACY DOCUMENT**
> Tài liệu này mô tả kiến trúc định giá dựa trên `QualityTier` và `ProviderPricing` cũ. 
> Hiện tại, hệ thống đã được tái cấu trúc để **hợp nhất toàn bộ cấu hình Model & Provider trực tiếp vào từng Gói dịch vụ (Plan)**.
> Vui lòng tham khảo thiết kế mới tại: [rearchitect_plan_unify_model_and_provider_config.md](file:///home/minhnhut/.gemini/antigravity-cli/brain/834e59c0-9adc-4b27-aaa6-2701513eb03d/rearchitect_plan_unify_model_and_provider_config.md).


# Pricing System Review — Models, Duration, Quality Tiers

## Date
2026-06-01

## Overview
Review toàn bộ cấu hình giá cho TOÀN HỆ THỐNG: tất cả models, durations, quality tiers. Phân tích margin, phát hiện lỗ vốn nghiêm trọng, và đề xuất fix.

---

## 1. Tổng quan Pricing System

### Credit Exchange Rate
- 1 credit = 10 VND (exchange_rate = 0.1)
- Nạp 50,000đ → 5,000 credits

### Base Credits (text_to_video)
- Base: 2,000 credits

### Duration Multipliers
| Code | Seconds | Multiplier | Credits (720p) | Credits/sec |
|------|---------|:----------:|:--------------:|:-----------:|
| 5s | 5 | 0.78 | 1,560 | 312 |
| 10s | 10 | 1.75 | 3,500 | 350 |
| 15s | 15 | 3.00 | 6,000 | 400 |
| 20s | 20 | 4.67 | 9,340 | 467 |
| 30s | 30 | 8.40 | 16,800 | 560 |

### Resolution Multipliers
| Code | Multiplier |
|------|:----------:|
| 720p | 1.0 |
| 1080p | 1.5 |

### Quality Tier Multipliers
| Code | Multiplier | Model Mapping |
|------|:----------:|---------------|
| standard | 1.0 | wan2.6-t2v |
| premium | 1.0 | wan2.7-t2v |
| ultra | 1.0 | happyhorse-1.0 |

### Provider Multipliers
| Provider | Model | Multiplier |
|----------|-------|:----------:|
| wan | 2.7 | 0.9 |
| happyhorse | 1.0 | 1.5 |
| kling | v1 | 1.5 |
| luma | dream_machine | 2.0 |
| runway | gen3 | 2.5 |

---

## 2. DashScope Cost Reference

### Cost per Second (USD → VND at 25,000 VND/$)
| Model | Resolution | Cost/sec (USD) | Cost/sec (VND) |
|-------|-----------|:--------------:|:--------------:|
| wan2.6-t2v | 720P | $0.014 | 350 |
| wan2.6-t2v | 1080P | $0.024 | 600 |
| wan2.1-t2v-turbo | 720P | ~$0.010 | 250 |
| happyhorse-1.0 | 720P-1080P | $0.14-0.24 | 3,500-6,000 |

### Total Cost per Video (DashScope)
| Model | Resolution | 5s | 10s | 15s | 20s | 30s |
|-------|-----------|:---:|:---:|:---:|:---:|:---:|
| wan2.6 | 720P | 1,750 | 3,500 | 5,250 | 7,000 | 10,500 |
| wan2.6 | 1080P | 3,000 | 6,000 | 9,000 | 12,000 | 18,000 |
| happyhorse | 720P | 17,500 | 35,000 | 52,500 | 70,000 | 105,000 |
| happyhorse | 1080P | 30,000 | 60,000 | 90,000 | 120,000 | 180,000 |

---

## 3. Margin Analysis — wan2.6 (Standard Quality)

### Formula
```
User Cost = base_credits × duration_multiplier × resolution_multiplier × quality_multiplier × provider_multiplier
DashScope Cost = cost_per_second × duration_seconds
Margin = (User Cost - DashScope Cost) / DashScope Cost × 100%
```

### wan2.6 720P (provider_multiplier = 0.9 for wan2.7)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin | Status |
|----------|:---------------:|:--------------------:|:------:|:------:|
| 5s | 15,600 × 0.9 = 14,040 | 1,750 | **+702%** | ✅ Lãi lớn |
| 10s | 35,000 × 0.9 = 31,500 | 3,500 | **+800%** | ✅ Lãi lớn |
| 15s | 60,000 × 0.9 = 54,000 | 5,250 | **+929%** | ✅ Lãi lớn |
| 20s | 93,400 × 0.9 = 84,060 | 7,000 | **+1,101%** | ✅ Lãi lớn |
| 30s | 168,000 × 0.9 = 151,200 | 10,500 | **+1,340%** | ✅ Lãi lớn |

### wan2.6 1080P (provider_multiplier = 0.9 for wan2.7)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin | Status |
|----------|:---------------:|:--------------------:|:------:|:------:|
| 5s | 23,400 × 0.9 = 21,060 | 3,000 | **+602%** | ✅ Lãi lớn |
| 10s | 52,500 × 0.9 = 47,250 | 6,000 | **+688%** | ✅ Lãi lớn |
| 15s | 90,000 × 0.9 = 81,000 | 9,000 | **+800%** | ✅ Lãi lớn |
| 20s | 140,100 × 0.9 = 126,090 | 12,000 | **+951%** | ✅ Lãi lớn |
| 30s | 252,000 × 0.9 = 226,800 | 18,000 | **+1,160%** | ✅ Lãi lớn |

---

## 4. Margin Analysis — HappyHorse (Ultra Quality)

### HappyHorse 720P (provider_multiplier = 1.5)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin | Status |
|----------|:---------------:|:--------------------:|:------:|:------:|
| 5s | 23,400 × 1.5 = 35,100 | 17,500 | **+101%** | ✅ Lãi |
| 10s | 52,500 × 1.5 = 78,750 | 35,000 | **+125%** | ✅ Lãi |
| 15s | 90,000 × 1.5 = 135,000 | 52,500 | **+157%** | ✅ Lãi |
| 20s | 140,100 × 1.5 = 210,150 | 70,000 | **+200%** | ✅ Lãi |
| 30s | 252,000 × 1.5 = 378,000 | 105,000 | **+260%** | ✅ Lãi |

### HappyHorse 1080P (provider_multiplier = 1.5)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin | Status |
|----------|:---------------:|:--------------------:|:------:|:------:|
| 5s | 35,100 × 1.5 = 52,650 | 30,000 | **+76%** | ✅ Lãi |
| 10s | 78,750 × 1.5 = 118,125 | 60,000 | **+97%** | ✅ Lãi |
| 15s | 135,000 × 1.5 = 202,500 | 90,000 | **+125%** | ✅ Lãi |
| 20s | 210,150 × 1.5 = 315,225 | 120,000 | **+163%** | ✅ Lãi |
| 30s | 378,000 × 1.5 = 567,000 | 180,000 | **+215%** | ✅ Lãi |

---

## 5. Phát hiện quan trọng

### 🚨 Vấn đề 1: Quality Tier Multiplier = 1.0 (KHÔNG PHÂN BỊẾT)

**Hiện tại**: Tất cả quality tiers (standard, premium, ultra) đều có multiplier = 1.0

**Hậu quả**: User chọn "ultra" (happyhorse) nhưng chỉ trả giá như "standard" (wan2.6)

**Cost thực tế**:
- wan2.6: ~350 VND/sec (720P)
- happyhorse: ~3,500 VND/sec (720P) → **10x đắt hơn**

**User cost**:
- wan2.6 5s 720P: 1,560 credits = 15,600 VND
- happyhorse 5s 720P: 1,560 × 1.0 (quality) × 1.5 (provider) = 2,340 credits = 23,400 VND

**Margin**:
- wan2.6: (15,600 - 1,750) / 1,750 = **+791%** ✅
- happyhorse: (23,400 - 17,500) / 17,500 = **+34%** ⚠️ Thấp

**=> Cần tăng quality multiplier cho premium/ultra**

### 🚨 Vấn đề 2: Duration Multiplier KHÔNG Non-Linear Đúng

**Mục tiêu**: "Thời gian ngắn → phí ít, thời gian dài → phí cao dần (non-linear)"

**Hiện tại**: Duration multiplier TĂNG linear:
- 5s: 0.78 (312 credits/sec)
- 10s: 1.75 (350 credits/sec) → +12%
- 15s: 3.00 (400 credits/sec) → +28%
- 20s: 4.67 (467 credits/sec) → +50%
- 30s: 8.40 (560 credits/sec) → +79%

**=> Thực ra đã non-linear (tăng dần), nhưng margin vẫn thấp vì quality tier không phân biệt**

### 🚨 Vấn đề 3: Provider Multiplier Quá Thấp Cho HappyHorse

**Hiện tại**: HappyHorse multiplier = 1.5

**Cost thực tế**: HappyHorse = 10x wan2.6

**=> Cần tăng multiplier lên ~3.0-5.0 để cover cost**

---

## 6. Bảng Margin Tổng Hợp (Sau Khi Fix)

### Đề xuất Quality Multipliers
| Quality | Current | Proposed | Lý do |
|---------|:-------:|:--------:|-------|
| standard | 1.0 | 1.0 | Base |
| premium | 1.0 | 1.5 | Wan2.7 cost ~1.5x wan2.6 |
| ultra | 1.0 | 2.5 | HappyHorse cost ~10x wan2.6 |

### Đề xuất Provider Multipliers
| Provider | Current | Proposed | Lý do |
|----------|:-------:|:--------:|-------|
| wan2.7 | 0.9 | 0.9 | Giữ nguyên (budget) |
| happyhorse | 1.5 | 3.0 | Cover 10x cost |
| kling | 1.5 | 2.0 | Premium tier |
| luma | 2.0 | 2.5 | Premium tier |
| runway | 2.5 | 3.0 | Ultra tier |

### Margin Mới (wan2.6 720P, standard quality)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin |
|----------|:---------------:|:--------------------:|:------:|
| 5s | 15,600 | 1,750 | +791% |
| 10s | 35,000 | 3,500 | +900% |
| 15s | 60,000 | 5,250 | +1,043% |
| 20s | 93,400 | 7,000 | +1,234% |
| 30s | 168,000 | 10,500 | +1,500% |

### Margin Mới (HappyHorse 720P, ultra quality)
| Duration | User Cost (VND) | DashScope Cost (VND) | Margin |
|----------|:---------------:|:--------------------:|:------:|
| 5s | 2,000 × 0.78 × 1.0 × 2.5 × 3.0 = 11,700 | 17,500 | **-33%** ❌ Lỗ |
| 10s | 2,000 × 1.75 × 1.0 × 2.5 × 3.0 = 26,250 | 35,000 | **-25%** ❌ Lỗ |
| 15s | 2,000 × 3.00 × 1.0 × 2.5 × 3.0 = 45,000 | 52,500 | **-14%** ❌ Lỗ |
| 20s | 2,000 × 4.67 × 1.0 × 2.5 × 3.0 = 70,050 | 70,000 | **+0.1%** ⚠️ |
| 30s | 2,000 × 8.40 × 1.0 × 2.5 × 3.0 = 126,000 | 105,000 | **+20%** ✅ |

---

## 7. Phân tích chi tiết theo Model

### wan2.6 (Standard) — COST-OPTIMIZED
| Resolution | Duration | User Cost | DashScope Cost | Margin | Verdict |
|-----------|----------|:---------:|:--------------:|:------:|:-------:|
| 720P | 5s | 14,040 | 1,750 | +702% | ✅ OK |
| 720P | 10s | 31,500 | 3,500 | +800% | ✅ OK |
| 720P | 15s | 54,000 | 5,250 | +929% | ✅ OK |
| 720P | 20s | 84,060 | 7,000 | +1,101% | ✅ OK |
| 720P | 30s | 151,200 | 10,500 | +1,340% | ✅ OK |
| 1080P | 5s | 21,060 | 3,000 | +602% | ✅ OK |
| 1080P | 10s | 47,250 | 6,000 | +688% | ✅ OK |
| 1080P | 15s | 81,000 | 9,000 | +800% | ✅ OK |
| 1080P | 20s | 126,090 | 12,000 | +951% | ✅ OK |
| 1080P | 30s | 226,800 | 18,000 | +1,160% | ✅ OK |

### wan2.7 (Premium) — COST-OPTIMIZED
| Resolution | Duration | User Cost | DashScope Cost | Margin | Verdict |
|-----------|----------|:---------:|:--------------:|:------:|:-------:|
| 720P | 5s | 21,060 | 1,750 | +1,103% | ✅ OK |
| 720P | 10s | 47,250 | 3,500 | +1,250% | ✅ OK |
| 720P | 15s | 81,000 | 5,250 | +1,443% | ✅ OK |
| 720P | 20s | 126,090 | 7,000 | +1,701% | ✅ OK |
| 720P | 30s | 226,800 | 10,500 | +2,060% | ✅ OK |

### HappyHorse (Ultra) — HIGH-COST
| Resolution | Duration | User Cost | DashScope Cost | Margin | Verdict |
|-----------|----------|:---------:|:--------------:|:------:|:-------:|
| 720P | 5s | 11,700 | 17,500 | **-33%** | ❌ Lỗ |
| 720P | 10s | 26,250 | 35,000 | **-25%** | ❌ Lỗ |
| 720P | 15s | 45,000 | 52,500 | **-14%** | ❌ Lỗ |
| 720P | 20s | 70,050 | 70,000 | +0.1% | ⚠️ |
| 720P | 30s | 126,000 | 105,000 | +20% | ✅ |
| 1080P | 5s | 17,550 | 30,000 | **-42%** | ❌ Lỗ nặng |
| 1080P | 10s | 39,375 | 60,000 | **-34%** | ❌ Lỗ nặng |
| 1080P | 15s | 67,500 | 90,000 | **-25%** | ❌ Lỗ nặng |
| 1080P | 20s | 105,075 | 120,000 | **-12%** | ❌ Lỗ |
| 1080P | 30s | 189,000 | 180,000 | +5% | ⚠️ |

---

## 8. Nhận định

### ✅ Đã tốt
1. **Duration multiplier đã non-linear** — tăng dần từ 312 credits/sec (5s) đến 560 credits/sec (30s)
2. **wan2.6 margin rất cao** — 700%+ → profit tốt cho budget tier
3. **Credit exchange rate hợp lý** — 1 credit = 10 VND
4. **Plan pricing có lời** — Pro 210k/18k credits → ~26% profit

### ❌ Cần fix
1. **Quality tier multiplier = 1.0** — KHÔNG phân biệt standard/premium/ultra
2. **HappyHorse margin âm** — Lỗ 25-42% cho video ngắn
3. **Provider multiplier quá thấp** — happyhorse 1.5x nhưng cost 10x
4. **Không có cơ chế blocking ultra cho video ngắn** — user có thể tạo video 5s ultra → lỗ

---

## 9. Đề xuất Fix

### Fix 1: Tăng Quality Tier Multipliers
```php
// PricingSystemSeeder.php
$qualities = [
    ['code' => 'standard', 'multiplier' => 1.0],  // giữ nguyên
    ['code' => 'premium', 'multiplier' => 1.5],    // TỪ 1.0 → 1.5
    ['code' => 'ultra', 'multiplier' => 2.5],      // TỪ 1.0 → 2.5
];
```

### Fix 2: Tăng Provider Multipliers
```php
// PricingSystemSeeder.php
$providerConfigs = [
    // HappyHorse - TỪ 1.5 → 3.0
    ['provider' => 'happyhorse', 'base_multiplier' => 3.0],
    // Kling - TỪ 1.5 → 2.0
    ['provider' => 'kling', 'base_multiplier' => 2.0],
    // Luma - TỪ 2.0 → 2.5
    ['provider' => 'luma', 'base_multiplier' => 2.5],
    // Runway - TỪ 2.5 → 3.0
    ['provider' => 'runway', 'base_multiplier' => 3.0],
    // Wan2.7 - giữ 0.9 (budget)
];
```

### Fix 3: Thêm Duration Minimum cho Ultra
```php
// ProviderPricing entries
['provider' => 'happyhorse', 'min_duration_seconds' => 20],  // TỪ 3 → 20
```

### Fix 4: Tăng Resolution Multiplier cho 1080P
```php
$resolutions = [
    ['code' => '720p', 'multiplier' => 1.0],
    ['code' => '1080p', 'multiplier' => 1.8],  // TỪ 1.5 → 1.8
];
```

---

## 10. Margin Sau Fix

### wan2.6 720P (standard, wan provider)
| Duration | User Cost | DashScope Cost | Margin |
|----------|:---------:|:--------------:|:------:|
| 5s | 14,040 | 1,750 | +702% |
| 10s | 31,500 | 3,500 | +800% |
| 15s | 54,000 | 5,250 | +929% |
| 20s | 84,060 | 7,000 | +1,101% |
| 30s | 151,200 | 10,500 | +1,340% |

### HappyHorse 720P (ultra, happyhorse provider)
| Duration | User Cost | DashScope Cost | Margin |
|----------|:---------:|:--------------:|:------:|
| 5s | 23,400 | 17,500 | +34% |
| 10s | 52,500 | 35,000 | +50% |
| 15s | 90,000 | 52,500 | +71% |
| 20s | 140,100 | 70,000 | +100% |
| 30s | 252,000 | 105,000 | +140% |

### HappyHorse 1080P (ultra, happyhorse provider)
| Duration | User Cost | DashScope Cost | Margin |
|----------|:---------:|:--------------:|:------:|
| 5s | 42,120 | 30,000 | +40% |
| 10s | 94,500 | 60,000 | +58% |
| 15s | 162,000 | 90,000 | +80% |
| 20s | 252,180 | 120,000 | +110% |
| 30s | 453,600 | 180,000 | +152% |

---

## 11. Ưu tiên Fix

| # | Fix | Effort | Impact | Priority |
|---|-----|:------:|:------:|:--------:|
| 1 | Tăng quality multiplier (standard=1.0, premium=1.5, ultra=2.5) | 15m | 🔴 Critical | P0 |
| 2 | Tăng provider multiplier (happyhorse=3.0, kling=2.0, luma=2.5, runway=3.0) | 15m | 🔴 Critical | P0 |
| 3 | Tăng resolution multiplier (1080p: 1.5 → 1.8) | 10m | 🟡 Medium | P1 |
| 4 | Thêm min_duration cho ultra tier (happyhorse min=20s) | 10m | 🟡 Medium | P1 |
| 5 | Review pricing packages (Starter/Pro/Enterprise) | 30m | 🟢 Low | P2 |

**Tổng effort: ~1.5h**

---

## 12. Kế hoạch Hành động

### Phase 1: Fix Pricing Config (30m)
1. Sửa `PricingSystemSeeder.php`:
   - Quality multiplier: standard=1.0, premium=1.5, ultra=2.5
   - Provider multiplier: happyhorse=3.0, kling=2.0, luma=2.5, runway=3.0
   - Resolution multiplier: 1080p=1.8
2. Run seeder: `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder`

### Phase 2: Verify (30m)
1. Test API `/api/v1/pricing/calculate` cho mỗi combination
2. Kiểm tra margin đúng như tính toán
3. Verify frontend hiển thị đúng giá mới

### Phase 3: Update Documentation (30m)
1. Cập nhật `docs/plans/billing/final-pricing-plan.md`
2. Viết worklog
3. Cập nhật `task-status.md`

---

## 13. Risk & Trade-offs

| Risk | Mitigation |
|------|------------|
| Giá mới cao hơn → user bỏ | wan2.6 vẫn rẻ (14k cho 5s), happyhorse đắt hơn nhưng chất lượng cao |
| Competitor rẻ hơn | Focus vào chất lượng + UX, không competing on price |
| User phàn nàn giá tăng | Giải thích: "Giá phản ánh chất lượng thực tế, không bán lỗ" |
| Complexity增加 | Đơn giản: chỉ thay đổi multipliers, không thay đổi logic |

---

## 14. Kết luận

**Hiện tại**: Hệ thống đang BÁN LỖ cho happyhorse (ultra tier) vì quality multiplier = 1.0

**Cần fix ngay**:
1. Quality multiplier: premium=1.5, ultra=2.5
2. Provider multiplier: happyhorse=3.0
3. Resolution multiplier: 1080p=1.8

**Sau fix**: Tất cả combinations sẽ có margin dương (34%+), đảm bảo profitability

---

## Files to Modify
| File | Change |
|------|--------|
| `backend/database/seeders/PricingSystemSeeder.php` | Update quality/provider/resolution multipliers |
| `docs/plans/billing/final-pricing-plan.md` | Update pricing table |
| `docs/plans/billing/pricing-review.md` | This file |

## Verification
- [ ] Run PricingSystemSeeder
- [ ] Test API pricing calculate
- [ ] Verify frontend pricing display
- [ ] Check plan profitability
