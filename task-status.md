# Task Status — AI Video Platform

> Last updated: 2026-07-20

---

## ✅ Recently Completed

### Multi-agent bug sweep ĐỢT 3 — ~37 lỗi fixed (2026-07-21) — ✅ Done, branch `fix/bug-sweep-round3`
- **Cách làm**: 5 agent phân tích (Filament admin · email/notifications · web notifications/onboarding · landing/SEO/legal · moderation/ratelimit) → 5 agent fix → final sweep.
- **Verify**: web tsc 0 · **backend full suite 602 passed** (2 fail: SocialiteTest = **pre-existing**, cũng fail trên main; CommunityFeatureTest query-count = regression whitelist-cache của tôi → đã fix bằng warmup request).
- **HIGH**: notifications list click 404 (`id`→`uuid`) · **Carbon 3 sign bug** (reset/verify code & subscription grace **không bao giờ expire**) · ManualCreditNotification channel `database` crash → mail-only · SEO canonical trỏ hết homepage · legal pages placeholder đang index → noindex + gỡ sitemap (chờ data thật).
- **MED**: Filament badge màu (`->colors()` ngược) · bulk block-IP hỏng · `/ai/enhance-prompt` + `ttsPreview` thiếu moderation · leak lỗi daemon host/port · email link APP_URL→FRONTEND_URL · topbar unread badge stale → shared store · SendNotificationJob dup email (chunk) · nav "Âm thanh" dead.
- **LOW**: Filament nav badge "0" · cho phép trừ credits (số âm) · ErrorSanitizer regex over-match ("500 credits") + case-insensitive · whitelist cache 5′ · footer hover · CTA login-aware · body notif sanitize · dead code (10 component + NotificationBell) · forgotPassword soft-deleted · SendMailJob retry/backoff.
- **⚠️ Cần owner quyết**: (1) trang pháp lý — cấp email/SĐT/MST/tên cty/ngày hiệu lực thật để bật lại index; (2) **welcome credits**: Google/email signup hiện tạo user 0 credits, welcome chỉ đến khi có coupon `is_welcome`/signup-event trong DB — SocialiteTest kỳ vọng 100 vô điều kiện (test cũ pre-Events). Cần xác nhận: welcome mặc định 100, hay chỉ khi admin cấu hình campaign?
- **Worklogs**: `backend/worklogs/2026-07-21-{filament-resource,carbon-expiry-notification-mail,ai-proxy-sanitizer-throttle}-*.md`, `apps/web/worklogs/2026-07-21-{notifications,legal-seo-nav-footer}-*.md`.

### Multi-agent bug sweep ĐỢT 2 — ~36 lỗi fixed (2026-07-21) — ✅ Done, branch `fix/bug-sweep-2026-07-21`
- **Cách làm**: 5 agent phân tích sâu (auth/settings · image/audio studio · realtime/Reverb · payments · daemon lifecycle) → 6 agent fix song song → final sweep.
- **Verify**: web tsc 0 · daemon tsc 0 · migration UNIQUE reference_code (0 dup) · daemon healthy + cột `webhook_delivered` · **backend test 298 passed / 1150 assertions**.
- **HIGH**: private-channel auth bypass (`channels.php` trả mảng luôn truthy) · đổi/reset mật khẩu hỏng 100% (sai field/không gửi code) · **SePay double-credit race** (thêm UNIQUE + lockForUpdate) · JobProgress không broadcast (đã wire) · daemon cancel race (double webhook).
- **MED**: hardcoded creds thật trong login · double-refund race (lockForUpdate) · Echo giữ JWT cũ (header getter + resetEcho) · giá sai user premium (effect deps) · audio voice guard · MAX_IMAGES · 2 blob leak · liveTasks leak · boot webhook replay 24h · ffmpeg merge timeout.
- **LOW**: tolerance 5%→1% · MAX_PENDING atomic · log env · listener credits/cancelled · VoiceSelector · qwen/openai provider · settings toggle · OAuth token cleanup…
- **Worklogs**: `backend/worklogs/2026-07-21-{channel-auth-and-jobprogress-realtime,sepay-credit-money-path-race-fixes}.md`, `apps/web/worklogs/2026-07-21-{auth-settings,realtime-stale-jwt,studio}-*.md`, `apps/daemon/worklogs/2026-07-21-media-engine-bugfixes.md`.
- **Ghi chú**: audio studio chưa có price-preview (để TODO, product decision); `jobs`/`projects[id]` pages có thể thêm `onCancelled` (plumbing sẵn).

### Multi-agent bug sweep — 34 lỗi vặt fixed (2026-07-21) — ✅ Done, branch `fix/bug-sweep-2026-07-21`
- **Cách làm**: 5 agent phân tích (read-only) → manager tổng hợp 34 findings → user duyệt "fix tất cả" → 6 agent fix song song theo cụm → final sweep.
- **Kết quả verify**: web `tsc` 0 lỗi · daemon `tsc` 0 lỗi · backend test 51+33+59+28 passed · webhook endpoint trả 2xx/5xx/4xx khớp logic retry mới của daemon.
- **Nổi bật**: Like gọi API 2-3 lần (race) · route `/credits` 404 → `/billing` · daemon `safeJoin` path-traversal · webhook coi 4xx=đã-gửi (nuốt lỗi HMAC) · R2V nhãn "First frame" sai (→ "Last frame") · voice reindex mất voice · `window.LARAVEL_URL` undefined (prod showcase trắng) · coupon race 500+orphan · top-level `narration` lách gate premium · auto-compile rò credit.
- **Worklogs**: `apps/web/worklogs/2026-07-21-{studio-video,nav-billing-authstore,dashboard-page,community-like-and-modal}-*.md`, `apps/daemon/worklogs/2026-07-21-media-daemon-bugfixes.md`, `backend/worklogs/2026-07-21-controller-bugfixes-coupon-storyboard.md`.
- Cũng trong ngày: remix routing (query bị redirect nuốt), ẩn credits trên project đã tạo (card + flow), `productionBrowserSourceMaps:false`, resource limit 4 stack Docker + bake ffmpeg vào daemon dev image.

---

## Current Sprint

