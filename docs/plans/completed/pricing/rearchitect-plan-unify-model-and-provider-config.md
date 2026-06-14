# Kế Hoạch Tái Cấu Trúc: Hợp Nhất Model & Provider Config Vào Gói Dịch Vụ (Plan)

Tài liệu này đề xuất một kế hoạch chi tiết, toàn diện để tái cấu trúc hệ thống cấu hình mô hình (Model) và nhà cung cấp dịch vụ (Provider) của **AI Video Platform**. 

Mục tiêu chính là **quy tụ mọi cấu hình về một mối duy nhất (Single Source of Truth) nằm tại từng Gói dịch vụ (Plan) ở Laravel Backend**, loại bỏ hoàn toàn các thực thể trung gian như `QualityTier` và `ProviderPricing`, đồng thời chuyển đổi Daemon thành một lớp thực thi phi trạng thái (stateless execution plane).

---

## 1. Kiến Trúc Mới (The New Target Architecture)

Thay vì cấu hình phân tán như hiện tại (Bảng giá/Model resolve ở QualityTier & ProviderPricing của Laravel; API Key/Endpoint lưu ở `.od/media-config.json` của Daemon), chúng ta sẽ hợp nhất toàn bộ cấu hình vào cột JSON của bảng `plans`.

```
[ Laravel Admin Panel (Filament) ]
               │
               ▼
   [ Cấu hình của từng Plan ] ───► Lưu trữ trong bảng `plans` (MySQL)
               │                  - model_mapping (JSON)
               │                  - provider_config (JSON)
               │                  - quality_multiplier (Decimal)
               ▼
[ Laravel: RenderJob & Pricing ]
               │  - Tự động resolve Model ID cụ thể dựa theo Plan của User
               │  - Tính toán chi phí (credits) dựa theo quality_multiplier & provider_config của Plan
               ▼
   [ Laravel: DaemonClient ] ────► Đóng gói credentials (apiKey, baseUrl) trực tiếp vào payload
               │
               ▼  (API POST /media/generate)
   [ Express Daemon Server ] ────► Tiếp nhận credentials trực tiếp từ Laravel và kết xuất
                                  (Không cần lưu API key hay cấu hình động tại Daemon nữa)
```

---

## 2. Thiết Kế Cơ Sở Dữ Liệu Mới (Database Schema Redesign)

Chúng ta sẽ sửa đổi bảng `plans` để chứa tất cả các cấu hình này, đồng thời dọn dẹp các bảng cũ.

### 2.1 Các Cột Cần Thêm Vào Bảng `plans`

1. **`quality_multiplier`** `(decimal: 3, 2, default: 1.00)`:
   * Thay thế cho `QualityTier.multiplier`. Dùng để nhân giá cơ bản theo gói dịch vụ (ví dụ: Free = 1.0, Pro = 1.3, Studio = 1.8).
2. **`model_mapping`** `(json, nullable)`:
   * Thay thế cho `QualityTier.model_mapping`.
   * Cấu trúc lưu trữ:
     ```json
     {
       "text_to_video": "wan2.6-t2v",
       "image_to_video": "wan2.6-i2v",
       "reference_to_video": "wan2.7-r2v",
       "video_editing": "wan2.7-videoedit",
       "character_animation": "wan2.2-animate-move",
       "image_generation": "z-image-turbo",
       "image_editing": "wan2.5-i2i-preview",
       "default": "wan2.6-t2v"
     }
     ```
3. **`provider_config`** `(json, nullable)`:
   * Lưu trữ danh sách nhà cung cấp (cả mặc định và tùy chỉnh - custom provider) được phép sử dụng cho gói này.
   * Cấu trúc lưu trữ:
     ```json
     {
       "qwencloud": {
         "is_enabled": true,
         "api_key": "sk-...", 
         "base_url": "https://dashscope-intl.aliyuncs.com/api/v1",
         "multiplier": 1.15
       },
       "ckey": {
         "is_enabled": true,
         "api_key": null, 
         "base_url": null,
         "multiplier": 1.0
       },
       "my_custom_router": {
         "is_enabled": true,
         "provider_type": "openai-compatible",
         "api_key": "sk-custom...",
         "base_url": "https://api.9router.com/v1",
         "multiplier": 1.5,
         "models": ["model-a", "model-b"]
       }
     }
     ```

