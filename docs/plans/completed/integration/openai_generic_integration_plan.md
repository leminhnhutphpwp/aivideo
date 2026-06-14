# Kế Hoạch Tích Hợp "OpenAI Compatible Generic Handler"

Mục tiêu của kế hoạch này là giúp hệ thống hỗ trợ hàng loạt các AI Provider trên thế giới (như TogetherAI, Groq, DeepSeek, OpenRouter...) mà không cần code thêm từng file xử lý riêng lẻ. Chúng ta sẽ sử dụng chuẩn OpenAI (hiện đang là de-facto standard) làm giao thức chung (Generic Protocol).

## Bước 1: Cập nhật giao diện Laravel Admin (`PlanResource.php`)
- Thêm trường `api_protocol` (Giao thức API) vào trong Repeater cấu hình `provider_config`.
- Các lựa chọn (Options):
  - `auto`: Tự động (Theo mã Provider). Ví dụ: chọn `qwencloud` thì dùng logic Qwen.
  - `openai`: Chuẩn OpenAI (OpenAI Compatible).

## Bước 2: Bổ sung xử lý Backend Laravel (`Plan.php` & `DaemonClient.php`)
- Viết thêm hàm `getProviderProtocol($providerId)` trong model `Plan.php` để lấy ra cấu hình giao thức.
- Trong `DaemonClient.php`, khi chuẩn bị payload gửi lên Daemon, đính kèm thêm biến `protocol: 'openai'` vào `req.body` nếu Admin chọn chuẩn OpenAI.

## Bước 3: Cập nhật Router tại Daemon (`routes/media.ts`)
- Bổ sung tham số `protocol` vào các hàm `generateMedia`, lấy dữ liệu từ `req.body?.protocol`.

## Bước 4: Viết bộ xử lý OpenAI Generic (`providers/openai-generic.ts`)
- Viết hàm `renderOpenAIGenericImage`: Gọi API `POST /v1/images/generations` theo chuẩn OpenAI. Trả về kết quả từ `data[0].url` hoặc `b64_json`.
- Viết hàm `renderOpenAIGenericTTS`: Gọi API `POST /v1/audio/speech` theo chuẩn OpenAI. Trả về định dạng mp3/wav.
*(Tạm thời chưa làm Video vì OpenAI chưa có chuẩn REST public chính thức cho Video).*

## Bước 5: Đăng ký Router (`media/index.ts`)
- Cập nhật hàm `resolveRenderer`: Nếu nhận được `protocol = 'openai'`, lập tức chuyển hướng request tới `openai-generic` thay vì tìm theo `provider_id`.
- Thêm đăng ký vào `RENDER_REGISTRY`:
  ```typescript
  ['openai:image:*', withSimulation(renderOpenAIGenericImage, 'image')],
  ['openai:audio:speech', withSimulation(renderOpenAIGenericTTS, 'audio')],
  ```

---
**Tóm lại:** Nhờ kế hoạch này, bạn có thể tự do điền Provider mới như `together-ai`, chọn Giao thức `OpenAI Compatible`, điền URL `https://api.together.xyz/v1`, và nó sẽ **chạy được ngay lập tức**!
