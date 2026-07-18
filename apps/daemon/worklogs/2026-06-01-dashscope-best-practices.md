# DashScope P0 Best Practices — fetchWithBackoff + Wait-Timeout

## Date
2026-06-01

## Overview
Implemented exponential backoff with jitter for 429 rate limiting, added X-DashScope-Wait-Timeout header.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/qwencloud.ts` | fetchWithBackoff() with 6 retries, x-dashscope-wait-timeout: 30 |

## Key Decisions
1. Exponential backoff: 1s→32s with ±1s jitter
2. Wait-Timeout: 30s for create task only (not poll)
3. All fetch() calls replaced with fetchWithBackoff()

## Verification
- [x] tsc daemon: 0 errors
- [x] Backend tests: 19/19