### 2.2 Các Bảng/Model Sẽ Loại Bỏ (Cleanup Database)
* Bảng `quality_tiers` và model `App\Models\QualityTier`.
* Bảng `provider_pricings` và model `App\Models\ProviderPricing`.

---

## 3. Thay Đổi Trong Laravel Backend (Control Plane)

### 3.1 Cập Nhật Model `App\Models\Plan`
* Thêm `$casts` cho `model_mapping` và `provider_config` thành `array`.
* Xóa quan hệ `qualityTier()` và khoá ngoại `quality_tier_id`.
* Thêm các phương thức trợ giúp trực tiếp trên Plan:
  * `resolveModelForType(string $videoType): string`
  * `getProviderCredentials(string $providerId): array`
  * `getProviderMultiplier(string $providerId): float`

### 3.2 Tái Cấu Trúc `ModelSelector`
* Phương thức `resolve()` thay vì nhận mã `qualityTierCode` sẽ nhận vào đối tượng `Plan`:
  ```php
  public function resolve(Plan $plan, string $videoTypeCode): string
  {
      if ($plan->model_mapping && isset($plan->model_mapping[$videoTypeCode])) {
          return $plan->model_mapping[$videoTypeCode];
      }
      return $plan->model_mapping['default'] ?? self::DEFAULT_MODELS[$videoTypeCode];
  }
  ```

### 3.3 Tái Cấu Trúc `PricingCalculator`
* Thay thế truy vấn đến `QualityTier` bằng cách lấy trực tiếp `quality_multiplier` từ `Plan` của User.
* Thay thế truy vấn đến `ProviderPricing` bằng cách đọc từ JSON `plan->provider_config[$providerId]['multiplier']`.
* Cập nhật các API liên quan đến tính toán giá hiển thị trên frontend.

### 3.4 Tải Cấu Trúc `DaemonClient::generateMedia`
* Đọc thông tin `provider_config` từ `Plan` của User để trích xuất `api_key` và `base_url` tương ứng với provider của model được chọn.
* Gửi kèm đối tượng `credentials` này trong body của request POST gửi sang Daemon:
  ```php
  $body['credentials'] = [
      'apiKey' => $plan->getProviderApiKey($providerId),
      'baseUrl' => $plan->getProviderBaseUrl($providerId),
  ];
  ```

### 3.5 Cập Nhật Giao Diện Filament (`PlanResource`)
Xây dựng lại tab "Cấu hình Model & Provider" trong form quản lý Plan:
* **Multiplier**: Nhập hệ số nhân giá chất lượng cho gói.
* **Model Mapping**: Hiển thị danh sách các capability (`Text-to-Video`, `Image-to-Video`, v.v.). Mỗi dòng là một Select (chọn từ danh sách model phổ biến) hoặc một TextInput cho phép admin tự viết mã Model tùy chọn.
* **Provider Config**: Sử dụng Filament `Repeater` để quản lý các Provider:
  * Chọn Provider (Qwen, CKey, ElevenLabs, Cloudflare hoặc Custom).
  * Toggle Kích hoạt (Enabled/Disabled).
  * API Key (Password input, hiển thị placeholder gợi ý dùng mặc định nếu để trống).
  * Base URL (TextInput, gợi ý mặc định nếu để trống).
  * Multiplier (Hệ số nhân giá riêng cho nhà cung cấp trong gói này).

---

## 4. Thay Đổi Trong Express Daemon (Execution Plane)