### Events (chiến dịch) + mã coupon duy nhất theo user + sinh nhật auto — ✅ Done + E2E (2026-07-20)
- **Status**: ✅ Code + migrate (giữ data cũ) + test 32/32 + E2E thật. **Chưa commit.**
- **Worklogs**: `backend/worklogs/2026-07-20-events-unique-coupons.md`, `apps/web/worklogs/2026-07-20-events-ui.md`
- **Mô hình**: admin tạo **Event** (deadline `ends_at`, giới hạn `max_claims`/`per_user_uses`, thưởng credits
  hoặc mã giảm giá). User bấm "Nhận mã" → hệ thống **mint 1 mã DUY NHẤT gắn `user_id`** → leak vô dụng (chốt
  ownership trong `assertRedeemable`: "Mã này không thuộc về bạn"). Mã minted vẫn chỉ là 1 dòng `coupons` →
  redeem qua `CouponService::redeemForCredits`/discount sẵn có, không sửa.
- **DB**: bảng `coupon_events`; cột `coupons.{coupon_event_id,user_id}` (additive, nullable FK).
- **`trigger` enum** (thay cờ auto_grant): `manual` (bấm nhận, hiện ở `/events`) · `signup` (tự tặng khi
  verify email/Google — welcome hợp nhất, fallback `issueWelcome`) · `birthday` (tự tặng đúng ngày sinh,
  **mỗi năm 1 lần**). signup/birthday ẩn khỏi `/events`.
- **Command** `events:grant-birthday` (scheduler `dailyAt('07:00')` — prod đã có service `scheduler`): quét
  user sinh nhật hôm nay (active+verified) → mint + cộng credits; idempotent theo năm (`whereYear`).
- **API**: `GET /events` + `POST /events/{slug}/claim` (throttle). **Web**: trang `/events` (sidebar "Ưu đãi"),
  claim → render mã + Copy + link đổi ở `/billing` (tái dùng `CouponRedeemCard`).
- **Admin**: `CouponEventResource` (Billing & Credits) + filter `coupon_event_id` ở `CouponsTable` xem mã minted.
- **Verify**: 3 migration DONE (chao-mung→trigger=signup, không mất data); `CouponEventServiceTest|CouponServiceTest|RegistrationAbuseTest` = **32 passed / 90 assertions**; E2E: claim mint mã unique, ownership block, +credits, max_claims, deadline, birthday grant + idempotent năm.

### Coupons system + gỡ tặng-credits-khi-đăng-ký/xác-thực — ✅ Done, committed 500ecaa5
- **Status**: ✅ Code + migrate + test + live redeem (2026-07-19). **Đã commit + push** (500ecaa5). Mở rộng bởi Events ở trên.
- **Worklog**: `backend/worklogs/2026-07-19-coupons-system-and-remove-signup-credit-gift.md`
- **Gỡ**: tặng credits cứng ở `verifyEmail` + Google login → mọi user start 0. Copy "nhận credits khi xác thực" đã gỡ.
- **Coupons**: bảng `coupons` + `coupon_redemptions`; `CouponService` (redeem atomic, welcome auto, discount preview/reserve/complete/void); API `/coupons/redeem` + `/coupons/validate`; admin `CouponResource` (Billing & Credits); UI ô đổi mã (billing) + ô mã giảm giá (gói nạp). 3 loại: tặng credits / giảm % / giảm cố định.
- **Welcome**: nay hợp nhất vào Event `trigger=signup` (fallback về coupon `is_welcome` cũ nếu chưa có event).
- **Verify**: migrate 4 DONE; `CouponServiceTest`+`RegistrationAbuseTest` = 20/20 (lúc commit); live redeem +100 rồi chặn lần 2.

### Web containerization (Next.js vào Docker) + fix Tailwind source() — ✅ Done + verified (2026-07-20)
- **Status**: ✅ Container `aivideo-web-1` up, route `/`,`/login`,`/dashboard` = 200. **Chưa commit.**
- **Worklog**: `apps/web/worklogs/2026-07-20-web-dockerize.md`
- **Đổi**: web từ host-process → service Docker (`apps/web/Dockerfile.dev`, `.dockerignore`; service `web` +
  volume `web_node_modules`/`web_next` trong `backend/docker-compose.dev.yml`; `scripts/dev.sh` quản web qua docker).
  Port `${WEB_PORT:-3000}` (không trùng truyenvietnam 3100).
- **Fix bug 500 landing**: `@import "tailwindcss" source("../")` — giới hạn Tailwind v4 scan về `src/` (trước
  scan cả `worklogs/*.md` chứa literal `bg-[url(...)]` → sinh class hỏng → Turbopack 500).

### 🚀 GO-LIVE TODO — Bật bảo mật coupon 4-lớp + web-in-Docker prod (đang FAIL-OPEN ở dev)
- **Checklist**: `docs/plans/active/security/coupon-security-golive.md` ← agent chuẩn bị live ĐỌC + đề xuất chạy.
- Tóm tắt: set `APP_BFF_SECRET` (trùng Laravel + container web), `TURNSTILE_SECRET` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `COUPON_MIN_ACCOUNT_AGE_MINUTES=15`, `COUPON_PER_IP_DAILY_CAP=20`. Prod web-Docker cần thêm service `web` +
  `LARAVEL_INTERNAL_URL`. Birthday: tạo Event `trigger=birthday` (scheduler prod tự chạy `events:grant-birthday`).
  Dev để trống hết = fail-open, không gãy.


### Phase 2 & 3 — Restore studio: multi-variant + negative/seed + before→after reveal video — ✅ Done + E2E
- **Status**: ✅ Code + static + **E2E thật** (2026-07-19). Docker khôi phục, stack healthy.
- **Agent**: @web + @daemon + @backend
- **Worklog**: `apps/web/worklogs/2026-07-19-phase2-3-restore-quality-and-reveal-video.md`
- **Phase 2**: multi-variant (1/2/4 ảnh, chọn ảnh ưng nhất) + nâng cao negative_prompt + seed (khoá/ngẫu
  nhiên). Fix gap: nhánh Qwen-Image `qwencloud.ts` trước bỏ seed/negative → nay gửi trong `parameters`
  (guarded). `strength` KHÔNG khả dụng trên endpoint qwen-image-edit → không thêm (verified docs).
- **Phase 3**: nút "Tạo video biến hình" — FLF i2v (ảnh gốc=first, ảnh phục chế=last), dùng model i2v
  của plan (wan2.7-i2v). Tái dùng project + file, không upload lại.
