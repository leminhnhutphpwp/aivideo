# Quy trình Deploy Live — Wavise

> Runbook triển khai production. **Server-agnostic** — điền cấu hình server ở block dưới.
> Kích hoạt bảo mật lần đầu: xem [`../plans/active/security/coupon-security-golive.md`](../plans/active/security/coupon-security-golive.md).

---

## 🔴 NGUYÊN TẮC TỐI QUAN TRỌNG — ZERO-DOWNTIME

**Mọi lần deploy / build mới KHÔNG được gây downtime. Hệ thống phải LUÔN sống.**

- Người dùng **không** gặp lỗi, không nghẽn, không mất phiên; API/realtime **không gián đoạn**.
- **Quá trình BUILD image (bước lâu nhất) không được chặn hệ thống** — container cũ vẫn phục vụ 100% trong khi build bản mới.
- Chỉ **swap** sang bản mới khi image mới **đã build xong + health-check OK**.
- **TUYỆT ĐỐI KHÔNG** `docker compose down` (dừng cả stack = downtime). Chỉ dùng `up -d` (recreate chọn lọc) hoặc blue-green.
- Service **stateful** (mysql, redis, minio) **không recreate** khi deploy app — volume giữ nguyên, 0 gián đoạn dữ liệu.

Nếu một thay đổi không thể zero-downtime (vd migration phá huỷ) → **tách thành bước riêng** theo pattern expand→contract (xem dưới), không gộp vào deploy code.

---

## Cấu hình server (điền khi có)

```
SERVER_IP   = <sẽ cung cấp>
SSH_USER    = root
SSH_KEY     = ~/.ssh/minhnhut99devmacos      # public key đã add vào server
APP_DIR     = /var/www/wavise                # thư mục repo trên server (tuỳ chọn)
COMPOSE     = backend/docker-compose.yml     # compose PROD
DOMAIN      = <app.domain.vn>                # nếu chạy sau reverse proxy
```

SSH vào: `ssh -i ~/.ssh/minhnhut99devmacos root@<SERVER_IP>`

## ✅ Pre-deploy checklist (nhất là server dùng chung / RAM eo hẹp)

- [ ] **Port không trùng**: `ss -tlnp` + `docker ps` để xem port đang bận. Nếu web 3000 / backend 8000… bị chiếm → đặt `WEB_PORT`, và scope stack bằng `STACK_NAME=wavise` (tách container/volume khỏi project khác).
- [ ] **RAM đủ**: `free -h`. Stack đủ 9 service khá nặng. Nếu RAM eo hẹp: dùng **Cloudflare R2 thay MinIO**, cân nhắc MySQL/Redis external, hoặc nâng RAM trước — tránh OOM làm sập các app khác trên cùng server.
- [ ] **Disk**: `df -h`.
- [ ] **.env** đã có đủ secret production (KHÔNG commit): DB, R2, mail, `APP_BFF_SECRET`, `TURNSTILE_SECRET`, velocity vars… (xem go-live checklist).
- [ ] **Web trong prod**: `backend/docker-compose.yml` hiện chưa có service `web` — thêm service `web` (mirror dev) + `LARAVEL_INTERNAL_URL` + `APP_BFF_SECRET`, hoặc deploy web riêng.

---

## A. Deploy chuẩn — "build trước, swap nhanh" (near-zero downtime)

Phù hợp đa số lần cập nhật. Downtime chỉ vài giây/service lúc swap; **giai đoạn build = 0 downtime**.

```bash
ssh -i ~/.ssh/minhnhut99devmacos root@<SERVER_IP>
cd <APP_DIR>
git pull origin main

# 1) BUILD image mới — container CŨ VẪN CHẠY, KHÔNG downtime trong lúc build (bước lâu nhất)
docker compose -f backend/docker-compose.yml build

# 2) MIGRATION backward-compatible TRƯỚC khi swap (dùng image mới vừa build, chạy 1 lần)
docker compose -f backend/docker-compose.yml run --rm app php artisan migrate --force

# 3) SWAP nhanh — chỉ recreate service có image/config mới; stateful (mysql/redis/minio) giữ nguyên
docker compose -f backend/docker-compose.yml up -d --no-deps app web daemon reverb queue scheduler

# 4) Worker nhận code mới một cách GRACEFUL (không kill job đang chạy)
docker compose -f backend/docker-compose.yml exec app php artisan queue:restart

# 5) Dọn image cũ
docker image prune -f
```

> `up -d` chỉ recreate container thay đổi — **không** đụng service khác. `--no-deps` để không kéo theo recreate mysql/redis/minio.

## B. True zero-downtime — Blue-Green (khi cần TUYỆT ĐỐI không gián đoạn)

Chạy 2 stack song song, đổi reverse proxy khi bản mới healthy. Downtime = **0**, rollback tức thì.

```bash
# Bản đang chạy: STACK_NAME=wavise-blue (reverse proxy đang trỏ vào)
# Deploy bản mới sang green (build + up, KHÔNG đụng blue):
STACK_NAME=wavise-green WEB_PORT=<port_green> \
  docker compose -f backend/docker-compose.yml up -d --build

# Health-check green OK (web + /api/health) → đổi upstream reverse proxy blue → green
#   (nginx: sửa upstream + `nginx -s reload`; traefik: đổi label/priority — reload KHÔNG drop kết nối)

# Giữ blue vài phút để rollback tức thì; ổn rồi mới tắt:
STACK_NAME=wavise-blue docker compose -f backend/docker-compose.yml down
```

Rollback blue-green = trỏ proxy về stack cũ (giây lát), không cần rebuild.

---

## Quy tắc MIGRATION (bắt buộc để zero-downtime)

Trong lúc swap, **code cũ và code mới cùng chạy** một khoảng — nên schema phải tương thích cả hai (**Expand → Contract**):

1. **Expand** (deploy N): chỉ thêm — cột/bảng mới **nullable hoặc có default**, index. Code mới ghi cả cột cũ + mới nếu đổi field.
2. **Contract** (deploy N+1, sau khi bản cũ đã hết dùng): mới drop/rename cột cũ.
- **KHÔNG** drop/rename/`change` cột đang dùng chung 1 lần với deploy code.
- **KHÔNG** `migrate:fresh` / `db:wipe` (rule dự án — dữ liệu thật).

## Sau deploy — verify

```bash
docker compose -f backend/docker-compose.yml ps           # tất cả healthy
curl -fsS https://<DOMAIN>/api/health && echo OK           # backend
curl -fsS -o /dev/null -w "%{http_code}\n" https://<DOMAIN> # web = 200
docker compose -f backend/docker-compose.yml logs --tail=50 app | grep -i error || echo "log sạch"
```
Smoke test luồng chính: login · render job · community · billing.

## Rollback nhanh

- **Deploy chuẩn (A)**: `git checkout <commit/tag cũ>` → `build` → `up -d` (hoặc giữ image tag cũ và `up -d` với tag đó). Migration đã theo expand→contract nên bản cũ vẫn chạy với schema mới.
- **Blue-Green (B)**: trỏ reverse proxy về stack cũ — tức thì.

## Ghi chú vận hành

- Prod (`backend/docker-compose.yml`) đã có service `queue` (worker) + `scheduler` (`schedule:work` — chạy `credits:renew`, `events:grant-birthday`, đồng bộ R2…). Không cần cron host.
- Lần go-live đầu: chạy checklist bảo mật `docs/plans/active/security/coupon-security-golive.md`.
- Server dùng chung nhiều project: luôn `STACK_NAME` + port riêng để không đụng app khác.
