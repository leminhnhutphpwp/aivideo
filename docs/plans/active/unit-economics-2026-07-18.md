# Unit Economics — Giá vốn (provider) vs Giá bán (credit) — WS1.2

## Date
2026-07-18

## Mục tiêu
Đối chiếu **chi phí provider (giá vốn)** vs **credit thu (doanh thu)** cho từng cấu hình ẢNH và VIDEO,
tính **biên lợi nhuận %**, và chỉ ra cấu hình nào **lỗ / mỏng biên**.

> ⚠️ Đây là tài liệu phân tích. Không sửa code sản phẩm. Mọi con số phái sinh từ:
> `backend/config/media_providers.php` (cost_hint), `PricingSystemSeeder.php` (base_credits + multiplier),
> `PlanSeeder.php` (model_mapping, giá plan), `PricingCalculator.php` (công thức), `CreditSetting::exchangeRate()` (0.1).

---

## 🔧 GIẢ ĐỊNH (owner thay số thật vào đây)

| Giả định | Giá trị dùng | Nguồn / ghi chú |
|---|---|---|
| Tỷ giá USD→VND | **25.000 VND/USD** | Giả định. Thay bằng tỷ giá mua thực của Alibaba Cloud. |
| Giá trị 1 credit (nominal) | **10 VND/credit** | `exchange_rate = 0.1` → VND = credits ÷ 0.1 = credits × 10. Hard trong DB (`CreditSetting`). |
| Giá **mua** credit thực (Pro) | **10 VND/credit** | Pro: `price_sale = 249.000đ`, `monthly_credits = ceil(249000×0.1)+0 = 24.900` → 249000/24900 = **10,0 VND/credit**. Không markup — Pro bán credit đúng bằng giá trị nominal. |
| Giá mua credit (Studio) | **10 VND/credit (giả định)** | Studio `price_sale = 0`, `monthly_credits = 0`, status `coming_soon` → **chưa có cơ chế bán**. Tạm lấy nominal 10 VND. Owner phải chốt giá Studio thật. |
| Credit Free plan | **0 VND doanh thu (marketing)** | Free: `bonus_credits = 2000`, giá 0đ → credit tặng = **chi phí marketing**, không phải doanh thu tiền mặt. |
| cost_hint không đổi theo resolution | Giá vốn video = `$/s × giây` **bất kể 720p/1080p** | `media_providers.php` chỉ ghi `$/s` phẳng. → 1080p thu credit ×1.8 nhưng **giá vốn không tăng** ⇒ 1080p biên tốt hơn 720p. Cần xác nhận provider có phụ thu 1080p không. |
| Không có credit-pack top-up | Chỉ subscription Pro định nghĩa VND/credit | Không tìm thấy seeder credit-pack. Combo `PricingPackage` tính bằng credit, không phải VND nạp. |

**Công thức giá vốn:** `cost_VND = cost_hint_USD × 25.000`
**Công thức doanh thu:** `revenue_VND = credits_thu × giá_mua_credit_của_plan`

---

## 1. ẢNH (image_generation / image_editing)

**Quan trọng:** ảnh là **flat fee = 200 credits**, `PricingCalculator` ép `isFlatFee → duration/res/quality/provider multiplier = 1.0`.
⇒ **MỌI plan, MỌI model đều thu đúng 200 credits = 2.000 VND (nominal).** Quality multiplier của plan **KHÔNG** áp cho ảnh.
Nhưng model theo plan lại khác giá vốn rất nhiều → biên chênh lệch cực lớn.

### 1a. Text-to-Image (`image_generation`) — 200 credits thu

| Plan | Model (`model_mapping`) | cost_hint | Giá vốn (VND) | Doanh thu (VND) | Lãi gộp (VND) | Biên % | Đánh giá |
|---|---|---|---|---|---|---|---|
| Free | `z-image-turbo` | $0.015 | 375 | **0** (credit tặng) | −375 | — | 🟡 Marketing: mỗi ảnh free tốn **375 VND** thật |
| Pro | `qwen-image-plus` | $0.03 | 750 | 2.000 | +1.250 | **62,5%** | 🟢 Lời tốt |
| Studio | `qwen-image-2.0-pro` | $0.075 | **1.875** | 2.000 | **+125** | **6,25%** | 🔴 **RĂNG CƯA — gần lỗ** |

### 1b. Image Editing (`image_editing`) — 200 credits thu

| Plan | Model | cost_hint | Giá vốn (VND) | Doanh thu (VND) | Biên % | Đánh giá |
|---|---|---|---|---|---|---|
| Free | `wan2.5-i2i-preview` | $0.03 | 750 | 0 (marketing) | — | 🟡 750 VND/ảnh thật |
| Pro | `qwen-image-edit-plus` | $0.03 | 750 | 2.000 | **62,5%** | 🟢 |
| Studio | `qwen-image-edit-max` | $0.075 | **1.875** | 2.000 | **6,25%** | 🔴 **Mỏng như ảnh gen** |