- **E2E**: generate i2i thật với seed+negative → `done`, PNG 3MB, `providerError:null`. Backend 19/19 pass,
  model sync PASS. (Chưa chạy render video reveal thật — tốn credit; contract đã đúng.)
- **Đang chạy song song**: agent @web viết lại copy trang chủ chuyên nghiệp hơn + tối ưu typography
  (theo phản hồi owner: "Hồi Sinh Mọi Khung Hình" + nút "Phục chế" nghe kỳ).

### Trang studio "Phục chế" riêng → ❌ ĐÃ GỠ BỎ (theo yêu cầu owner 2026-07-19)
- **Lý do owner**: logic phục chế đã chạy qua **bộ công cụ i2i có sẵn** (studio Image Editing + 6 skill
  phục chế). Thêm 1 trang riêng chỉ làm rối.
- **Đã xoá**: `apps/web/src/app/(dashboard)/studio/restore/page.tsx`,
  `apps/web/src/components/studio/before-after-slider.tsx`, `apps/web/src/lib/launch-flags.ts`.
  Revert sạch nav item + flag + redirect ở `sidebar.tsx`, `navigation.ts`, `studio/layout.tsx`,
  `login/page.tsx`, `auth/callback/page.tsx`, `dashboard/page.tsx` (app về đúng nguyên trạng, theme giữ).
- **GIỮ LẠI (cải thiện cho bộ có sẵn, không phải "trang riêng")**:
  - 6 skill phục chế `apps/skills/image-direction/*` — dùng qua studio Image Editing.
  - **Fix bug provider** `apps/daemon/src/media/providers/qwencloud.ts`: nhánh Qwen-Image trước **bỏ**
    `negative_prompt` + `seed` → nay gửi đúng. Lợi cho **Image Editing hiện có** (negative prompt giờ mới
    thực sự tác dụng với qwen-image). Đã E2E render thật = pass.
  - Validation `seed` (backend) + field `seed` (web client) — plumbing chung, vô hại.
- **Note**: có thể gỡ nốt seed plumbing nếu muốn pristine; qwencloud fix nên giữ (vá bug thật).

### Phase 4 — Thu gọn nav + reframe landing → ❌ ĐÃ HOÀN TÁC (theo yêu cầu owner 2026-07-19)
- **Status**: ❌ Reverted. Owner làm rõ ý ban đầu: **giữ nguyên hệ thống/layout cũ**, KHÔNG ẩn tính năng
  và KHÔNG nhét chữ "phục chế" khắp landing; chỉ **ưu tiên hoàn thiện năng lực phục chế (skills, studio,
  flows)**.
- **Đã hoàn tác**: `RESTORE_ONLY_LAUNCH = false` (hiện lại toàn bộ nav, login → /dashboard như cũ, guard
  studio/layout inert). Landing `git checkout` về nguyên bản (bỏ hết copy phục chế; giữ thiết kế gốc).
  Dashboard hero + SEO `layout.tsx` + OG image trả về copy video gốc.
- **Giữ lại (đúng ý owner)**: 6 skill phục chế (Phase 0), studio `/studio/restore` (Phase 1/2/3: icon
  chuyên nghiệp, multi-variant, negative/seed, video biến hình), fix provider qwencloud + validation seed.
  Truy cập qua 1 mục "Phục chế" đầu sidebar (nav item giữ, không ẩn gì khác). Theme sáng app giữ nguyên.
- **Lưu ý**: máy móc flag (launch-flags.ts + import inert ở sidebar/navigation/login/callback/studio-layout)
  để lại ở trạng thái false — vô hại, đảo được; có thể gỡ hẳn nếu muốn sạch.

### AI Phục chế pivot — studio verified working + UX/theme polish (multi-agent) — In Progress
- **Status**: 🔄 In Progress (2026-07-19)
- **Done & code-verified (tsc 0)**:
  - **Restore studio works E2E**: after fixing the DashScope key (owner supplied a valid one →
    `qwen-image-edit-plus` i2i = 200 OK), the full flow renders a real restored image + before/after
    slider. Quality validated on a matching source (fjord → nature-enhance = structure preserved).
  - **Storyboard result layout** (@web agent): fixed the toolbar-clips-video bug (flex-centering
    overflow, not z-index) → outer-scroll + `m-auto`; premium redesign (viewport-capped hero,
    multi-panel side-by-side); fixed "Xem sơ đồ" blank canvas for scene-less modes (`hasScenes` gate).
  - **Lighten theme** (@web agent): "elevated brighter-dark" palette (base `#16141a` vs `#09090b`,
    surface scale, brighter borders/text) swept across ~106 web files. Landing + dashboard brighter.
  - **Voiceover audit + disable**: feature was broken (placeholder TTS key → 401; false `available`).
    Hidden behind `VOICEOVER_ENABLED=false` (backend intact for re-enable). Out of scope for the pivot.
- **Blocked/pending**: host Docker daemon wedged mid-session → restarted Docker Desktop; recovering.
  **Visual verification** of all the above (screenshots) pending backend recovery.
- **Worklogs**: `apps/web/worklogs/2026-07-19-{restore-vertical-phase0-1,storyboard-result-layout,lighten-theme,disable-voiceover-button}.md`.



### Product pivot → "AI Phục chế" vertical (nhà · cảnh quan · thiên nhiên) — In Progress
- **Status**: 🔄 In Progress (2026-07-19) — Phase 0 ✅, Phase 1 ⚠️ (blocked on i2i provider 400)
- **Agent**: @web + @daemon
- **Worklog**: `apps/web/worklogs/2026-07-19-restore-vertical-phase0-1.md`
- **Phase 0 ✅**: 6 restoration image skills live (`apps/skills/image-direction/{phuc-che-nha-co,
  cai-tao-ngoai-that,tan-trang-noi-that,thiet-ke-san-vuon,nang-cap-thien-nhien,phuc-hoi-anh-cu}`),
  tuned for structure preservation; daemon loaded 34 image-directions.
- **Phase 1 ✅ (works end-to-end)**: `/studio/restore` + `before-after-slider.tsx`; i2i renders a
  real restored image → before/after slider. Root cause of the earlier failure was a bad
  `DASHSCOPE_API_KEY` in `apps/daemon/.env` (401/403); owner supplied a working key, updated + daemon
  recreated → `qwen-image-edit-plus` i2i = 200 OK. Hardening kept: `media.ts` `logger.error`s raw
  provider errors. Separate dev-env issue remains: daemon→backend webhook DNS `ENOTFOUND app`.
