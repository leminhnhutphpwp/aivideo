# 5 Quick Wins — Alibaba Cloud Model Studio

## Date
2026-06-01

## Overview
Implemented 5 best practices from Alibaba Cloud Model Studio analysis: adaptive polling, prompt_extend, negative prompt, task metrics, video download retry.

## Files Changed
| File | Change |
|------|--------|
| `apps/daemon/src/media/providers/qwencloud.ts` | getAdaptivePollInterval(), prompt_extend, negative_prompt, dlMaxRetries |
| `backend/app/Services/TaskMetricsService.php` | NEW — logPoll, logCompletion, logFailure, logDownloadRetry |
| `backend/app/Jobs/HandleJobCompletion.php` | TaskMetricsService integration |
| `backend/config/logging.php` | task_metrics channel |
| `backend/database/migrations/*_add_negative_prompt_to_render_jobs_table.php` | NEW — negative_prompt column |
| `backend/app/Models/RenderJob.php` | negative_prompt in fillable |
| `backend/app/Http/Requests/CreateRenderJobRequest.php` | negative_prompt validation |
| `backend/app/Services/RenderJobService.php` | negative_prompt pass-through |

## Key Decisions
1. Adaptive polling: 12-15s base + jitter ±3s + backoff (8s-60s range)
2. prompt_extend: enabled for wan2.6/2.7 t2v only
3. Task metrics: daily log rotation, 30-day retention

## Verification
- [x] tsc daemon: 0 errors
- [x] Backend tests: 19/19