### 4.1 Nhận Dạng Credentials Từ Request
* Cập nhật router nhận yêu cầu tạo sinh tại `apps/daemon/src/routes/media.ts`:
  * Tiếp nhận đối tượng `credentials` (`apiKey`, `baseUrl`) từ body request gửi lên từ Laravel.
* Cập nhật hàm `generateMedia` trong `apps/daemon/src/media/index.ts`:
  ```typescript
  // Ưu tiên credentials truyền lên từ Laravel payload, chỉ fallback về local config nếu trống
  const credentials = args.credentials?.apiKey 
      ? args.credentials 
      : await resolveProviderConfig(projectRoot, def.provider);
  ```

### 4.2 Hỗ Trợ Custom Provider/Model
* Nếu Laravel gửi lên một Model ID không nằm trong danh sách tĩnh `ALL_PROVIDERS` của Daemon, nhưng có đi kèm `credentials` và thông tin Provider tùy chọn (ví dụ: `provider_type: "openai-compatible"`):
  * Daemon sẽ định tuyến sang trình xử lý API OpenAI chung (như hàm của CKey) sử dụng `baseUrl`, `apiKey` và `model` do Laravel cung cấp, thay vì báo lỗi "unknown model".
  * Việc này cho phép hệ thống gọi được bất kỳ dịch vụ API nào có chuẩn tương thích OpenAI/DashScope mà không cần cập nhật mã nguồn của Daemon.

### 4.3 Dọn Dẹp Mã Nguồn (Cleanup Daemon)
* Loại bỏ hoặc vô hiệu hóa endpoint `/media/config` (GET/PUT) trên Daemon để tinh giản kiến trúc.
* Không cần lưu trữ động vào tệp tin `.od/media-config.json` nữa (chỉ giữ lại các biến môi trường làm fallback mặc định cho Daemon khi chạy các tác vụ nội bộ hoặc preview/chạy thử không qua Laravel).

---

## 5. Lộ Trình Triển Khai Từng Bước (Step-by-Step Roadmap)

### Bước 1: Chuẩn Bị & Tạo Migration (Backend)
1. Tạo một migration mới để thêm `quality_multiplier` (decimal), `model_mapping` (json), `provider_config` (json) vào bảng `plans`.
2. Viết mã chuyển đổi dữ liệu trong file migration để tự động sao chép cấu hình từ bảng `quality_tiers` hiện tại sang các bản ghi `plans` tương ứng (Free -> standard, Pro -> premium, Studio -> ultra), sau đó xóa cột `quality_tier_id` và bảng `quality_tiers`.

### Bước 2: Nâng Cấp Express Daemon
1. Sửa đổi `apps/daemon/src/media/index.ts` để chấp nhận `credentials` từ tham số truyền vào hàm `generateMedia`.
2. Cập nhật route POST `/projects/:id/media/generate` trong `apps/daemon/src/routes/media.ts` để đọc `credentials` từ HTTP request body và truyền vào `generateMedia`.
3. Kiểm thử cục bộ Daemon bằng cách gửi request kèm API Key giả lập để đảm bảo Daemon vẫn hoạt động bình thường.

### Bước 3: Tái Cấu Trúc Logic Phân Giải & Tính Giá (Laravel)
1. Cập nhật Model `Plan` và chuyển đổi các liên kết cũ.
2. Cập nhật `ModelSelector::resolve()` để sử dụng `Plan` làm nguồn cấu hình.
3. Cập nhật `PricingCalculator` để sử dụng hệ số nhân từ `Plan`.
4. Cập nhật `DaemonClient` để gửi kèm API Key và Base URL trích xuất từ Plan của User.

### Bước 4: Tái Cấu Trúc Giao Diện Giao Diện Quản Trị Filament
1. Sửa đổi `PlanResource` để tích hợp form cấu hình mô hình và nhà cung cấp.
2. Xóa các File Resource và Page của `QualityTier` và `ProviderPricing` ra khỏi Filament.