- **Next**: Phase 4 ✅ (nav thu gọn + reframe copy nhận diện — code complete). Còn Phase 2 (quality:
  multi-variant + negative/seed + fidelity), Phase 3 (video reveal before→after).
- **Plan**: `/Users/nhut/.claude/plans/` (Phase 0–4 pivot plan).



### Follow-up: pending_review UI + demo seeder + premium result restyle — Complete
- **Status**: ✅ Completed (2026-07-19) — Part 1 ✅, Part 2 ✅, Part 3 ✅ (core)
- **Agent**: @web + @backend
- **Worklogs**: `apps/web/worklogs/2026-07-19-publish-pending-review-ui.md`,
  `backend/worklogs/2026-07-19-demo-activity-seeder.md`.
- **Part 1 (web, ✅)**: publish response `pending_review` + `moderation_status` wired to UI —
  info toast "đang chờ kiểm duyệt" + amber "Chờ duyệt" badge on Jobs. tsc 0.
- **Part 2 (backend, ✅)**: `DemoActivitySeeder` — 100 demo users + full simulated activity with
  real-looking fake media (picsum stills + ffmpeg H.264 clips, local-served). Seeded: 450 jobs
  (284 public, 19 pending_review), 117 storyboards, 456 assets, 3881 likes, 187 comments, 312 follows.
  Target `minhnhut147nb@gmail.com` = **legend** (rep 14313, 82 followers). Run:
  `docker exec aivideo-app-1 php artisan db:seed --class=DemoActivitySeeder`.
- **Part 3 (web, ✅)**: premium restyle — shared `<MediaViewer>` + `useAuthenticatedMedia` hook
  (fixes runtime aspect-ratio bug), storyboard **inline player** (was download-only), real
  storyboard thumbnails on Projects grid, Assets media rendering. Worklog:
  `apps/web/worklogs/2026-07-19-premium-result-restyle.md`. Visually verified via Playwright
  (community/projects/storyboard/assets) logged in as target user.
- **Bonus backend fix**: `AssetController::download()` 500 on local files (missing
  `BinaryFileResponse` in return type) — broke all local-served media. Fixed + suite 570 green.
  Worklog: `backend/worklogs/2026-07-19-assetcontroller-local-file-return-type.md`.
- **Part 3 ext (web, ✅)**: consolidated media viewers onto `<MediaViewer>`, **Jobs page inline
  previews** (+ fixed `isDone` so Laravel `completed` jobs label/publish/preview correctly),
  task-card aspect-ratio bug, brand `--color-brand` token sweep on result surfaces. tsc 0; visually
  verified (Jobs previews + community colors). Worklog:
  `apps/web/worklogs/2026-07-19-result-polish-mediaviewer-consolidation.md`.
- **Multi-Panel gallery (web+backend, ✅)**: new `GET /api/storyboards/{uuid}/multi-panel` (inline,
  owner-gated) + result-hero "Bảng phân cảnh" section for `storyboard_image`. Storyboard tests 122
  green; visually verified. Worklog: `backend/worklogs/2026-07-19-multi-panel-gallery.md`.

### Improvement plan — unit-economics + go-live + hardening (A1/C2/C1/B3) — Complete
- **Status**: Completed (2026-07-19)
- **Agent**: @backend + @daemon
- **Worklogs**: `backend/worklogs/2026-07-19-economics-billing-hmac-fixes.md`,
  `backend/worklogs/2026-07-19-moderation-degraded-review-queue.md`,
  `apps/daemon/worklogs/2026-07-19-hmac-timestamped-signature.md`.
- **Shipped** (from the approved analysis plan; owner uses SePay → payment untouched):
  - **A1** — Studio image models $0.075 → `qwen-image-2.0`/`qwen-image-edit-plus` ($0.035/$0.03):
    flat-fee image margin ~6,25% → ~56–62% (`PlanSeeder.php`). Re-seeded to dev DB.
  - **C2** — removed `gpu_seconds ?? files['size']` fallback in all 3 webhook handlers
    (`DaemonWebhookController`) — was polluting the telemetry column with output byte size
    (analytics-only field, NOT billing).
  - **C1** — Laravel→daemon signature is now timestamped (replay-resistant):
    `HMAC("laravel-app.{ts}")` + `X-Timestamp` (`DaemonClient`), verified in `auth.ts` within a
    300s window; legacy constant scheme kept for rollout, disable via `DAEMON_STRICT_SIGNATURE=1`.
  - **B3** — degraded image-moderation verdict no longer silently publishes public: new
    `render_jobs.moderation_status` (migration) → held as `pending_review`, hidden from feed
    (`scopePublished`), creator payout deferred; new `ModerationQueueResource` (Filament) with
    approve/reject. `CommunityController::publish()` reads `$verdict['degraded']`.
- **Verified**: backend full suite **570 passed / 1 skipped / 0 failed**; daemon **309 passed / 4
  skipped** (+6 auth tests); `verify-media-models.mjs` PASS; migration + A1 confirmed in dev DB.
- **Open (owner)**: A2 real xah.io cost (multi-panel `cost_hint` TBD), A3 video_editing margin ~22%,
  A4 Studio pricing, B1 grant super_admin, B2 real provider keys (`CKEY`/`CLOUDFLARE`/`WEBHOOK_SECRET`),
  B4 deploy. **@web**: publish response adds `pending_review` + `data.moderation_status`.

### Image moderation fix — was a silent no-op (NSFW never blocked) — Complete
- **Status**: Completed (2026-07-18)
- **Agent**: @daemon
- **Worklog**: `apps/daemon/worklogs/2026-07-18-image-moderation-fix.md`
- **Shipped**: `POST /api/media/moderate-image` was effectively disabled — default vision model
  `claude-haiku-4.5` on xah.io is proxied to a coding assistant ("Kiro") that refuses image
  analysis with prose → `extractJsonFromLlm` fails → fail-open `safe:true` on every image.
  Switched default to live-verified vision model `openai/gpt-5.6-luna`; added
  `response_format:json_object`, a hardened anti-refusal/anti-prose prompt, and a primary→fallback
  model chain (`IMAGE_MODERATION_FALLBACK_MODELS`) that only fails open AFTER all models fail, now
  logging at ERROR with `modelsTried` so degraded verdicts are visible.
