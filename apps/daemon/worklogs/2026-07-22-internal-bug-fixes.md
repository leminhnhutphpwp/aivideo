# Daemon internal bug fixes — Worklog

## Date
2026-07-22

## Overview
Fixed 7 internal bugs across daemon utilities: logger level validation, skills loader
robustness, Prometheus metrics duplicate-series break + constant-time token compare,
vocab parse guarding, and path-traversal containment in config/home-expansion helpers.

## Files Changed
| File | Change |
|------|--------|
| `src/utils/logger.ts` | Validate `LOG_LEVEL` against `LOG_LEVELS`; fall back to env default when unsupported instead of silently disabling all logging |
| `src/skills/loader.ts` | (2) `parseFrontmatter` returns `null` on YAML parse error → skill skipped, no longer defaults draft→published; (3) wrap `readFileSync` in try/catch → `continue` on unreadable file; (5) skip duplicate frontmatter `id`; (5) `fileURLToPath(import.meta.url)` instead of `new URL(...).pathname` |
| `src/routes/metrics.ts` | (4) aggregate `daemon_generation_duration_seconds` per (model,status) as a summary count+sum — kills duplicate series that rejected the whole scrape; constant-time metrics-token compare via `timingSafeEqual` (length-guarded) |
| `src/media/vocab.ts` | Guard `readFileSync`+`JSON.parse` in try/catch; each field defaults to `[]` (via `asStringArray`) so a malformed bundled file can't crash startup |
| `src/media/config.ts` | `resolveOverrideDir` uses shared `assertWithinRoot` containment guard for relative paths |
| `src/utils/home-expansion.ts` | New exported `assertWithinRoot`; `resolveProjectRelativePath` throws when a relative input escapes `projectRoot` (absolute inputs allowed) |

## Key Decisions
1. Containment guard only enforces on the relative-resolution branch — absolute/home-expanded inputs are an explicit deliberate location and pass through (avoids breaking legit absolute env overrides).
2. `parseFrontmatter` distinguishes valid-but-empty (`{}`) from parse-failure (`null`); only `null` skips the skill, preserving the "missing status = published" default for genuine empty frontmatter.
3. Duration metric switched to Prometheus `summary` type emitting `_count`/`_sum` per label set; removed the old label-less `_count` gauge to avoid a TYPE conflict.

## Verification
- [x] TypeScript: `npx tsc --noEmit` → 0 errors
- [ ] Tests: not run (no test changes; typecheck only per task scope)

## Handoff Notes
- **@backend needs to know**: `/metrics` now emits `daemon_generation_duration_seconds` as a summary (`_count`/`_sum{model,status}`) instead of raw per-task gauge lines; any dashboard/alert querying the old raw metric name should switch to the `_sum`/`_count` series.

## Status
✅ Completed
