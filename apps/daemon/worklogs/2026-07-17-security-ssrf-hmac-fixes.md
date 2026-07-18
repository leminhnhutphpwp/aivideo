# Security fixes — SSRF via LLM override + non-constant-time HMAC — Worklog

## Date
2026-07-17

## Overview
Fixed two audit-confirmed daemon security issues in `apps/daemon/`:
(1) SSRF through a client-supplied `llm` override on the LLM proxy endpoints, and
(2) a timing side-channel in the daemon HMAC signature verification. Added unit
tests for both. No behavior change for the legitimate Laravel-forwarded path.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers.ts` | Added `isAllowedLlmBaseUrl()` (host allowlist + private/loopback/link-local IP rejection), `resolveRequestLlm()` (centralized override resolution with SSRF validation), and `ResolvedLlm` type. Allowlist = known LLM provider hosts + this daemon's own configured provider hosts + `LLM_ALLOWED_HOSTS` env. |
| `apps/daemon/src/routes/media.ts` | Replaced the 3 duplicated inline `llmOverride` resolution blocks (`/enhance-prompt` ~:313, `/skills/author` ~:196, `/storyboard-from-concept` ~:852) with `resolveRequestLlm(req.body?.llm)`; rejected baseUrl → 400. Dropped now-unused `resolveLlmProvider` import. |
| `apps/daemon/src/services/auth.ts` | Replaced `signature === expected` (`:46`) with `timingSafeEqualHex()` using `crypto.timingSafeEqual` over hex-decoded buffers; wrapped in try/catch, fails closed on length/encoding mismatch. |
| `apps/daemon/src/media/providers.test.ts` | +9 tests: `isAllowedLlmBaseUrl` (allow known hosts, reject loopback/10./172.16-31./192.168./169.254./::1, reject unknown public + non-http(s), honor env) and `resolveRequestLlm` (reject internal, accept allowed, gemini exempt, env fallback). |
| `apps/daemon/src/services/auth.test.ts` | New — 4 tests for the HMAC branch of `createAuthMiddleware` (valid sig passes, wrong sig 401, non-hex/wrong-length 401 without throwing, public path bypass). |

## Key Decisions
1. **Chose allowlist (not just auth-gate)** — matches the task's stronger-defense
   preference and the existing code shape. `resolveRequestLlm` mirrors the prior
   "override wins, else `.env`" logic so the Laravel path (baseUrl from
   `LlmConfigResolver`, e.g. `https://ckey.vn`) still passes untouched — that host
   is auto-added to the allowlist from `ALL_PROVIDERS`.
2. **Operator escape hatch via `LLM_ALLOWED_HOSTS`** (comma-separated) so a
   self-hosted/custom provider can be permitted without a code change.
3. **Gemini exempt from URL validation** — gemini uses a fixed Google endpoint,
   not `baseUrl`, so there is no SSRF surface there.
4. **Rejection → HTTP 400** (client-error) with a VN message; missing config
   still → 500 as before.
5. **HMAC compare hex-decodes before `timingSafeEqual`** — equal-length 32-byte
   buffers; length/encoding mismatch or any throw → `false` (fail-closed).

## Verification
- [x] TypeScript: `npx tsc --noEmit` → exit 0
- [x] Tests: `npm test` → **155 passed / 4 skipped** (baseline 142 not reduced; +13 new tests all pass)
- [x] Manual reasoning: private/loopback/link-local (incl. `169.254.169.254`
      cloud metadata) and unknown public hosts rejected; known provider hosts and
      `.env` fallback pass; wrong/malformed HMAC sig rejected without throwing.

## Handoff Notes
- **@backend needs to know**: the daemon now allowlists the `llm.baseUrl` it
  forwards. `LlmConfigResolver` baseUrls that are NOT a known provider host must
  be added to the daemon's `LLM_ALLOWED_HOSTS` env, or `/enhance-prompt`,
  `/skills/author`, `/storyboard-from-concept` will 400. Current known hosts
  include `ckey.vn` + common LLM providers (openai, gemini, openrouter, groq,
  mistral, deepseek, x.ai, dashscope).
- New optional env: `LLM_ALLOWED_HOSTS` (comma-separated hostnames).

## Status
✅ Completed