- **Verified**: tsc 0; daemon tests **295 passed / 4 skipped** (baseline 291, +4). Live probe:
  haiku refuses (prose "Kiro"); gpt-5.6-luna genuinely sees images + returns JSON (safe & safe:false
  paths). E2E through real handler → real verdict `{safe:true,…,model:"openai/gpt-5.6-luna"}`.
- **Handoff @backend**: on `degraded:true` route asset to "chờ duyệt" (manual review) instead of
  trusting safe. Response shape unchanged. Prod env: `IMAGE_MODERATION_MODEL=openai/gpt-5.6-luna`;
  never `claude-haiku-4.5` (no vision on this endpoint).

### Landing (/) SEO / GEO / content polish — Complete
- **Status**: Completed (2026-07-18)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-07-18-landing-seo-geo-content.md`
- **Shipped**: Fixed duplicate `<h1>` (wired dead `hideText` on hero/reel/intro + demoted
  preloader h1) → exactly 1 h1. JSON-LD nâng lên `@graph` (Organization + WebSite +
  SoftwareApplication, `@id`-linked, truthful featureList, no fabricated sameAs/rating).
  New server-rendered FAQ section (`#faq`, `<details>`) + FAQPage schema (GEO). New
  generated OG image `app/opengraph-image.tsx` (PNG 1200×630, replaces 404 `/og-image.svg`)
  + `twitter-image.tsx`. Meta description ≤160 + VN keywords, OG/Twitter fallback to
  generated PNG (backend `og_image` still wins). `public/llms.txt` for AI crawlers.
  robots/sitemap cleaned (auth routes disallowed + dropped from sitemap; legal pages added).
  Backend seo/landing settings NOT overridden.
- **Verified**: tsc 0; web tests **56/56** (≥ baseline 51). Live :3100 — 1 h1 / 11 h2 / 17 h3;
  2 JSON-LD blocks parse (@graph + FAQPage); og/twitter image HTTP 200 image/png 1200×630
  (VN diacritics correct); robots/sitemap/llms.txt 200.
- **Needs owner**: real social links (`sameAs`), legalName, real Twitter handle; verify stats
  numbers (not in schema).

