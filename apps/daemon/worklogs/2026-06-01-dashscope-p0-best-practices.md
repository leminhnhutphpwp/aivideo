# DashScope P0 Best Practices — Worklog

## Date
2026-06-01

## Overview
Implemented DashScope P0 best practices for rate limiting and connection management in the QwenCloud provider.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/qwencloud.ts` | Added `fetchWithBackoff()` with exponential backoff + jitter for 429 responses; replaced all `fetch()` calls with `fetchWithBackoff()`; added `X-DashScope-Wait-Timeout: 30` header to create task requests |

## Key Decisions
1. **`fetchWithBackoff()`** handles 429 with exponential backoff (1s → 2s → 4s → 8s → 16s → 32s) + ±1s jitter, max 6 retries
2. Respects `retry-after` header when present — uses server-specified wait time instead of calculated backoff
3. **`X-DashScope-Wait-Timeout: 30`** only added to create task endpoints (video + wan image), NOT to poll endpoints — allows DashScope to queue requests up to 30s instead of returning 429 immediately
4. **Connection reuse**: Node.js 18+ fetch() uses keep-alive by default — no explicit agent needed
5. All `fetch()` calls replaced: batch query, video create task, video poll, video download, qwen image sync, qwen image download, wan image create task, wan image poll, wan image download

## Verification
- [x] tsc --noEmit: pass (0 errors)
