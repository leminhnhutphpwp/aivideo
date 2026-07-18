> ⚠️ **Nguồn chân lý là `backend/app/Services/Pricing/PricingCalculator.php` + DB
> (`VideoType` / `DurationTier` / `ResolutionPricing`, seeded by
> `backend/database/seeders/PricingSystemSeeder.php`).** Tài liệu này chỉ để tham khảo —
> KHÔNG hardcode giá theo nó. Cập nhật file này mỗi khi pricing đổi.
> Loader daemon KHÔNG nạp file này (chỉ nạp `SKILL.md`), nên nó không lộ ra studio.

# Pricing Logic — Core Rules

## Date
2026-07-18

## Mục tiêu
- Giá phải phù hợp Việt Nam (thu nhập trung bình 10-15 triệu/tháng)
- Margin dương sau khi cover chi phí API + overhead
- Pro/Studio plan phải là lựa chọn tốt nhất (giá/credit thấp nhất)

## Cách tính credits

### Formula (video, per `PricingCalculator::calculate()`)
```
credits = base_credits
        × duration_multiplier      (từ DurationTier, DB)
        × resolution_multiplier    (từ ResolutionPricing, DB)
        × quality_multiplier       (từ Plan hiện tại — KHÔNG phải bảng cố định)
        × provider_multiplier      (từ Plan.provider_config)
        × quantity
```
Mỗi bước ép về `int` (làm tròn xuống). `quality_multiplier` và `provider_multiplier`
đến từ **Plan** của user (Free/Pro/Studio…), không còn là bảng tier cố định.

### ẢNH tính PHẲNG — không nhân multiplier
`image_generation` và `image_editing` là **flat-fee**: chỉ tính `base_credits`, bỏ qua
duration / resolution / quality / provider (`isFlatFee` trong `PricingCalculator`).
Áp dụng cho mọi thao tác ảnh: sinh, sửa, và multi-panel.

### Base Credits (nguồn: `PricingSystemSeeder`, cột `VideoType.base_credits`)
| Loại (`code`) | base_credits | Ghi chú |
|---------------|--------------|---------|
| `image_generation` | **200** (phẳng) | Text-to-Image |
| `image_editing` | **200** (phẳng) | Sửa ảnh / tham chiếu / multi-panel |
| `text_to_video` | 1,500 | |
| `image_to_video` | 1,500 | |
| `reference_to_video` | 1,875 | |
| `storyboard_video` | 1,875 | Multi-scene |
| `video_editing` | 1,125 | |
| `character_animation` | 2,250 | |

> base_credits là giá cho 5s @ multiplier 1.0. Giá trị DB có thể được admin điều chỉnh —
> luôn đọc từ `VideoType`, đừng hardcode.

### Duration Multipliers (nguồn: `DurationTier`, chỉ các tier `is_active`)
| Duration | Multiplier |
|----------|-----------|
| 5s | 1.10 |
| 8s | 1.76 |
| 10s | 2.20 |
| 15s | 3.30 |

Chỉ 5/8/10/15s đang active. Duration khác bị `DurationTier` xóa/không active →
`PricingCalculator` fallback multiplier 1.0. Đường cong ~tuyến tính (~0.22/giây).

### Resolution Multipliers (nguồn: `ResolutionPricing`)
| Resolution | Multiplier | Trạng thái |
|-----------|-----------|-----------|
| 480p | 0.7 | inactive |
| 720p | 1.0 | active |
| 1080p | 1.8 | active |

### Quality & Provider Multipliers
- **KHÔNG còn bảng tier cố định.** Đã bỏ khỏi seeder (mục 4 & 5 trong
  `PricingSystemSeeder` ghi rõ "Removed: managed inside Plans").
- `quality_multiplier` = `Plan.quality_multiplier` của plan đang áp dụng (min 1.0).
- `provider_multiplier` = `Plan->getProviderMultiplier($provider)` từ `Plan.provider_config`.
- Với ảnh (flat-fee) cả hai bị bỏ qua để preview khớp `CreditCalculator::calculateImage()`.

## Credit Exchange Rate
- Nguồn: `CreditSetting::exchangeRate()` (DB setting, không hardcode).
- Quan hệ trong `PricingCalculator`: `vnd_equivalent = total_credits / exchange_rate`
  ⇒ `credits = VND × exchange_rate`.
- Mặc định hiện tại: **1 credit = 10 VND** (`exchange_rate = 0.1`). Khớp ghi chú
  `credits = ceil(VND × exchange_rate)` trong `CLAUDE.md`.

## Model / Provider notes (nguồn: `backend/config/media_providers.php`)
- **qwencloud** là provider chính (video Wan2.6/2.7 t2v/i2v/r2v + ảnh
  z-image-turbo / qwen-image-* / wan2.7-image-pro; prod nạp DASHSCOPE key thật).
- **happyhorse-1.0-*** (t2v/i2v/r2v/video-edit) VẪN CÓ trong config — cost_hint
  `$0.10+/s`, cao hơn Wan. Cân nhắc kỹ khi bật cho plan rẻ; KHÔNG xóa khỏi config.
- Wan2.7 (`$0.10/s`) đắt hơn Wan2.6 (`$0.07/s`) ở mức API — chênh lệch này thể hiện
  qua `provider_multiplier` cấu hình trong Plan, không hardcode ở đây.

## Rules
1. Đọc mọi con số từ `PricingCalculator` + DB — file này chỉ tham khảo.
2. Ảnh luôn tính PHẲNG (200), không nhân duration/resolution/quality/provider.
3. Pro/Studio plan phải có giá/credit thấp nhất; credit pack đắt hơn per credit.
4. Duration multiplier lấy từ `DurationTier`, không hardcode.
5. happyhorse còn trong catalog — quyết định bật/tắt ở tầng Plan, không sửa doc thành "removed".