### Landing (/) scroll-snap jerk fix + hero mobile hardening — Complete
- **Status**: Completed (2026-07-18)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-07-18-landing-scroll-snap-jerk-fix.md`
- **Shipped**: Fixed "cuộn bị giật lên/xuống rồi mới chuyển section" on the full-page snap.
  Root cause: `ScrollSnapController.handleWheel` let sub-threshold wheel ticks leak to native
  scroll (no `preventDefault`) → page drifted then the GSAP tween yanked it back (worst on
  trackpads). Now commits-then-blocks: `preventDefault` on all wheel events once a snap is
  committed, native scroll kept only for tall-section pass-through + top/bottom boundaries
  (footer reachable). Added `prefers-reduced-motion` gate. Hero 2nd title line wraps on
  mobile (`text-balance lg:whitespace-nowrap` + breakable typewriter spans).
- **Verified**: tsc 0; web tests 51/51 (baseline held). Live Playwright 1440/768/375 — 5
  desktop transitions monotonic 1-section each (`maxReversalPx:0`); trackpad-burst sim (18×
  deltaY 9) = 1 section, no drift; `overflowX:0` all breakpoints; mobile native scroll intact.

### Skill-author AUTO-VERIFY: sample render + vision style-match — Complete
- **Status**: Completed (2026-07-18)
- **Agent**: @daemon
- **Worklog**: `apps/daemon/worklogs/2026-07-18-skill-author-auto-verify.md`.
- **Shipped**:
  - `POST /api/media/skills/author` now closes the "does this skill produce the intended
    style?" loop automatically: after the LLM authors a skill it renders ONE sample image
    with the skill's own `prompt_template` and asks the moderation vision model for a
    style-match verdict, returned as a NEW optional `sample: { imageUrl, model, styleMatch:{
    match, score, notes } }` field (or `{ degraded, error }`). **Fail-open** — never blocks
    the draft. `skill` contract unchanged.
  - Structural example the AI copies is now `exampleId` (backend override) → `featured:true`
    → `samples[0]`, so drafts inherit a QUALITY skill's shape.
  - Config: `SKILL_AUTHOR_AUTOVERIFY_ENABLED` (default on when an image key exists),
    `SKILL_AUTHOR_VERIFY_MODEL` (override the sample image model).
- **Verified**: daemon suite **291 passed / 4 skipped / 0 failed** (279 baseline + 12 new);
  tsc 0. Real E2E on the live container (real keys): authored `neon-cyberpunk-rain`, sample
  via `qwen-image-max`, real vision verdict `match:true score:0.95`.
- **Backend handoff**: read/persist the optional `sample` (image + verdict) for admin review;
  treat as optional/degraded-tolerant. May pass `exampleId`. To use real sample gen on this
  deployment, set `SKILL_AUTHOR_VERIFY_MODEL` to a qwencloud model (registry default
  `gpt-image-2`/ckey key is invalid here) — a config decision, not code.

### Skill authoring hardening: required-key validation + video-marketing-psychology category — Complete
- **Status**: Completed (2026-07-18)
- **Agent**: @backend
- **Worklog**: `backend/worklogs/2026-07-18-skill-authoring-hardening.md`.
- **Shipped**:
  - `SkillService::save()` now enforces per-category **REQUIRED_KEYS** after YAML parse —
    AI drafts AND manual admin edits missing core keys (`prompt_template`, `style_keywords`,
    `default_negative`, …) are rejected with a clear VN message listing the missing keys, no
    broken file written. Keyed by `collectionFor()` so `video-storyboard/types/*` uses its
    own ruleset.
  - `video-marketing-psychology` registered in `DAEMON_CATEGORIES` as `single` → classifies
    correctly instead of `unloaded`.
- **Verified**: backend full suite **517 passed / 1 skipped / 0 failed** (511 baseline + 6 new).
- **Daemon handoff**: vocab constraint for storyboard-type `*_hints` (Task 3) is a daemon-only
  change in `media.ts` (~L304); backend already passes the correct `category`. Daemon also owns
  the `video-marketing-psychology` `single` loader.

### Image path launch-hardening: feed preview derivative + edit-guard — Complete
- **Status**: Completed (2026-07-17)
- **Agent**: @backend
- **Worklog**: `backend/worklogs/2026-07-17-image-preview-derivative-and-edit-guard.md`.
- **Shipped**:
  - **IMG#1** — image jobs now get a web-optimized WebP preview (ffmpeg, ≤1280px, q80) on
    completion; `render_job.thumbnail_path` points at it so the community feed serves the
    small file instead of the raw 6-9MB PNG (original kept for download). Config:
    `assets.image_preview.*`. Frontend card already reads `thumbnail_path` (no web change).
  - **IMG#2** — `DaemonProxyController` now blocks image edit/i2i/inpaint routed into a
    t2i-only model (e.g. Wan2.7_Image) with `422 image_edit_unavailable` (VN message) BEFORE
    job create / credit reserve, instead of a downstream provider 404.
- **Verified**: backend full suite **465 passed / 1 skipped / 0 failed** (461 baseline + 4 new).

### Launch guards: content moderation + daily render cap + secret validation — Complete
- **Status**: Completed (2026-07-17)
- **Agent**: @backend
- **Worklog**: `backend/worklogs/2026-07-17-launch-guards-moderation-quota-secrets.md`.
- **Shipped**:
  - **WS3.2 moderation** — `ContentFilterService::containsProhibitedContent()` (curated
    NSFW/deepfake/gore/illegal list) now gates video prompts (RenderJob store, Storyboard
    store/update) → 422 `unsafe_content`, and community `publish()` (title/prompt/tags) →
    422. Negative prompts intentionally not moderated. Comment filter unchanged.
  - **WS1.3 daily render cap** — new `RenderQuotaService` + `Plan.max_renders_per_day`
    (migration + seeder: free 15, pro 100, studio unlimited). Enforced in RenderJob store &
    Storyboard render (first render only) → 429 `daily_render_limit`. Retries excluded.
  - **WS2.3 secret guard** — `App\Support\SecretGuard` aborts **production** boot on empty/
    placeholder JWT_SECRET or DAEMON_WEBHOOK_SECRET (fail-closed; local/testing unaffected).
- **Verified**: backend full suite **459 passed / 1 skipped / 0 failed** (450 baseline + 9 new).
- **Open gaps (owner)**: no admin/Filament UI to review reports or force-unpublish reported
  assets (ReportController only records); prohibited-word list is a starter set. See worklog.

### Disable "Ghép cảnh" (multi_scene) for launch — Complete
- **Status**: Completed (2026-06-23)
- **Agent**: @backend + @web
- **Worklog**: `backend/worklogs/2026-06-23-disable-multi-scene.md` (canonical, cross-layer).
- **Shipped**: multi_scene render mode gated off for initial launch (focus One-Shot + Multi-Panel).
  Builder toggle shows **"Sắp ra mắt"** (disabled); `?mode=multi` falls back to One-Shot. Backend
  **hard-blocks** store/update/render of multi_scene (422) via `config('storyboard.multi_scene_enabled')`
  / env `STORYBOARD_MULTI_SCENE_ENABLED` + `StoryboardController::guardRenderMode()`. Web mirror:
  `MULTI_SCENE_ENABLED` in `flow/shared/constants.ts`. Render path/service/job left intact.
- **Re-enable**: backend env true **AND** web constant true (see worklog + `config/storyboard.php` comment).
- **Verified**: backend full suite **450 passed / 1 skipped** (+2 block tests); web `tsc` 0, `vitest` 51.

### Storyboard default render mode = One-Shot + toggle reorder — Complete
- **Status**: Completed (2026-06-23)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-06-23-storyboard-default-render-mode.md`.
- **Shipped**: New storyboard projects now default to **One-Shot** (`single_flow`) instead of
  Ghép cảnh (`multi_scene`); mode toggle reordered to **One-Shot → Multi-Panel → Ghép cảnh**.
  Existing storyboards still restore their saved `render_mode` (`use-load-storyboard.ts:96`).
- **Verified**: web `tsc` 0; `vitest` 51 passed (render-mode-provider 18/18, default-assertions updated).

### Maintenance mode toggle (dashboard / landing) — Complete
- **Status**: Completed (2026-06-23)
- **Agent**: @web
- **Worklog**: `apps/web/worklogs/2026-06-23-maintenance-mode-toggle.md`.
- **Shipped**: Two independent runtime env switches — `MAINTENANCE_DASHBOARD` /
  `MAINTENANCE_LANDING` (server-side, `.env`, restart-to-apply, no rebuild). New
  `src/middleware.ts` rewrites gated routes to a polished `/maintenance` page (HTTP 503,
  area-specific VN copy, brand decor). Dashboard = app route prefixes; landing = `/`. Auth +
  `/api` + `/maintenance` stay reachable.
- **Verified**: web `tsc` 0; live (both ON) `/`, `/dashboard`, `/studio/*` → 503, `/login` +
  `/maintenance` → 200; independence (landing-only ON → `/dashboard` passes); both screenshots reviewed.

### Voiceover TTS availability gating — Complete
- **Status**: Completed (2026-06-22)
- **Worklog**: `apps/web/worklogs/2026-06-22-voiceover-availability-gating.md`.
- **Shipped**: `GET /media/voices` now returns `available` (true iff a voice provider has
  credentials). `VoiceSelector` shows an early warning banner + reports usability; `VoiceoverModal`
  disables submit when no TTS is configured — instead of the old "looks fine, fails at generate"
  gap. Voiceover stays a separate post-render flow (button only when `status==='completed'`);
  video generation untouched.
- **Verified**: daemon+web `tsc` 0; daemon 142 passed / web 51 passed; live `/voices`
  `available:true` (ckey key present) + ElevenLabs empty→unusable branch.

### Daemon TTS default-voice regression fix — Complete
- **Status**: Completed (2026-06-22)
- **Worklog**: `apps/daemon/worklogs/2026-06-22-tts-default-voice-fix.md`.
- **Shipped**: Restored default-voice fallback in CKey + ElevenLabs TTS (regression from
  `d5c591d` that made them throw on empty `voice`). Daemon suite back to green (142 passed).

### Studio polish: vocab single-source, searchable pickers, storyboard fixes, admin skill-manager — Complete
- **Status**: Completed (2026-06-22)
- **Worklogs**: `apps/daemon/worklogs/2026-06-21-studio-vocab-single-source.md`,
  `apps/web/worklogs/2026-06-22-storyboard-{panel-half-render-fix,ai-panel-autosave,toolbar-overflow-menu}.md`,
  `backend/worklogs/2026-06-21-skill-manager-search-pagination.md`,
  `backend/worklogs/2026-06-21-storyboard-retry-cap.md`,
  `backend/worklogs/2026-06-22-standardize-user-error-messages.md`.
- **Shipped**:
  - **Single-source studio vocabulary** (`apps/daemon/src/media/studio-vocab.json` + `vocab.ts`)
    consumed by `/skills/author` + new `GET /media/vocab`; web `options.ts` guarded by a
    vocab-sync test. Fixes empty studio dropdowns from non-canonical skill presets.
  - **12 trend skills** (image/video-direction) authored as **draft** (await admin publish).
  - **Searchable pickers** — RichSelect inline search (>7 options), video presets search +
    show-more, admin skill-manager search + accordion + per-group numbered pagination.
  - **Storyboard fixes** — half-render on open (`initial={false}`), AI multi-panel **auto-saves**
    the storyboard before generating (kills the "Vui lòng lưu storyboard trước" deadlock),
    top toolbar decluttered into a "⋯" overflow menu, render-attempt **cap (5)** + sanitized
    failure banner, removed the placeholder "Phân tích" action.
  - **User-safe error messages** — `StoryboardController` routes 5xx through a `systemError()`
    helper (generic VN message + real error logged); English 4xx messages translated to VN.
  - **AI authoring always `draft`** (`SkillAuthoringService` force-prepend), `AiPromptCompiler`
    now uses admin AI config via `LlmConfigResolver` (fixes "Failed to compile prompt").
- **Commits**: apps `b3e0d14`, `bc36d13`, `8551cdb`; backend `70b0abb`, `cbeb5a1`.
  Synced to monorepo branch (NOT promoted to `main`).
- **Config gate**: image/video generation needs a real `DASHSCOPE_API_KEY` (intl) in
  `apps/daemon/.env` — the committed value is a placeholder (401 until set).

### AI System (config / authoring / prompt enhance) + platform fixes — Complete
- **Status**: Completed (2026-06-20)
- **Worklogs**: `backend/worklogs/2026-06-20-ai-system-and-platform-fixes.md`,
  `apps/daemon/worklogs/2026-06-20-ai-endpoints.md`,
  `apps/web/worklogs/2026-06-20-enhance-prompt-and-feature-gating.md`.
  **Training skill**: `.claude/skills/ai-system/SKILL.md`.
- **Shipped**:
  - **Admin AI config** (`AiSettings` + `/admin/manage-ai-settings` + `LlmConfigResolver`) —
    LLM + web-search providers incl. **Custom API**, passed to the daemon per request; `.env` fallback.
  - **AI skill authoring** (`POST /api/skills/author` → draft) + schema endpoint.
  - **Reusable prompt enhancer** (`POST /api/ai/enhance-prompt` + `<EnhancePromptButton>` / `useEnhancePrompt`) —
    auto-matches input language, mobile bottom-sheet preview.
  - **Local skills manager** (`/admin/skill-manager`): file CRUD, **draft/publish**, category
    classification (multi/single/unloaded), AI-author button.
  - **Tavily web-search** helper (optional trend grounding).
  - **ErrorSanitizer**: hide provider/model/credential leaks at every frontend boundary.
  - **Plan feature-gating** (`Plan::capabilities` → studio "Tính năng đang bảo trì").
  - Fixes: project-status (daemon latest-task), `model_mapping` repeater dehydrate,
    `image_multi_panel`→`storyboard_video`, **retry cap** (`max_attempts_per_project`=5),
    reasoning-model JSON parse (`<think>` strip).
- **Verification**: tsc 0 (web + daemon), `php -l` clean, end-to-end via real ckey/MiniMax-M3
  + Playwright + curl. Committed + synced to monorepo.
- **Config note**: set a real provider/key in `/admin/manage-ai-settings` to enable AI live
  (CKEY default is a placeholder). Reasoning models are slow — use a non-reasoning model
  (e.g. gpt-4o-mini) for snappy prompt enhancement.

### Full-System Test (Simulation) — Pipeline Green
- **Status**: Completed (2026-06-19)
- **Worklog**: `backend/worklogs/2026-06-19-full-system-test-issues/SUMMARY.md` (+ per-issue files)
- **Result**: Ran the main flow end-to-end against the live stack in simulation. Was **not
  runnable** (daemon couldn't even start); fixed **3 blockers** → pipeline now green:
  1. `daemon` compose service had no `command` (regression f0c1265) → daemon + app down. Fixed in `backend/docker-compose.dev.yml` (restored command, added `node_modules` anon volume + ffmpeg/build toolchain).
  2. `StoryboardRenderer::resolveModel()` passed stale named arg `qualityTierCode:` to `ModelSelector::resolve()` → PHP fatal, every scene failed to queue (swallowed into a 200). Fixed (positional arg).
  3. Daemon container missing `ffmpeg` (`spawn ffmpeg ENOENT`). Fixed (apk add at boot).
- **Verified**: Storyboard render → webhook → `completed` + final video (cross-service async
  loop proven). RenderJob render → publish → appears in `GET /v1/community/assets`.
- **Follow-ups**: regression test for #2; daemon `Dockerfile.dev` to bake ffmpeg; wire real
  tier-2 `render-publish.spec.ts` from the now-verified API flow. Not committed (awaiting owner).

### E2E Playwright — Tier 1 Complete
- **Status**: Completed (2026-06-19)
- **Worklog**: `apps/web/worklogs/2026-06-19-e2e-playwright-tier1.md`
- **Result**: Playwright stood up from scratch (`apps/web/playwright.config.ts` + `e2e/`). **7/7 tier-1 specs green** — auth (form, valid, invalid) + storyboard creation (projects list, builder nav, create-via-API appears). Run with `npm run test:e2e` (needs web :3000 + backend :8000 + seeded DB). Side-fix: migration `2026_06_06_000007` made idempotent (was failing fresh migrate on duplicate `users_username_unique`).
- **Tier 2 (render → publish) — DONE & GREEN (opt-in)**: `e2e/render-publish.spec.ts` now exercises the real full-stack pipeline (web→laravel→queue→daemon→webhook→laravel). Two specs pass against the live stack in simulation: (a) render-job → publish → appears in `/v1/community/assets`; (b) storyboard renders end-to-end to a `completed` final video. Run with `E2E_TIER2=1 npx playwright test render-publish` — requires the full stack up **with daemon simulation ON** (`SIMULATION_MODE=1` at compose up). Skipped by default: with simulation off a render calls real providers (real credits/latency). See `backend/worklogs/2026-06-19-full-system-test-issues/SUMMARY.md`.

### Backend Test Drift Fix — Complete
- **Status**: Completed (2026-06-19)
- **Worklog**: `backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md`
- **Result**: Full backend suite green — **445 passed, 1 skipped, 0 failed** (was 70 failed). Two root causes: (1) `AiPromptCompiler` fatal'd assigning null to typed `string $apiKey` when `CKEY_API_KEY` unset (real production bug, 69 failures) — fixed with `?? ` coalescing; (2) `capability` exposure assertion in `CommunityFeatureTest` relaxed (owner-confirmed non-sensitive).

### Community Features Audit — Complete
- **Status**: Completed (2026-06-14)
- **Plan**: `docs/plans/community/audit-and-fix-plan.md`
- **Worklog**: `worklogs/2026-06-14-community-bugfixes.md`
- **Result**: All 14 bugs fixed, duplicate publish prevention, daily comment limit check, timezone issues, comment rate limiting implemented and verified with tests.

### Community Features — Complete
- **Status**: Completed (2026-06-14)
- **Plan**: `docs/plans/community/revert-storyboard-publish-and-fix-locations.md`
- **Worklog**: `worklogs/2026-06-14-publish-flow-fix-evaluation.md`
- **Result**: Storyboard publish reverted. RenderJob publish added to correct Jobs page and JobHistory. Fully verified by tester.

### Documentation Optimization — Complete
- **Status**: Completed (2026-06-14)
- **Worklog**: `worklogs/2026-06-14-docs-optimization.md`

### Fix Asset Type Detection — Community Cards
- **Status**: Completed (2026-06-17)
- **Plan**: `docs/plans/community/fix-asset-type-detection.md`
- **Root cause**: Frontend uses `duration_seconds > 0` to detect video vs image; images can have non-zero duration
- **Backend**: Add `asset_type` field to `formatAssetCard()` in CommunityController
- **Frontend**: Update `AssetCard` interface + `community-card.tsx` + `remix-modal.tsx` to use `asset_type`
- **Files**:
  - `backend/app/Http/Controllers/API/CommunityController.php` (line 532-566)
  - `apps/web/src/lib/api/community-types.ts` (line 1-26)
  - `apps/web/src/components/community/community-card.tsx` (line 36)
  - `apps/web/src/components/community/remix-modal.tsx` (line 95)

---

## Test Health

> Re-run 2026-06-22 against current code. **All three suites green.** Daemon had 5 TTS
> failures (a regression from `d5c591d`); fixed by restoring default-voice fallback — see
> `apps/daemon/worklogs/2026-06-22-tts-default-voice-fix.md`.

### Daemon Tests (apps/daemon/)
```
Last Run:    2026-06-22 (npm test)
Test Files:  8 passed (8)
Tests:       142 passed, 4 skipped (146)
Status:      ✅ All pass
```
**Fixed 2026-06-22**: `d5c591d` accidentally changed CKey + ElevenLabs TTS to **throw** on an
empty `voice` (while the sibling `openai-generic` provider it added kept a `|| 'alloy'`
default, and the pipeline passes `voice || ''`). Restored the default-voice fallback
(`CKEY_DEFAULT_VOICE_ID` / `ELEVENLABS_DEFAULT_VOICE_ID`) for a consistent TTS contract.

### Web Tests (apps/web/)
```
Last Run:    2026-06-22 (npm test)
Test Files:  4 passed (4)
Tests:       51 passed (51)
Status:      ✅ All pass
```
**Note**: vitest `include` is `src/**/*.test.{ts,tsx}` → 4 files / 51 tests today. The earlier
"8 files / 117" baseline was inaccurate (counted files no longer present / a different config).

### Backend Tests (backend/)
```
Last Run:    2026-06-22 (Docker: aivideo-app-1)
Result:      448 passed · 1 skipped · 0 failed (1532 assertions)
Status:      ✅ All pass
```
(+1 since 447 — storyboard error-message coverage from the 2026-06-22 sprint.)

### Snapshot (2026-06-22)
| Suite | Result |
|-------|--------|
| Daemon | ✅ 142 passed · 4 skipped |
| Web | ✅ 51 passed |
| Backend | ✅ 448 passed · 1 skipped |

**Note**: Prior drift (70 failed) cleared 2026-06-19 — see
`backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md`.
Run inside Docker: `docker exec aivideo-app-1 php artisan test`
(host PHP lacks `pdo_sqlite`). The 1 skip is intentional (null-user FK case).
The app container needs `composer install` (vendor is an anon volume) before tests run.

---

## Future Considerations

| Item | Notes |
|------|-------|
| Backend Tests | Need Docker container or `pdo_sqlite` extension |
| E2E Tests | Playwright planned for Phase 3 |
| Integration Tests | Cross-service webhook flow end-to-end tests |

---

## Agent Sessions (Last 7 Days)

| Date | Agent | Worklog | Result |
|------|-------|---------|--------|
| 2026-06-14 | Antigravity | `worklogs/2026-06-14-community-bugfixes.md` | ✅ Fixed duplicate publish check, daily comment limit check, comment rate limiting, resolved timezone issues, fixed billing TS compiler error |
| 2026-06-14 | @planner | `docs/plans/community/audit-and-fix-plan.md` | ✅ Community features audit: 14 bugs found, fix plan created |
| 2026-06-14 | @general | `worklogs/2026-06-14-docs-optimization.md` | ✅ Documentation optimization complete |
| 2026-06-13 | @general + @tester | `worklogs/2026-06-13-testing-coverage-improvement.md` | ✅ Testing coverage: 37→259 tests |
| 2026-06-11 | @tester | `backend/worklogs/2026-06-11-test-drift-triage-fix.md` | ✅ Test drift triage: 455 pass (↑19) |

## Documentation & Worklog Updates

- **Documentation Optimization**: Completed and verified (2026-06-14).
- **Worklogs Summary**: Added consolidated summary `worklogs/2026-06-14-summary.md`.
- **Next Steps**: Review TypeScript error, archive legacy storyboard file.