### Bước 5: Viết Lại Bộ Kiểm Thử (Tests)
1. Cập nhật toàn bộ các file feature test liên quan đến tính toán giá (`PricingConflictAnalysisTest`, `ModelSelectionConflictTest`, `RenderJobTest`, v.v.) để khớp với logic tính giá từ Plan mới.
2. Đảm bảo toàn bộ test suite chạy thành công.

---

## 6. Đánh Giá Rủi Ro & Giải Pháp Khắc Phục (Risks & Mitigation)

| Rủi Ro (Risks) | Khả Năng | Ảnh Hưởng | Giải Pháp Khắc Phục (Mitigation) |
| :--- | :--- | :--- | :--- |
| **Mất dữ liệu ánh xạ model hiện tại khi chạy migration** | Trung bình | Cao | Viết logic chuyển đổi dữ liệu cẩn thận trong file migration (đọc dữ liệu từ `quality_tiers` trước khi drop bảng). |
| **Quá tải đường truyền khi gửi API Key qua mạng liên tục** | Thấp | Thấp | API Key chỉ gửi qua kết nối HTTPS nội bộ (Laravel ↔ Daemon), các key nhạy cảm vẫn được mã hóa và bảo mật bằng kết nối private. |
| **Xung đột với các kịch bản test cũ** | Cao | Trung bình | Các test cũ khởi tạo dữ liệu mẫu bằng `QualityTier::create(...)`. Cần cập nhật lại các bộ tạo dữ liệu mẫu (Factories/Seeders) trong test suite sang dùng `Plan::create(...)` kèm JSON tương ứng. |
| **Rò rỉ API Key ở log Daemon** | Thấp | Cao | Đảm bảo Daemon ghi đè hoặc ẩn trường `apiKey` / `credentials` trước khi xuất log ra Loki/Console. |

---

## 7. Danh Sách Dọn Dẹp Chi Tiết (Comprehensive Cleanup Checklist)

Để đảm bảo hệ thống sạch sẽ, không bị thừa thãi mã nguồn hoặc nhầm lẫn kiến trúc (tránh "lộn" code và docs), chúng ta đã thực hiện dọn dẹp triệt để các phần sau:

### 7.1 Các Tệp Tin Backend Đã Xóa Bỏ Hoàn Toàn (Delete List)
* **Models**:
  * `QualityTier.php`
  * `ProviderPricing.php`
* **Filament Resources & Pages**:
  * Thư mục `backend/app/Filament/Resources/QualityTiers/` (bao gồm: `QualityTierResource.php`, `Pages/CreateQualityTier.php`, `Pages/EditQualityTier.php`, `Pages/ListQualityTiers.php`, `Schemas/QualityTierForm.php`, `Tables/QualityTiersTable.php` - Đã xóa)
  * Thư mục `backend/app/Filament/Resources/ProviderPricingResource/` (Đã xóa)
  * File `backend/app/Filament/Resources/ProviderPricingResource.php` (Đã xóa)

### 7.2 Các Bảng Database Đã Drop Trong Migration
* **Bảng chính liên quan**:
  * `quality_tiers` (xóa sau khi migrate `multiplier` và `model_mapping` sang bảng `plans`)
  * `provider_pricings` (xóa sau khi migrate `multiplier` sang `provider_config` của `plans`)
* **Bảng chết từ trước đã dọn dẹp**:
  * `video_type_pricings` (bảng chết chưa được sử dụng)
  * `pricing_addons` (bảng chết chưa được sử dụng)