> 🔴 **PHÁT HIỆN CHÍNH — ẢNH STUDIO:** model $0.075 (1.875 VND) nhưng thu đúng flat 200 credits (2.000 VND) như Free.
> Biên chỉ **6,25%** — chỉ cần tỷ giá nhích, phụ phí, hoặc bán credit Studio giảm giá **là LỖ ngay**.
> Nguyên nhân gốc: **ảnh không nhận quality multiplier** (Free/Pro/Studio thu bằng nhau) nhưng model Studio đắt gấp 5× model Free.

> ⚠️ **Rủi ro liên quan — Multi-panel:** `default_models.image_multi_panel = wan2.7-image-pro` ($0.075/panel).
> Storyboard multi-panel sinh **nhiều panel/lần** → giá vốn = 1.875 VND × số panel. Nếu vẫn thu theo flat 200 credits/lần thì **lỗ nặng khi panel ≥ 2**. Cần kiểm cơ chế tính credit của luồng multi-panel riêng (ngoài phạm vi flat-fee này).

---

## 2. VIDEO

Công thức: `credits = base_credits × durMult × resMult × qualityMult` (providerMult = 1.0 mặc định), truncate int mỗi bước.

- **base_credits**: t2v/i2v = 1500 · reference/storyboard = 1875 · character_anim = 2250 · video_editing = 1125
- **durMult**: 5s = 1.10 · 8s = 1.76 · 10s = 2.20 · 15s = 3.30
- **resMult**: 720p = 1.0 · 1080p = 1.8
- **qualityMult (theo plan)**: Free = 1.00 · Pro = 1.30 · Studio = 1.80
- **Giá vốn**: Free = wan2.6 **$0.07/s** · Pro/Studio = wan2.7 **$0.10/s**

Doanh thu Pro = credits × 10 VND. Giá vốn = $/s × giây × 25.000.

### 2a. Text-to-Video, PRO (wan2.7 $0.10/s, qual 1.30) — base 1500

| Cấu hình | credits thu | Doanh thu (VND) | Giá vốn (VND) | Biên % | Đánh giá |
|---|---|---|---|---|---|
| 5s · 720p | 2.145 | 21.450 | 12.500 | **41,7%** | 🟢 |
| 5s · 1080p | 3.861 | 38.610 | 12.500 | **67,6%** | 🟢 |
| 8s · 720p | 3.432 | 34.320 | 20.000 | **41,7%** | 🟢 |
| 8s · 1080p | 6.177 | 61.770 | 20.000 | **67,6%** | 🟢 |
| 10s · 720p | 4.290 | 42.900 | 25.000 | **41,7%** | 🟢 |
| 10s · 1080p | 7.722 | 77.220 | 25.000 | **67,6%** | 🟢 |
| 15s · 720p | 6.435 | 64.350 | 37.500 | **41,7%** | 🟢 |
| 15s · 1080p | 11.583 | 115.830 | 37.500 | **67,6%** | 🟢 |

→ **Video Pro khỏe**: 720p ~42%, 1080p ~68% (vì 1080p thu ×1.8 credit nhưng giá vốn không đổi).

### 2b. Text-to-Video, FREE (wan2.6 $0.07/s, qual 1.00) — giá vốn thực (doanh thu = 0, marketing)

| Cấu hình | credits (giá trị) | Giá trị (VND) | Giá vốn thật (VND) | Ghi chú |
|---|---|---|---|---|
| 5s · 720p | 1.650 | 16.500 | **8.750** | 🟡 Mỗi video free tốn **8.750 VND** thật |
| 8s · 720p | 2.640 | 26.400 | 14.000 | 🟡 |
| 10s · 720p | 3.300 | 33.000 | 17.500 | 🟡 |

> Free `bonus_credits = 2000` ≈ **1 video 5s 720p** (1.650 credits). ⇒ Chi phí thu hút mỗi user free ≈ **8.750 VND** (1 video mồi). Chấp nhận được nếu tỷ lệ convert Pro đủ cao; cần theo dõi.

### 2c. Các loại video khác, PRO 5s·720p (giá vốn 12.500 VND, $0.10/s)

| Loại | base | credits (×1.10×1.30) | Doanh thu (VND) | Giá vốn (VND) | Biên % | Đánh giá |
|---|---|---|---|---|---|---|
| reference_to_video (r2v) | 1875 | 2.680 | 26.800 | 12.500 | **53,4%** | 🟢 |
| image_to_video (i2v) | 1500 | 2.145 | 21.450 | 12.500 | 41,7% | 🟢 |
| character_animation | 2250 | 3.217 | 32.170 | 12.500 | **61,1%** | 🟢 |
| **video_editing** | 1125 | 1.608 | 16.080 | 12.500 | **22,3%** | 🟡 **Mỏng nhất** |

