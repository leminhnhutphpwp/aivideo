# Phân tích Pricing: Pro Plan vs Credit Pack

## Date
2026-06-01

## Tóm tắt vấn đề

User phát hiện credit pack **rẻ hơn + nhiều credits hơn** Pro plan:

| | Pro Plan | Credit Pack 200k |
|---|---|---|
| Giá | 210,000 VND | 200,000 VND |
| Credits | 18,000 | 20,000 |
| **Giá/credit** | **11.67 VND** | **10.00 VND** |

=> Mua credit pack rẻ hơn 10k VND + được 2,000 credits nhiều hơn. **Không có incentive để subscribe Pro.**

---

## 1. Root Cause Analysis

### Backend: Credit calculation dựa trên exchange_rate (linear)

`CreditController::purchase()` (line 61):
```php
$credits = (int) floor($request->amount * CreditSetting::exchangeRate());
```

Exchange rate = 0.1 → 1 VND = 0.1 credit → **10 VND = 1 credit** (linear, không tier bonus).

### Frontend: PACK_OPTIONS hardcoded với cùng rate

`apps/web/src/components/billing/types.ts` (line 59-63):
```typescript
export const PACK_OPTIONS = [
  { id: 'small',  price: 50000,  credits: 5000 },   // 10 VND/credit
  { id: 'medium', price: 100000, credits: 10000 },  // 10 VND/credit
  { id: 'large',  price: 200000, credits: 20000 },  // 10 VND/credit
];
```

**Tất cả credit packs đều 10 VND/credit** — không có tier discount hay bonus.

### PlanSeeder: Pro plan 18,000 credits

`PlanSeeder.php` (line 41): `monthly_credits => 18000`

Pro plan cost/credit = 210,000 / 18,000 = **11.67 VND/credit**

### Kết luận

Credit pack có giá/credit **tốt hơn** Pro plan (10 vs 11.67 VND). Đây là **bug logic** — theo `final-pricing-plan.md`, credit pack phải đắt hơn per credit để tạo incentive subscribe.

---

## 2. So sánh với Kế hoạch gốc (final-pricing-plan.md)

Kế hoạch ban đầu (2026-05-31) đúng logic:

| | Pro Plan | Credit Pack Nhỏ | Credit Pack Vừa | Credit Pack Lớn |
|---|---|---|---|---|
| Giá | 210,000 | 50,000 | 100,000 | 200,000 |
| Credits (plan) | 18,000 | 2,000 | 4,500 | 10,000 |
| **Giá/credit (plan)** | **11.67** | **25.00** | **22.22** | **20.00** |

| | Pro Plan | Credit Pack Lớn (hiện tại) |
|---|---|---|
| Giá/credit (plan) | 11.67 | **20.00** ← Pro rẻ hơn 42% |
| Giá/credit (actual) | 11.67 | **10.00** ← Credit pack rẻ hơn 14% |

**Kế hoạch gốc**: Pro plan rẻ hơn credit pack ~42% → incentive rõ ràng.
**Implementation hiện tại**: Credit pack rẻ hơn Pro plan 14% → ngược lại hoàn toàn.

---

## 3. Margin Analysis — Tính trên giá hiện tại

### Assumptions
- Exchange rate: 1 credit = 10 VND
- USD/VND: 25,000

### DashScope Cost Reference

| Model | Resolution | Duration | Cost (USD) | Cost (VND) |
|-------|-----------|----------|------------|------------|
| wan2.6-t2v | 720P | 5s | $0.07 | 1,750 |
| wan2.6-t2v | 720P | 10s | $0.14 | 3,500 |
| wan2.6-t2v | 720P | 15s | $0.21 | 5,250 |
| wan2.6-t2v | 1080P | 5s | $0.12 | 3,000 |
| wan2.6-t2v | 1080P | 10s | $0.24 | 6,000 |
| happyhorse-1.0 | 720P | 5s | $0.70 | 17,500 |
| happyhorse-1.0 | 720P | 10s | $1.40 | 35,000 |

### Credits per video (PricingCalculator)

**Formula**: `base_credits × duration_multiplier × resolution_multiplier × quality_multiplier × provider_multiplier`

