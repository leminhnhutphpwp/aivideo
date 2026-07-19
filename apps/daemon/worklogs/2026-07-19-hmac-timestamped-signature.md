# HMAC timestamped (replay-resistant) control-plane signature — Worklog

## Date
2026-07-19

## Overview
Hardened the Laravel→daemon auth signature. The daemon previously verified a **constant**
`HMAC(userId)` (userId = `laravel-app`) — a static token that, once captured, could be replayed
forever. Added a preferred **timestamped** scheme `HMAC("{userId}.{timestamp}")` bound to a replay
window, kept the legacy scheme for zero-downtime rollout, and gated legacy off via a strict env flag.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/services/auth.ts` | New `verifyDaemonSignature()` — timestamped HMAC with `Math.abs(now-ts) <= window` check; legacy constant HMAC retained unless `DAEMON_STRICT_SIGNATURE=1`; `signatureWindowSeconds()` (env `DAEMON_SIGNATURE_WINDOW_SECONDS`, default 300). Middleware now reads `x-timestamp` and delegates to the helper. |
| `apps/daemon/src/services/auth.test.ts` | +6 tests: fresh-ts accept, expired-ts reject, tampered-ts reject, non-numeric-ts reject (no legacy fallthrough), legacy-still-accepted default, legacy-rejected under strict mode. |

## Key Decisions
1. **Backward-compatible rollout** — when no `x-timestamp` is sent, the legacy constant HMAC still
   works, so a partially-deployed stack never breaks. Once both sides ship, set
   `DAEMON_STRICT_SIGNATURE=1` to fully close the replayable legacy path.
2. **No silent downgrade** — if a timestamp IS present it must validate as the timestamped scheme;
   we never fall back to legacy for a timestamped request (prevents downgrade tricks).
3. **Seconds + 300s window** — generous for same-host docker clock skew; configurable.

## Verification
- [x] TypeScript: `tsc --noEmit` = 0 errors.
- [x] Tests: full daemon suite **309 passed / 4 skipped** (was 303 + 6 new auth tests). auth.test.ts 10/10.
- [x] Backend side: `DaemonClient` change + full backend suite **570 passed / 1 skipped** (webhook signature tests green).
- [ ] Full cross-layer round-trip (real Laravel→daemon HTTP) not explicitly exercised, but both sides are tested independently and the change is backward-compatible (legacy scheme still accepted until `DAEMON_STRICT_SIGNATURE=1`).

## Handoff Notes
- **@backend**: `DaemonClient::withAuth()` now sends `X-Timestamp` + timestamped signature (matched change). No action needed unless you add new outbound callers — reuse `withAuth()`.
- **Ops**: after both layers are deployed and verified, set `DAEMON_STRICT_SIGNATURE=1` in the daemon env to reject the old replayable constant token. Optionally tune `DAEMON_SIGNATURE_WINDOW_SECONDS`.

## Status
✅ Completed (code + daemon tests green; cross-layer integration test pending Docker/owner)