### 2d. Video Studio (qual 1.80, wan2.7 $0.10/s) — nếu bán credit ở 10 VND

| Cấu hình | credits | Doanh thu (VND) | Giá vốn (VND) | Biên % | Đánh giá |
|---|---|---|---|---|---|
| t2v 5s · 720p | 2.970 | 29.700 | 12.500 | **57,9%** | 🟢 |
| t2v 5s · 1080p | 5.346 | 53.460 | 12.500 | **76,6%** | 🟢 |

→ **Video Studio rất khỏe** (quality mult 1.80 nhân doanh thu, giá vốn = Pro). Vấn đề Studio **chỉ nằm ở ẢNH**, không phải video.

---

## 3. Tổng kết đánh giá

### 🔴 Lỗ / mỏng biên (<20%) — cần xử lý
- **Ảnh Studio** (image_generation + image_editing): **6,25%** biên. Model $0.075 vs flat 200 credits. Chỉ cần tỷ giá tăng ~6% là **lỗ**.
- **Multi-panel image** (`wan2.7-image-pro` $0.075/panel): nếu thu flat 200 credits mà sinh ≥2 panel → **lỗ** (cần verify luồng riêng).

### 🟡 Ổn nhưng mỏng (20–40%) — theo dõi
- **video_editing 720p Pro** (~22%). Nếu chạy provider `happyhorse` (`$0.10+/s` — dấu "+" chưa rõ) hoặc phụ phí, có thể tụt <20% → **thành 🔴**.
- **Ảnh Pro** an toàn (62,5%) nhưng **ảnh Free/Edit là chi phí marketing** 375–750 VND/ảnh.
- **Free video** tốn 8.750 VND/video mồi — chi phí acquisition.

### 🟢 Lời tốt (>40%)
- **Toàn bộ video Pro** (720p ~42%, 1080p ~68%).
- **Video Studio** (58–77%).
- **Ảnh Pro** (62,5%).
- reference_to_video / character_animation Pro (53–61%).

---

## 4. Khuyến nghị

1. 🔴 **Sửa biên ẢNH Studio (ưu tiên cao).** Ảnh bỏ qua quality multiplier nên model đắt của Studio ăn mòn flat fee. Chọn 1:
   - **(a)** Đặt `base_credits` ảnh theo model/tier (ví dụ ảnh premium 400–500 credits thay vì 200), hoặc
   - **(b)** Cho phép quality multiplier áp lên ảnh (bỏ `isFlatFee` ép 1.0 cho quality), hoặc
   - **(c)** Map `image_generation` của Studio sang model rẻ hơn (`qwen-image-2.0` $0.035 thay vì `-pro` $0.075) → biên lên ~65%.
   - Khuyến nghị **(a) hoặc (c)** vì ít đụng công thức nhất.

2. 🟡 **video_editing multiplier hơi thấp.** base 1125 khiến biên 720p ~22%. Cân nhắc nâng `base_credits` video_editing lên ~1350–1500, hoặc xác nhận thời lượng edit thực tế.

3. ⚠️ **Chốt cost thực của `happyhorse` (`$0.10+/s`).** Dấu "+" mơ hồ; nếu thực tế $0.15/s thì r2v/video-edit qua happyhorse có thể **âm biên**. Lấy giá thật rồi đặt lại provider multiplier cho các model này.

4. ⚠️ **Xác nhận provider có phụ phí 1080p không.** Toàn bộ mô hình lời của 1080p (×1.8 credit, giá vốn không đổi) sụp nếu Alibaba tính 1080p đắt hơn 720p.

5. ✅ **Chốt giá bán credit Studio.** Studio hiện `price_sale = 0` / `monthly_credits = 0`. Trước khi bật, đặt giá ≥ 10 VND/credit; **và** xử lý biên ảnh Studio (mục 1).

6. ✅ **Theo dõi chi phí Free.** 8.750 VND/video mồi + 375 VND/ảnh. Chấp nhận nếu conversion Pro đủ. Cân nhắc giảm `bonus_credits` hoặc giới hạn 1080p/duration cho Free để chặn abuse giá vốn.

---

## Verification
- [x] Nguồn số: `media_providers.php` (cost_hint), `PricingSystemSeeder.php`, `PlanSeeder.php`, `PricingCalculator.php`, `CreditCalculator.php`, `CreditSetting::exchangeRate()=0.1` — đọc trực tiếp.
- [x] Xác nhận ảnh = flat 200 credits, **không** nhận duration/res/quality multiplier (`PricingCalculator::$isFlatFee`).
- [x] Xác nhận Pro VND/credit = 10 (249000 ÷ 24900). Không có credit-pack seeder khác.
- [ ] Chưa chạy code (chỉ phân tích tĩnh). Tỷ giá + giá vốn là **giả định** — owner thay số thật.

## Status
✅ Completed (phân tích tĩnh, không sửa code, không commit)
</content>
</invoke>