| Config | Base | ×Dur | ×Res | ×Quality | ×Provider | = Credits | VND cost |
|--------|------|------|------|----------|-----------|-----------|----------|
| t2v 5s 720p wan standard | 2000 | 0.78 | 1.0 | 1.0 | 0.9 | **1,404** | 14,040 |
| t2v 10s 720p wan standard | 2000 | 1.75 | 1.0 | 1.0 | 0.9 | **3,150** | 31,500 |
| t2v 15s 720p wan standard | 2000 | 3.00 | 1.0 | 1.0 | 0.9 | **5,400** | 54,000 |
| t2v 5s 1080p wan standard | 2000 | 0.78 | 1.5 | 1.0 | 0.9 | **2,106** | 21,060 |
| t2v 10s 1080p wan standard | 2000 | 1.75 | 1.5 | 1.0 | 0.9 | **4,725** | 47,250 |
| t2v 5s 720p happyhorse premium | 2000 | 0.78 | 1.0 | 1.0 | 1.0 | **1,560** | 15,600 |
| t2v 5s 1080p happyhorse premium | 2000 | 0.78 | 1.5 | 1.0 | 1.0 | **2,340** | 23,400 |

### Margin per video

| Config | Selling (VND) | DashScope Cost | Margin % |
|--------|--------------|----------------|----------|
| t2v 5s 720p wan | 14,040 | 1,750 | **87.5%** |
| t2v 10s 720p wan | 31,500 | 3,500 | **88.9%** |
| t2v 15s 720p wan | 54,000 | 5,250 | **90.3%** |
| t2v 5s 1080p wan | 21,060 | 3,000 | **85.7%** |
| t2v 10s 1080p wan | 47,250 | 6,000 | **87.3%** |
| t2v 5s 720p happyhorse | 15,600 | 17,500 | **-12.2%** |
| t2v 5s 1080p happyhorse | 23,400 | 26,250 | **-12.2%** |

### Nhận xét margin

- **Wan models**: Margin cực cao (87-90%) — bán credit pack ở 10 VND/credit vẫn lời nhiều vì DashScope cost thấp
- **HappyHorse models**: **Lỗ 12%** — credits tính theo wan-based pricing nhưng happyhorse cost cao gấp 10x
- **Kling/Luma/Runway**: Chưa có provider pricing cụ thể, nhưng multiplier cao (1.5-2.5x) nên có thể hợp lý

---

## 4. Pro Plan — Tổng quan margin

假设 user dùng hết 18,000 credits trong 1 tháng:

### Scenario A: All wan2.6 5s 720p
- Videos: 18,000 / 1,404 = **12.8 videos**
- DashScope cost: 12.8 × 1,750 = **22,400 VND**
- Revenue: 210,000 VND
- **Margin: 89.3%** ← Lãi nhiều

### Scenario B: All wan2.6 10s 1080p
- Videos: 18,000 / 4,725 = **3.8 videos**
- DashScope cost: 3.8 × 6,000 = **22,800 VND**
- Revenue: 210,000 VND
- **Margin: 89.1%** ← Lãi nhiều

### Scenario C: All happyhorse 5s 720p
- Videos: 18,000 / 1,560 = **11.5 videos**
- DashScope cost: 11.5 × 17,500 = **201,250 VND**
- Revenue: 210,000 VND
- **Margin: 4.2%** ← Gần như hòa vốn

### Scenario D: Mixed (70% wan, 30% happyhorse)
- Wan videos: 9 × 1,750 = 15,750
- HappyHorse videos: 3.5 × 17,500 = 61,250
- Total cost: **77,000 VND**
- Revenue: 210,000 VND
- **Margin: 63.3%** ← Vẫn lãi

---

## 5. Credit Pack — Tổng quan margin

假设 user dùng hết 20,000 credits:

### Scenario A: All wan2.6 5s 720p
- Videos: 20,000 / 1,404 = **14.2 videos**
- DashScope cost: 14.2 × 1,750 = **24,850 VND**
- Revenue: 200,000 VND
- **Margin: 87.6%**

### Scenario B: All happyhorse 5s 720p
- Videos: 20,000 / 1,560 = **12.8 videos**
- DashScope cost: 12.8 × 17,500 = **224,000 VND**
- Revenue: 200,000 VND
- **Margin: -12%** ← **LỖ!**

---

## 6. Vấn đề chính

### 🔴 BUG: Credit pack giá/credit tốt hơn Pro plan

| | Giá | Credits | Giá/credit |
|---|---|---|---|
| Pro Plan | 210,000 | 18,000 | **11.67** |
| Credit Pack Nhỏ | 50,000 | 5,000 | **10.00** |
| Credit Pack Vừa | 100,000 | 10,000 | **10.00** |
| Credit Pack Lớn | 200,000 | 20,000 | **10.00** |

**Kế hoạch gốc** (`final-pricing-plan.md`):
- Credit Pack Lớn: 200,000 → **10,000** credits (20 VND/credit)
- Pro Plan: 210,000 → 18,000 credits (11.67 VND/credit)
- **Pro rẻ hơn 42%** → incentive subscribe rõ ràng

