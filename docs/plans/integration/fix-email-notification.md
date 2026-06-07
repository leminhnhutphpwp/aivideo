# Fix Email Notification cho Job Completion — Design Plan

## Date
2026-05-31

## Overview
Fix 2 vấn đề email notification:
1. Email subject sai cho image jobs (luôn hiện "Video của bạn đã sẵn sàng")
2. Email luôn được gửi bất kể user preference — cần check notification setting trước khi gửi

## Research Findings

### Vấn đề 1: Subject sai cho image jobs
- `HandleJobCompletion.php:75` gửi mail `job_completed` **luôn giống nhau** cho cả image/video
- `EmailTemplateSeeder.php:81` subject cứng: `'Video của bạn đã sẵn sàng - {{job_name}}'`
- `job_completed.blade.php:4,16` hardcode "Video của bạn đã sẵn sàng!" và button "Xem video"
- **Tuy nhiên** `HandleJobCompletion.php:35` đã xác định `$assetType` dựa trên capability (`t2i/i2i/inpaint` → `image`, còn lại → `video`) — có thể dùng để phân biệt

### Vấn đề 2: Không check notification preference
- `HandleJobCompletion.php:75` và `HandleJobFailure.php:74` gọi `$mailService->sendToUser()` **unconditionally**
- `MailService::sendToUser()` → `MailService::send()` → `SendMailJob` — không có bước check preference
- **Đã có sẵn**:
  - `NotificationPreference` model (`user_id, type, channel, enabled`)
  - API routes: `GET|PUT /api/settings/notifications`
  - `User::notificationPreferences()` relationship
- **Chưa có**:
  - Không có seeder mặc định cho notification preferences
  - Frontend settings page (`/settings`) chưa có tab "Notifications"
  - `HandleJobCompletion` và `HandleJobFailure` không gọi check

---

## Technical Design

### Data Flow (sau fix)
```
Daemon webhook → HandleJobCompletion::handle()
  ├── Xác định mediumLabel ("Video" / "Hình ảnh")
  ├── Check user notification preference (type=job_completed, channel=email)
  ├── Nếu enabled → MailService::sendToUser('job_completed', user, data + medium_label)
  │     └── EmailTemplate::render() thay {{medium_label}} trong subject + body
  └── Nếu disabled → skip
```

### API Contracts
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/settings/notifications` | Lấy danh sách notification preferences | Đã có |
| PUT | `/api/settings/notifications` | Cập nhật notification preferences | Đã có |

### Database Changes

#### NotificationPreference (đã có table)
- Seeder mới: `NotificationPreferenceSeeder` tạo defaults khi user đăng ký hoặc migrate
- Default: `type=job_completed, channel=email, enabled=true`

#### EmailTemplate (đã có)
| Template Key | Subject mới | Body thay đổi |
|---|---|---|
| `job_completed` | `{{medium_label}} của bạn đã sẵn sàng - {{job_name}}` | Thay "Video" → `{{medium_label}}`, "Xem video" → `{{action_label}}` |

### Frontend Components
| Component | Purpose | Status |
|-----------|---------|--------|
| `settings/page.tsx` | Thêm tab "Notifications" | Cần thêm |
| `NotificationsTab` component mới | Toggle switches cho job_completed, job_failed (email) | Cần tạo |
| `client.ts` | Đã có `notificationPreferences()`, `updateNotificationPreferences()` | Đã có |

---

## Edge Cases
- **User không có NotificationPreference record**: Coi như enabled (default là gửi mail) — tương thích ngược
- **User có record nhưng `enabled=false`**: Skip gửi mail
- **job_failed template**: Cũng cần check preference tương tự (`type=job_failed`)
- **Admin thay đổi subject EmailTemplate**: Nếu admin xóa `{{medium_label}}` khỏi subject → fallback về text cứng
- **Template `job_completed` không có placeholder `medium_label`**: EmailTemplateSeeder dùng `updateOrCreate` nên không tự update — cần migration hoặc re-seed

## Risks & Trade-offs
| Risk | Mitigation |
|------|------------|
| `updateOrCreate` trong seeder không update template đã tồn tại | Dùng migration để update subject/body hoặc chạy seeder với force |
| Frontend settings page chưa có tab notification | Cần thêm tab + component mới — công việc thuộc @web agent |
| Nhiều template key cần check (image_completed, video_completed...) | Chỉ dùng 1 template `job_completed` + dynamic `medium_label` — đơn giản hơn |

---

## Implementation Tasks

| # | Layer | Task | Files | Est. |
|---|-------|------|-------|------|
| 1 | Backend | Update `HandleJobCompletion` — pass `medium_label`, `action_label` to mail data + check NotificationPreference | `app/Jobs/HandleJobCompletion.php` | 15m |
| 2 | Backend | Update `HandleJobFailure` — check NotificationPreference before sending | `app/Jobs/HandleJobFailure.php` | 10m |
| 3 | Backend | Update `job_completed.blade.php` — replace hardcoded text with `{{medium_label}}` / `{{action_label}}` | `resources/views/emails/job_completed.blade.php` | 10m |
| 4 | Backend | Update EmailTemplateSeeder — change subject + add placeholders | `database/seeders/EmailTemplateSeeder.php` | 5m |
| 5 | Backend | Create migration: update existing `job_completed` EmailTemplate subject/body in DB | `database/migrations/` | 10m |
| 6 | Backend | Add `NotificationPreferenceSeeder` — defaults for new users | `database/seeders/NotificationPreferenceSeeder.php` | 10m |
| 7 | Backend | Run tests, verify | `backend/` | 15m |
| 8 | Web | Add "Notifications" tab to settings page | `apps/web/src/app/(dashboard)/settings/page.tsx` | 30m |
| 9 | Web | Create NotificationsTab component with toggle switches | `apps/web/src/app/(dashboard)/settings/page.tsx` (hoặc component riêng) | 30m |
| 10 | Web | Verify API integration, typecheck | `apps/web/` | 10m |

### Total Estimate
- **Backend**: ~1h 15m
- **Web**: ~1h 10m
- **Total**: ~2h 25m

---

## Files Changed (dự kiến)

### Backend
| File | Change |
|------|--------|
| `backend/app/Jobs/HandleJobCompletion.php` | Pass `medium_label`, `action_label`; check `NotificationPreference` |
| `backend/app/Jobs/HandleJobFailure.php` | Check `NotificationPreference` trước khi gửi mail |
| `backend/resources/views/emails/job_completed.blade.php` | Thay text cứng → `{{medium_label}}` / `{{action_label}}` |
| `backend/database/seeders/EmailTemplateSeeder.php` | Cập nhật subject `job_completed` |
| `backend/database/migrations/xxxx_xx_xx_update_job_completed_template.php` | Update subject/body trong DB |
| `backend/database/seeders/NotificationPreferenceSeeder.php` | **NEW** — seed defaults |

### Web
| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Thêm tab "Notifications" + `NotificationsTab` component |
