# Fix "no Qwen Cloud base URL" render failure + surface failure reason — Worklog

## Date
2026-06-21

## Overview
Storyboard renders failed instantly with daemon error **"no Qwen Cloud base URL"**, so each
"Thử lại" kicked off → failed in ~1s → reverted to `failed` → the retry button reappeared,
silently burning all 5 attempts with no feedback. Root cause: the daemon credential resolver
ignored the provider's built-in `defaultBaseUrl`. Fixed that, plus surfaced a sanitized
failure reason in the UI so failures are visible.

## Root cause
`ALL_PROVIDERS` (providers.ts) defines `qwencloud.defaultBaseUrl =
'https://dashscope-intl.aliyuncs.com/api/v1'`, but `resolveProviderConfig` in
`apps/daemon/src/media/config.ts` built `baseUrl` from only `env || stored || ''` — it never
consulted the default. With only `DASHSCOPE_API_KEY` set (key OK) and no
`QWENCLOUD_BASE_URL`, baseUrl resolved to `''` → "no Qwen Cloud base URL".

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/config.ts` | `resolveProviderConfig` baseUrl now falls back to the provider's `defaultBaseUrl` (`MEDIA_PROVIDERS`, already imported): `env → stored → defaultBaseUrl`. General fix for every provider, not just qwen. |
| `backend/app/Models/Storyboard.php` | Hid raw `error_message`; added sanitized `public_error` accessor (via `ErrorSanitizer`, null unless failed) + appended it. |
| `apps/web/.../flow/[uuid]/page.tsx` | Added a red "Render thất bại: {public_error}" banner on failed storyboards so the reason is visible (no more silent failure). |
| `apps/web/src/lib/api/storyboard-types.ts` | `error_message` optional; added `public_error?`. |

## Key Decisions
1. **Fix at the resolver, not via env.** The intended default already existed in the provider
   config; consulting it is the correct fix and unblocks all providers with a `defaultBaseUrl`.
   Env / stored config still override it.
2. **Sanitize the surfaced error.** Raw `error_message` can carry provider/model/key details
   (project rule) — hide it; expose only `ErrorSanitizer::publicMessage()` output.
3. Reset `render_attempts` on the affected storyboard (failures were an infra bug, not the
   user's fault) — though the user then deleted it.

## Verification
- [x] Daemon `npx tsc --noEmit` 0 errors; rebuilt (`--force-recreate daemon`), healthy.
- [x] `resolveProviderConfig(_, 'qwencloud')` → `baseUrl = https://dashscope-intl.aliyuncs.com/api/v1`, apiKey set. "no base URL" gone.
- [x] `php -l` + web `tsc` 0 errors. `public_error` → sanitized VN message, raw `error_message` hidden, null when not failed.

## Status
✅ Completed (not committed — awaiting owner)