**Implementation thực tế**:
- Credit Pack Lớn: 200,000 → **20,000** credits (10 VND/credit)
- Pro Plan: 210,000 → 18,000 credits (11.67 VND/credit)
- **Credit pack rẻ hơn 14%** → ngược lại ý định

### 🔴 BUG: HappyHorse models bị lỗ

Credits tính theo wan-based pricing (base_credits=2000) nhưng happyhorse DashScope cost **gấp 10x**. User dùng happyhorse sẽ lỗ cho platform.

### 🟡 THIẾU: Không có tier discount cho credit packs

Backend dùng exchange_rate linear (0.1), không có bonus/extra cho gói lớn. Frontend hardcoded cũng linear.

---

## 7. Đề xuất Fix

### Fix 1: Credit pack credits — align với kế hoạch gốc

**Frontend** (`apps/web/src/components/billing/types.ts`):
```typescript
export const PACK_OPTIONS = [
  { id: 'small',  price: 50000,  credits: 2000 },   // 25 VND/credit
  { id: 'medium', price: 100000, credits: 4500 },   // 22.2 VND/credit
  { id: 'large',  price: 200000, credits: 10000 },  // 20 VND/credit
];
```

**Backend** (`CreditController::purchase()`): Không dùng exchange_rate linear. Tính credits theo tier:

```php
$credits = match(true) {
    $request->amount >= 200000 => (int) ($request->amount / 20),  // 20 VND/credit
    $request->amount >= 100000 => (int) ($request->amount / 22.22), // 22.2 VND/credit
    default => (int) ($request->amount / 25),                       // 25 VND/credit
};
```

Hoặc đơn giản hơn: frontend hiển thị credits đúng, backend nhận `amount` và `credits` từ frontend, lưu cả hai.

### Fix 2: HappyHorse provider multiplier

Tăng multiplier cho happyhorse để margin không âm:

```php
// HappyHorse cost ~10x wan → multiplier cần ~1.5x thay vì 1.0x
['provider' => 'happyhorse', 'model' => '1.0', ..., 'base_multiplier' => 1.5],
```

Hoặc:happyhorse only available cho premium/ultra tier với credits cao hơn.

### Fix 3: Thêm tier bonus cho credit packs (optional)

Nếu muốn credit pack có bonus cho gói lớn:

```php
// Backend: Bonus credits khi mua gói lớn
$bonusPercent = match(true) {
    $amount >= 200000 => 10,  // +10% bonus
    $amount >= 100000 => 5,   // +5% bonus
    default => 0,
};
$credits = $baseCredits + (int) ($baseCredits * $bonusPercent / 100);
```

---

## 8. Recommended Pricing Table

| Plan/Pack | Giá | Credits | Giá/credit | Margin (wan 5s) | Margin (happyhorse 5s) |
|-----------|-----|---------|------------|-----------------|----------------------|
| Free | 0 | 2,000 | — | — | — |
| Pro Plan | 210,000 | 18,000 | 11.67 | 89% | 4% |
| Credit Pack Nhỏ | 50,000 | 2,000 | 25.00 | 93% | 30% |
| Credit Pack Vừa | 100,000 | 4,500 | 22.22 | 92% | 21% |
| Credit Pack Lớn | 200,000 | 10,000 | 20.00 | 91% | 12% |

=> Pro plan rẻ hơn credit pack **42-76%** per credit → incentive subscribe rõ ràng.

---

## 9. Files cần sửa

| # | File | Thay đổi |
|---|------|---------|
| 1 | `apps/web/src/components/billing/types.ts` | Sửa PACK_OPTIONS credits: 2000/4500/10000 |
| 2 | `backend/app/Http/Controllers/API/CreditController.php` | Sửa purchase() tính credits theo tier hoặc nhận từ frontend |
| 3 | `backend/database/seeders/PricingSystemSeeder.php` | Tăng happyhorse multiplier lên 1.5 |
| 4 | `backend/database/seeders/CreditSettingsSeeder.php` | Có thể thêm tier config (optional) |

---

## 10. Verification

Sau khi fix, kiểm tra:

1. **Frontend hiển thị đúng**: Credit pack 200k → 10,000 credits (không phải 20,000)
2. **Backend tạo purchase đúng**: Amount 200,000 → credits 10,000
3. **Pro plan incentive**: Giá/credit Pro (11.67) < Credit pack lớn (20.00) → Pro rẻ hơn 42%
4. **HappyHorse margin**: Không âm — tăng multiplier hoặc limit availability
5. **User test**: So sánh Pro plan vs credit pack trên UI → thấy Pro rẻ hơn rõ ràng
