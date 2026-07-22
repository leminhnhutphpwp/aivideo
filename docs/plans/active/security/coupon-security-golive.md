# Go-Live Checklist — Kích hoạt bảo mật Coupon/Event (4 lớp) + web-in-Docker prod

> Trạng thái: **ĐÃ BUILD (2026-07-20), đang FAIL-OPEN ở dev.** Mọi lớp env-gated —
> để trống secret = tắt (dev chạy bình thường). Khi go-live, bật bằng cách set env dưới đây.
> Agent nào đọc file này khi chuẩn bị live → hãy **chủ động đề xuất chạy checklist này**.

## Bối cảnh
Endpoint `POST /api/coupons/redeem`, `POST /api/events/{slug}/claim` (+ `validate`, `GET /events`,
`POST /auth/register`) đã được bọc 4 lớp bảo mật (commit `83998757`). Kiến trúc: browser → **Next BFF route**
(`apps/web/src/app/api/bff/*`) ký HMAC → Laravel verify. Chi tiết code: `backend/config/coupon_security.php`,
`backend/app/Http/Middleware/{VerifyBffSignature,VerifyTurnstile,CouponAbuseGuard}.php`,
`backend/app/Services/Security/TurnstileVerifier.php`, `apps/web/src/lib/bff/sign.ts`,
`apps/web/src/components/security/TurnstileWidget.tsx`. Biến env đã ghi mẫu (rỗng) trong
`backend/.env.example` + `apps/web/.env.example`.

## Checklist kích hoạt (prod)

### ☐ Lớp 4 — HMAC (chỉ-nhận-từ-hệ-thống)
- Sinh 1 secret mạnh: `openssl rand -hex 32`.
- Set **cùng một giá trị** ở HAI nơi:
  - Laravel: `APP_BFF_SECRET=<secret>` (backend `.env`).
  - Web container: `APP_BFF_SECRET=<secret>` (env service web — **KHÔNG** prefix `NEXT_PUBLIC_`, chỉ server-side đọc).
- ⚠️ Nếu chỉ set 1 bên → Laravel sẽ từ chối request (403). Phải khớp tuyệt đối. Skew mặc định 300s (`APP_BFF_MAX_SKEW`).

### ☐ Lớp 3 — Cloudflare Turnstile (chống bot/mass-reg)
- Đăng ký Cloudflare Turnstile → lấy **site key** (public) + **secret key**.
- Laravel: `TURNSTILE_SECRET=<secret>`.
- Web: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>` (widget tự bật ở register/claim/redeem khi có key).
- Để trống = widget ẩn + backend bỏ qua (dev).

### ☐ Lớp 2 — Velocity / anti-farm (Laravel `.env`)
- `COUPON_REQUIRE_VERIFIED=true` (mặc định đã true — bắt xác thực email mới redeem/claim).
- `COUPON_MIN_ACCOUNT_AGE_MINUTES=15` (chặn reg-xong-claim-ngay; 0 = tắt).
- `COUPON_PER_IP_DAILY_CAP=20` (trần claim/redeem theo IP/ngày; 0 = tắt).

### ☐ Web-in-Docker ở PROD
- `backend/docker-compose.yml` (prod) hiện **CHƯA có service `web`** (mới thêm ở dev). Khi deploy web bằng Docker prod:
  thêm service `web` mirror dev, kèm `LARAVEL_INTERNAL_URL=http://app:8000` (BFF route chạy server-side trong
  container, không tới `localhost:8000` được) + `APP_BFF_SECRET` (khớp Laravel) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Nếu web deploy ngoài Docker (Vercel/PM2…): set `LARAVEL_INTERNAL_URL` trỏ tới URL nội bộ của Laravel.

### ☐ Birthday scheduler
- Prod `docker-compose.yml` **đã có** service `scheduler` (`php artisan schedule:work`) → `events:grant-birthday`
  tự chạy `dailyAt('07:00')` **khi admin đã tạo 1 Event `trigger=birthday`** trong `/admin/coupon-events`.
- Dev **không** có scheduler service → test tay: `docker exec aivideo-app-1 php artisan events:grant-birthday`.

### ☐ Config bắt buộc mới (bug-sweep 2026-07-22)
- **`HORIZON_ADMIN_EMAIL=<email admin thật>`** (backend `.env`). Gate Horizon dashboard giờ **fail-closed**:
  nếu không set ở prod (env non-local) → **không ai vào được** `/admin` Horizon. (Trước đây default `admin@example.com`
  — vừa khoá admin thật vừa mở cho ai có email đó.)
- **`FRONTEND_URL=https://<domain-web>`** (backend `.env`). Ở prod đây là **origin CORS duy nhất** (localhost chỉ được
  whitelist khi `APP_ENV=local`). Thiếu → web gọi API bị CORS chặn. Cũng là base cho link trong email (login/reset).
- **Chạy migration**: `docker compose ... run --rm app php artisan migrate --force` phải chạy để tạo
  `community.*` settings (`database/settings/2026_07_22_000001_create_community_settings.php`) — thiếu → community feed
  throw `MissingSettings`. (Nằm trong bước migrate chuẩn của runbook `docs/deployment/README.md §5b`.)

## Verify sau khi bật
- E2E: claim/redeem qua BFF với secret đã set → thành công; gọi thẳng Laravel `/api/coupons/redeem` (không qua BFF)
  → 403 (thiếu chữ ký HMAC). Origin lạ → 403. Register/claim hiện thử thách Turnstile.
- Rollback: xoá/để trống các env → về fail-open ngay, không mất dữ liệu.

## Con trỏ mã & test
- Tests: `backend/tests/Feature/CouponSecurityMiddlewareTest.php`, `CouponEventServiceTest.php`.
- Contract HMAC (cho ai sửa BFF): canonical `"{ts}.{METHOD}.{/api/path}.{sha256(body)}"`, header `X-BFF-Timestamp` +
  `X-BFF-Signature` (HMAC-SHA256 hex, key `APP_BFF_SECRET`); Turnstile token forward qua header `CF-Turnstile-Response`.
