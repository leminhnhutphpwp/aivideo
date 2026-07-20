<div align="center">

# Wavise — AI Video Platform

**Nền tảng SaaS AI-native tạo video ngắn viral tự động.**
Prompt-first · đa nền tảng (TikTok · Reels · YouTube Shorts) · tiếng Việt là ngôn ngữ chính.

`Pre-MVP` · `Monorepo` · `Docker-first`

</div>

---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ](#công-nghệ)
- [Yêu cầu](#yêu-cầu)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Cổng dịch vụ](#cổng-dịch-vụ)
- [Lệnh thường dùng](#lệnh-thường-dùng)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Tính năng chính](#tính-năng-chính)
- [Kiểm thử](#kiểm-thử)
- [Triển khai (production)](#triển-khai-production)
- [Quy trình Git](#quy-trình-git)
- [Tài liệu](#tài-liệu)

---

## Tổng quan

Wavise biến một câu prompt thành video ngắn hoàn chỉnh: sinh kịch bản → sinh ảnh/khung hình →
dựng video → lồng tiếng → xuất bản. Hệ thống chia làm **3 tầng** tách bạch trách nhiệm — tầng
điều khiển (Laravel) không bao giờ tự sinh media, tầng thực thi (Daemon) không giữ nghiệp vụ
billing/auth — giúp mở rộng và thay thế provider độc lập.

## Kiến trúc

```
   Next.js (3000) ──HTTP──►  Laravel (8000) ──proxy + webhook──►  Daemon (7456)
     Web / UI              Control plane                        Execution plane
                     auth · credits · queue ·                media generation,
                     admin · email · realtime                16 AI providers
```

| Tầng | Vai trò |
|------|---------|
| **Web** (`apps/web`) | Giao diện Next.js. Gọi Laravel để auth/credits/billing; chỉ chạm Daemon **qua proxy Laravel**, không gọi trực tiếp. |
| **Backend** (`backend`) | Control plane: auth (JWT), tín dụng/billing, hàng đợi (Horizon), admin (Filament v5), email, realtime (Reverb). |
| **Daemon** (`apps/daemon`) | Execution plane: sinh media với 16 provider (Qwen/Wan, Kling, Haiper, Luma, Runway…). Express + better-sqlite3. |

## Công nghệ

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 4, GSAP / Motion |
| Backend | Laravel 12, JWT, Queue + Horizon, Reverb (WebSocket), Filament v5 |
| Media engine | Express, better-sqlite3, 16 AI provider |
| CSDL | MySQL (Laravel, trong Docker) · SQLite (daemon) |
| Lưu trữ | MinIO (dev) → Cloudflare R2 (prod, bucket `apaiplatform`) |
| Hạ tầng | Docker Compose (toàn stack), scheduler + queue worker riêng ở prod |

## Yêu cầu

- **Docker** + **Docker Compose** (bắt buộc — toàn bộ stack chạy trong container)
- Git
- ~8GB RAM trống cho stack dev

> Không cần cài PHP/Node/MySQL trên máy host — mọi thứ chạy trong Docker.

## Bắt đầu nhanh

```bash
# 1. Clone
git clone git@github.com:leminhnhutphpwp/AI-Video-Platform.git wavise
cd wavise

# 2. Chuẩn bị biến môi trường
cp backend/.env.example backend/.env          # điều chỉnh nếu cần
cp apps/web/.env.example apps/web/.env
cp apps/daemon/.env.example apps/daemon/.env   # thêm API key provider ở đây (KHÔNG commit)

# 3. Khởi động toàn bộ stack (web, backend, daemon, mysql, redis, minio, reverb)
bash scripts/dev.sh start

# 4. Mở
#   Web        → http://localhost:3000
#   Admin      → http://localhost:8000/admin
#   MinIO      → http://localhost:9001
```

Áp dụng thay đổi code:

```bash
bash scripts/dev.sh restart web       # Next.js
bash scripts/dev.sh restart backend   # Laravel
docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon   # Daemon (khi đổi src/ hoặc .env)
```

## Cổng dịch vụ

| Dịch vụ | Cổng | | Dịch vụ | Cổng |
|---------|------|-|---------|------|
| Web | 3000 | | MinIO API | 9000 |
| Backend API | 8000 | | MinIO Console | 9001 |
| Daemon | 7456 | | Reverb (WS) | 8080 |
| MySQL (host) | 3307 | | Redis (host) | 6380 |

> Nhiều deployment trên cùng máy: đặt `STACK_NAME` (scope container/volume) và `WEB_PORT` để tránh trùng.

## Lệnh thường dùng

```bash
# Backend — LUÔN chạy trong container (MySQL trong Docker, tách khỏi host)
docker exec aivideo-app-1 php artisan migrate
docker exec aivideo-app-1 php artisan db:seed --class=SomeSeeder
docker exec aivideo-app-1 php artisan optimize:clear

# Kiểm tra kiểu (mong đợi 0 lỗi)
cd apps/web    && npx tsc --noEmit
cd apps/daemon && npx tsc --noEmit
```

> ⚠️ **Không bao giờ** `migrate:fresh` / `db:wipe` / xoá hàng loạt — DB chứa dữ liệu test thật.
> Chỉ dùng `db:seed --class=...` có chủ đích.

## Cấu trúc thư mục

```
.
├── apps/
│   ├── web/            # Next.js 15 — giao diện người dùng
│   ├── daemon/         # Express — media engine (16 provider)
│   └── skills/         # Skill sinh nội dung (dùng chung backend + daemon)
├── backend/            # Laravel 12 — control plane (API, admin, billing)
├── scripts/            # dev.sh, deploy, tiện ích
├── docs/               # kiến trúc & kế hoạch (docs/plans/active|completed)
├── .claude/            # cấu hình Claude Code (agents · skills · rules · workflows)
├── CLAUDE.md           # hướng dẫn dự án cho agent (đọc đầu tiên)
└── task-status.md      # trạng thái công việc hiện tại
```

## Tính năng chính

- **Sinh video từ prompt** — 3 chế độ render: `single_flow` (một prompt biên dịch),
  `storyboard_image` (ảnh đa panel → image-to-video), `multi_scene` (ghép cảnh — *tạm tắt cho bản launch*).
- **Media & phục chế ảnh** — studio Image Editing (i2i qwen-image-edit) + bộ skill phục chế/cải tạo.
- **Tín dụng & thanh toán** — hệ credits trả-theo-lượt, gói nạp, thanh toán chuyển khoản (SePay),
  `PricingCalculator` là nguồn giá duy nhất.
- **Coupons & Events** — admin tạo chiến dịch (deadline, giới hạn), user nhận **mã duy nhất theo tài
  khoản**; mã chào mừng khi đăng ký và quà sinh nhật tự động; kèm bảo mật API 4 lớp
  (HMAC BFF · Turnstile · velocity · origin).
- **Cộng đồng** — xuất bản, feed, remix tác phẩm.
- **Admin (Filament v5)** — quản lý user, tín dụng, model, báo cáo, cấu hình hệ thống.
- **Realtime** — cập nhật tiến độ job qua Reverb/WebSocket.

## Kiểm thử

```bash
# Backend (PHPUnit/Pest, trong Docker)
docker exec aivideo-app-1 php artisan test
docker exec aivideo-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"

# Frontend & daemon
cd apps/web    && npx tsc --noEmit
cd apps/daemon && npx tsc --noEmit

# Đồng bộ model media
node apps/daemon/scripts/verify-media-models.mjs
```

## Triển khai (production)

- Prod dùng `backend/docker-compose.yml` — có thêm service `queue` (Horizon) và `scheduler`
  (`schedule:work`) chạy các lệnh định kỳ (gia hạn credits, quà sinh nhật, đồng bộ R2…).
- Lưu trữ chuyển sang **Cloudflare R2**; email/queue qua Redis.
- **Trước khi go-live**, chạy checklist bật bảo mật coupon + web-in-Docker:
  [`docs/plans/active/security/coupon-security-golive.md`](docs/plans/active/security/coupon-security-golive.md).

## Quy trình Git

- **`main`** là nhánh chuẩn duy nhất — luôn ở trạng thái chạy được.
- Phát triển/sửa lỗi trên **nhánh riêng** (`feat/…`, `fix/…`), rồi **merge vào `main`**.
- Không commit secret/`.env`; API key provider chỉ nằm trong `apps/daemon/.env` (đã gitignore).
- Commit nhỏ, có thể kiểm chứng; theo phong cách code xung quanh.

## Tài liệu

| Tài liệu | Đường dẫn |
|----------|-----------|
| Hướng dẫn dự án (cho agent) | [`CLAUDE.md`](CLAUDE.md) |
| Trạng thái công việc | [`task-status.md`](task-status.md) |
| Kiến trúc & kế hoạch | [`docs/plans/`](docs/plans/) |
| Cấu hình Claude Code | [`.claude/README.md`](.claude/README.md) |

---

<div align="center">
<sub>Proprietary · Wavise</sub>
</div>