### 7.3 Cập Nhật Logic File Code Hiện Có (Refactor List)
* **App/Models/Plan.php**: Xóa quan hệ `qualityTier()`, thêm casts cho `model_mapping` và `provider_config`.
* **App/Models/VideoType.php**: Xóa quan hệ `providerPricings()`.
* **App/Services/ModelSelector.php**: Thay đổi signature nhận `Plan $plan` thay vì `string $qualityTierCode`.
* **App/Services/Pricing/PricingCalculator.php**: Đọc hệ số multiplier chất lượng trực tiếp từ Plan và provider multiplier từ `plan->provider_config` thay vì query `QualityTier` và `ProviderPricing`.
* **App/Http/Requests/CreateRenderJobRequest.php**: Cập nhật validate trường `quality_tier`.
* **App/Http/Requests/Pricing/CalculatePricingRequest.php**: Bỏ validate `quality` dựa trên bảng `quality_tiers`.
* **App/Filament/Pages/PricingTable.php**: Xóa bỏ các query liên quan đến `QualityTier` và `ProviderPricing`. Vẽ bảng giá trực tiếp dựa trên cấu hình Plan.
* **App/Filament/Resources/StoryboardResource/Schemas/StoryboardForm.php**: Cập nhật options quality tier từ bảng `plans`.
* **App/Http/Controllers/API/StoryboardController.php**: Cập nhật logic resolve tier từ `plan->slug`.
* **App/Services/RenderJobService.php**: Thay đổi cách lấy model qua `$plan`.
* **Database/Seeders/PlanSeeder.php**: Thiết lập giá trị mặc định cho `model_mapping` và `provider_config` khi seed.
* **Database/Seeders/PricingSystemSeeder.php**: Loại bỏ phần seeding cho `QualityTier` và `ProviderPricing`. Thay thế bằng cập nhật cấu hình mặc định vào bảng `plans`.

### 7.4 Daemon (Execution Plane)
* **Endpoint /media/config**: Loại bỏ hoàn toàn hoặc vô hiệu hóa các method PUT/GET liên quan đến update API key động tại daemon.
* **verify-media-models.mjs**: Viết lại script verify tại daemon để đồng bộ trực tiếp với file xuất JSON cấu hình của Laravel hoặc chỉ verify cấu hình tĩnh của Daemon thay vì đọc file Seeder PHP của Laravel.

### 7.5 Tài Liệu Hướng Dẫn (Docs) và Dữ Liệu Đào Tạo (Training/Skill Data)
Các file này đã được cập nhật/đánh dấu cảnh báo legacy để tránh AI agent trong tương lai đọc phải thông tin cũ và thực hiện sai:
* **Các file Docs đã được gắn thẻ cảnh báo [LEGACY DOCUMENT]**:
  * `docs/plans/completed/pricing/admin-tables-audit.md`
  * `docs/plans/completed/pricing/merge-provider-pricing-into-video-type.md`
  * `docs/plans/completed/billing/pricing-review.md`
  * `docs/plans/completed/billing/pricing-softening-strategy.md`
  * `docs/plans/completed/billing/pricing-softening-summary.md`
  * `docs/plans/completed/billing/pricing-analysis.md`
  * `docs/plans/completed/billing/final-pricing-plan.md`
  * `docs/plans/completed/billing/profitable-pricing-strategy.md`
  * `docs/plans/completed/billing/pricing-margin-analysis.md`
* **Cập nhật Dữ liệu Skill đào tạo Subagent**:
  * Đã cập nhật định nghĩa Model `Plan` mới (thêm `quality_multiplier`, `model_mapping`, `provider_config`) tại:
    * `.claude/skills/billing-and-credits/SKILL.md`
    * `.opencode/skills/billing-and-credits/SKILL.md`

### 7.6 Cập Nhật Bộ Kiểm Thử (Test Suite)
Đã xóa bỏ hoặc viết lại hoàn toàn các test case giả lập `QualityTier` hoặc `ProviderPricing`:
* **Feature Tests**:
  * `backend/tests/Feature/ModelSelectionConflictTest.php` (Đã xóa)
  * `backend/tests/Feature/PricingConflictAnalysisTest.php` (Đã xóa)
  * `backend/tests/Feature/RenderJobPipelineTest.php`
  * `backend/tests/Feature/StoryboardControllerTest.php`
* **Unit Tests**:
  * `backend/tests/Unit/Services/ModelConfigurationTest.php`
  * `backend/tests/Unit/Services/ModelSelectorTest.php`
  * `backend/tests/Unit/PricingCalculatorTest.php`
