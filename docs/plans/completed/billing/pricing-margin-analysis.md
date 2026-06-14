> [!WARNING]
> **TÀI LIỆU CŨ / LEGACY DOCUMENT**
> Tài liệu này mô tả kiến trúc định giá dựa trên `QualityTier` và `ProviderPricing` cũ. 
> Hiện tại, hệ thống đã được tái cấu trúc để **hợp nhất toàn bộ cấu hình Model & Provider trực tiếp vào từng Gói dịch vụ (Plan)**.
> Vui lòng tham khảo thiết kế mới tại: [rearchitect_plan_unify_model_and_provider_config.md](file:///home/minhnhut/.gemini/antigravity-cli/brain/834e59c0-9adc-4b27-aaa6-2701513eb03d/rearchitect_plan_unify_model_and_provider_config.md).


# Pricing Margin Analysis — Pro Plan

> Exchange rate: 1 credit = 10 VND (internal reference)
> DashScope costs are the actual API costs per video generation.

---

## Scenario 1: Pro 210k VND = 18,000 credits

**Credit price:** 210,000 / 18,000 = **11.67 VND/credit**

| Video | API Cost (VND) | Credits | User Pays (VND) | Margin (VND) | Margin % |
|-------|---------------|---------|-----------------|--------------|----------|
| wan2.6 5s 720P | 1,750 | 175 | 2,042 | **292** | 16.7% |
| wan2.6 10s 720P | 3,500 | 350 | 4,084 | **584** | 16.7% |
| wan2.6 5s 1080P | 3,000 | 300 | 3,501 | **501** | 16.7% |
| wan2.6 10s 1080P | 6,000 | 600 | 7,002 | **1,002** | 16.7% |
| happyhorse 5s 720P | 17,500 | 1,750 | 20,423 | **2,923** | 16.7% |

- Margin dương — có lời trên mỗi video.
- happyhorse tạo ra margin lớn tuyệt đối (2,923 VND) nhưng % thấp hơn vì chi phí API cao.
- Margin ~16.7% đủ cover hosting + payment gateway (~3-5%) + LLM orchestration (~2-3%).

---

## Scenario 2: Pro 199k VND = 30,000 credits (SAI)

**Credit price:** 199,000 / 30,000 = **6.63 VND/credit**

| Video | API Cost (VND) | Credits | User Pays (VND) | Margin (VND) | Margin % |
|-------|---------------|---------|-----------------|--------------|----------|
| wan2.6 5s 720P | 1,750 | 175 | 1,160 | **-590** | -33.7% |
| wan2.6 10s 720P | 3,500 | 350 | 2,321 | **-1,179** | -33.7% |
| wan2.6 5s 1080P | 3,000 | 300 | 1,989 | **-1,011** | -33.7% |
| wan2.6 10s 1080P | 6,000 | 600 | 3,978 | **-2,022** | -33.7% |
| happyhorse 5s 720P | 17,500 | 1,750 | 11,603 | **-5,897** | -33.7% |

- **Margin âm trên MỌI video.** Mỗi video tạo ra đều lỗ.
- Lỗ nặng nhất ở happyhorse: mất 5,897 VND mỗi lần tạo.
- **KHÔNG BAO GIỜ sử dụng pricing này.**

---

## Scenario 3: Pro 199k VND = 15,000 credits (ĐỀ XUẤT)

**Credit price:** 199,000 / 15,000 = **13.27 VND/credit**

| Video | API Cost (VND) | Credits | User Pays (VND) | Margin (VND) | Margin % |
|-------|---------------|---------|-----------------|--------------|----------|
| wan2.6 5s 720P | 1,750 | 175 | 2,322 | **572** | 32.8% |
| wan2.6 10s 720P | 3,500 | 350 | 4,645 | **1,145** | 32.8% |
| wan2.6 5s 1080P | 3,000 | 300 | 3,981 | **981** | 32.8% |
| wan2.6 10s 1080P | 6,000 | 600 | 7,962 | **1,962** | 32.8% |
| happyhorse 5s 720P | 17,500 | 1,750 | 23,223 | **5,723** | 32.8% |

- Margin cao nhất trong 3 scenarios — ~33%.
- Đủ buffer cho: payment fees (~3%), hosting/infra (~3%), orchestration (~3%), unforeseen costs (~5%).
- Vẫn còn ~19% profit margin sau khi trừ toàn bộ overhead.

---

## So sánh nhanh

| Metric | Scenario 1 | Scenario 2 | Scenario 3 |
|--------|-----------|-----------|-----------|
| Pro price | 210k | 199k | 199k |
| Credits | 18,000 | 30,000 | 15,000 |
| VND/credit | 11.67 | 6.63 | 13.27 |
| Margin avg | 16.7% | **-33.7%** | 32.8% |
| Profitable? | ✅ Yes | ❌ **NO** | ✅ Yes |

---

## Margin tối thiểu cần thiết

| Cost component | Est. % |
|----------------|--------|
| Payment gateway (VNPay/Momo) | ~3% |
| Cloud hosting + CDN | ~3% |
| LLM orchestration (GPT/Claude for prompts) | ~2-3% |
| Support + ops | ~2% |
| **Total overhead** | **~10-11%** |
| **Minimum margin needed** | **≥ 15%** |
| **Target margin for sustainability** | **≥ 20-25%** |

---

## Nhận định & Đề xuất

### Scenario 1 (210k = 18k) — Hợp lý, margin an toàn (~17%)
- Ưu điểm: Margin dương, giá cao hơn nên tâm lý "premium".
- Nhược: Giá 210k hơi cao, dễ mất khách so với đối thủ.

### Scenario 2 (199k = 30k) — SAI, KHÔNG dùng
- Lỗ trên mỗi video. Không có kịch bản nào profitability.

### Scenario 3 (199k = 15k) — **ĐỀ XUẤT CUỐI CÙNG** ⭐
- Ưu điểm: Giá 199k dễ marketing ("dưới 200k"), margin 33% rất healthy, có buffer lớn.
- Nhược: Ít credits hơn Scenario 1 (15k vs 18k), user cần mua thêm nếu dùng nhiều.

### Kết luận

**Chọn Scenario 3: Pro 199k = 15,000 credits.**

Lý do:
1. Margin 33% — cao nhất, an toàn nhất
2. Giá 199k — tâm lý pricing tốt hơn 210k
3. Đủ buffer cover toàn bộ overhead + profit
4. User perceived value tốt: 15k credits đủ tạo ~85 video wan2.6 720P 5s
