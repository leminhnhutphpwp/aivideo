# Wavise Studio — Kế hoạch giá cuối cùng

## Date
2026-05-31

## Chiến lược

**Video ngắn giá mềm → hút user, video dài margin cao → lời từ user nghiêm túc.**

| Duration | Margin | Lý do |
|----------|:------:|-------|
| 5s | 10% | Giá rẻ nhất để user dùng thử, "móc câu" |
| 10s | 20% | Entry level cho creator |
| 15s | 30% | Creator bán chuyên |
| 20s | 40% | Chuyên nghiệp |
| 30s | 50% | Premium, user cam kết cao |

---

## 1. Chi phí gốc (QwenCloud HappyHorse-T2V, 720p)

| Duration | Cost |
|----------|------|
| 5s | 14.000đ |
| 10s | 28.000đ |
| 15s | 42.000đ |
| 20s | 56.000đ |
| 30s | 84.000đ |

## 2. Giá bán & Credits (exchange_rate = 0.1 → 1 credit = 10đ)

| Duration | Cost | Margin | Giá bán | Credits |
|----------|------|:------:|---------|---------|
| 5s | 14.000đ | 10% | 15.600đ | 1.560 |
| 10s | 28.000đ | 20% | 35.000đ | 3.500 |
| 15s | 42.000đ | 30% | 60.000đ | 6.000 |
| 20s | 56.000đ | 40% | 93.400đ | 9.340 |
| 30s | 84.000đ | 50% | 168.000đ | 16.800 |

## 3. DurationTier Multipliers (base_credits = 2.000)

| Code | Seconds | Multiplier | Credits (720p) |
|------|---------|:----------:|----------------|
| 5s | 5 | 0.78 | 1.560 |
| 10s | 10 | 1.75 | 3.500 |
| 15s | 15 | 3.00 | 6.000 |
| 20s | 20 | 4.67 | 9.340 |
| 30s | 30 | 8.40 | 16.800 |

> Multiplier cũ: 5s=1.0, 10s=1.8, 15s=2.8, 30s=5.0. Giảm mạnh tier ngắn, tăng tier dài để đạt margin target.

---

## 4. Gói Subscription

| Plan | Giá/tháng | Credits | Video 5s (max) | Chi phí max | Lãi |
|------|-----------|:-------:|:---:|------------|:---:|
| **Free** | 0đ | 2.000 | 1 | — | — |
| **Pro** | 210.000đ | 18.000 | ~11 | 155.400đ | +26% |
| **Studio** | — | — | — | — | Sắp ra mắt |

## 5. Tính năng theo Plan

| Tính năng | Free | Pro | Studio |
|-----------|:----:|:---:|:------:|
| Watermark | ✅ | ❌ | — |
| Độ phân giải | 720p | 1080p | — |
| Queue ưu tiên | Thấp | Bình thường | — |
| Concurrent jobs | 1 | 3 | — |
| Audio (TTS) | ❌ | ✅ | — |
| Rollover | — | 20% | — |
| Credit Pack | ✅ | ✅ | — |

## 6. Credit Pack mua lẻ (không hết hạn)

| Gói | Giá | Credits | Giá/credit | Video 5s (equiv) |
|-----|-----|:-------:|:----------:|:---:|
| Nhỏ | 50.000đ | 2.000 | 25đ | 1 |
| Vừa | 100.000đ | 4.500 | 22đ | ~3 |
| Lớn | 200.000đ | 10.000 | 20đ | ~6 |

> Mua gói Pro rẻ hơn mua lẻ ~42% (14đ vs 25đ/credit). Incentive subscribe rõ ràng.

## 7. So sánh nhanh

| | Mua lẻ 50k | Pro 210k |
|---|:---:|:---:|
| Credits | 2.000 | 18.000 |
| Giá/credit | 25đ | 11,7đ |
| Video 5s | 1 | ~11 |

---

## 8. Cần làm

| # | Task | Agent | Est. |
|---|------|-------|:---:|
| 1 | Cập nhật DurationTier multipliers trong PricingSystemSeeder | @backend | 15m |
| 2 | Thêm tier 20s vào DurationTier | @backend | 5m |
| 3 | Cập nhật PlanSeeder: Free=2000, Pro=18000/210k, Studio=status "coming_soon" | @backend | 15m |
| 4 | Seed pricing: `docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder` | @backend | 5m |
| 5 | Seed plan: `docker exec backend-app-1 php artisan db:seed --class=PlanSeeder` | @backend | 5m |
| 6 | Verify frontend đọc đúng multiplier mới từ API `/api/v1/pricing/durations` | @web | 10m |
| 7 | Verify `/api/pricing/calculate` trả đúng số credits mới | @web | 5m |

**Tổng: ~1h**
