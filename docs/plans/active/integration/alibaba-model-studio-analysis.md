# Alibaba Cloud Model Studio — Analysis & Best Practices

## Date
2026-05-31

## Overview
Phân tích tài liệu Alibaba Cloud Model Studio (DashScope) cho video generation API, so sánh với implementation hiện tại của AI Video Platform, và đề xuất best practices có thể áp dụng ngay.

---

## 1. Cách tổ chức API

### Architecture Pattern
```
┌──────────────┐     POST /services/aigc/video-generation/video-synthesis
│   Client     │ ─────────────────────────────────────────────────────►
│  (Daemon)    │     Header: X-DashScope-Async: enable
└──────────────┘
       │
       │ ◄──── { task_id, task_status: "PENDING" }
       │
       ▼
┌──────────────┐     GET /api/v1/tasks/{task_id}
│   Polling    │ ──────────────────────────────────────────────►
│  (Daemon)    │     (every 15s recommended)
└──────────────┘
       │
       │ ◄──── { task_status: "SUCCEEDED", video_url: "..." }
       ▼
┌──────────────┐     Download video (URL expires 24h)
│  Download    │ ──────────────────────────────────────────────►
│  + Store     │     Save to permanent storage (R2/OSS)
└──────────────┘
```

### Endpoint Structure
| Region | Base URL |
|--------|----------|
| Singapore (International) | `https://dashscope-intl.aliyuncs.com` |
| Virginia (Global/US) | `https://dashscope-us.aliyuncs.com` |
| Beijing (Chinese Mainland) | `https://dashscope.aliyuncs.com` |
| Hong Kong | `https://cn-hongkong.dashscope.aliyuncs.com` |

### API Methods
| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| POST | `/services/aigc/video-generation/video-synthesis` | Create task | 20 QPS/account |
| GET | `/api/v1/tasks/{task_id}` | Query single task | 20 QPS/account |
| GET | `/api/v1/tasks/` | Batch query tasks | 20 QPS/account |
| POST | `/api/v1/tasks/{task_id}/cancel` | Cancel PENDING task | 20 QPS/account |

---

## 2. Async Task Handling

### Task Status Flow
```
PENDING → RUNNING → SUCCEEDED
                   → FAILED
         → CANCELED (only if PENDING)
         → UNKNOWN (expired after 24h)
```

### Key Details
- **Task ID validity**: 24 hours
- **Video URL validity**: 24 hours
- **Recommended polling interval**: 15 seconds
- **Completion time**: 1–5 minutes (varies by model/load)

### Batch Query Capabilities
```json
GET /api/v1/tasks/?start_time=20260531000000&end_time=20260531235959&status=SUCCEEDED&model_name=wan2.6-t2v&page_no=1&page_size=10
```
**Filters available**: task_id, start_time, end_time, model_name, status, page_no, page_size

### Our Current Implementation (Daemon)
```
createTask() → store task_id in SQLite → setInterval polling → callback webhook → Laravel
```

### Gap Analysis
| Feature | DashScope | Our Daemon | Gap |
|---------|-----------|------------|-----|
| Batch query | ✅ Single API for multiple tasks | ❌ Individual polls | **HIGH** — waste QPS |
| Task cancellation | ✅ Cancel PENDING tasks | ❌ Not implemented | **MEDIUM** — UX issue |
| Status filters | ✅ Filter by status/model/time | ❌ Manual iteration | **MEDIUM** — efficiency |
| Pagination | ✅ Built-in | ❌ N/A | **LOW** |

---

## 3. Cache Strategy

### DashScope Caching Rules
1. **Task ID**: Cache locally for 24h, then discard
2. **Video URL**: Download immediately, store permanently — URL expires in 24h
3. **No server-side caching**: Each poll is a fresh API call

### Our Current Strategy
```
Daemon SQLite: stores task_id, status, result_url
R2/MinIO: stores downloaded video files
Laravel: caches nothing (stateless webhook handler)
```

### Recommendations
| What | Current | Recommended | Impact |
|------|---------|-------------|--------|
| Video download | On webhook only | **On success + re-try** | Prevents lost URLs |
| Task metadata | SQLite only | **Add Redis cache** | Faster status checks |
| Polling results | Fresh each time | **Cache for 5 min** | Reduce QPS usage |
| Batch status | Not used | **Implement batch poll** | 50%+ QPS reduction |

---

## 4. Cost Optimization

### DashScope Pricing (Video Generation)
| Model | Resolution | Duration | Price/second |
|-------|-----------|----------|-------------|
| wan2.6-t2v | 720P | 5-15s | ~$0.014 |
| wan2.6-t2v | 1080P | 5-15s | ~$0.024 |
| wan2.2-t2v-plus | 1080P | 5s | ~$0.014 |
| wan2.1-t2v-turbo | 720P | 5s | Cheapest |
| happyhorse-1.0 | 720P-1080P | variable | $0.14-0.24/sec |

### Cost Optimization Features (DashScope)
1. **`prompt_extend: true`** — LLM rewrites short prompts → better quality, longer processing
2. **`shot_type: multi`** — Multi-shot narrative (wan2.6 only) — one API call, multiple scenes
3. **`seed` parameter** — Reproducible results for testing/iteration
4. **Batch calling** — 50% discount on text models (not video)
5. **Context caching** — Discount on repeated prompts (text models only)

### Our Cost Levers
| Lever | Current | Opportunity |
|-------|---------|-------------|
| Model selection | User chooses | **Auto-select cheapest fit** |
| Resolution | User chooses | **Default to 720P, upsell 1080P** |
| Duration | Fixed per job | **Shorter = cheaper, show estimate** |
| prompt_extend | Not used | **Enable for better quality** |
| Multi-shot | Not used | **wan2.6 multi-shot = fewer API calls** |
| Negative prompt | Not used | **Prevent wasted generations** |

---

## 5. Rate Limiting

### DashScope Limits
- **20 QPS per Alibaba Cloud account** (all task management APIs combined)
- Includes all RAM users under the account
- **Video generation endpoint**: Separate from task management

### Our Risk
```
Current: 1 user = 1 poll every 5s = 0.2 QPS
100 concurrent users = 20 QPS ← HITTING LIMIT
```

### Mitigation Strategies
| Strategy | Complexity | Impact |
|----------|-----------|--------|
| **Batch polling** | Low | Combine 100 individual polls → 10 batch calls |
| **Polling backoff** | Low | Start at 15s, increase to 30s after 2 min |
| **Webhook fallback** | Medium | DashScope doesn't support webhooks natively |
| **Queue-based polling** | Medium | Centralized poller, broadcast results |
| **Stagger start times** | Low | Random jitter on poll intervals |

---

## 6. Error Handling

### DashScope Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| `InvalidApiKey` | Auth failure | Check API key |
| `InvalidParameter` | Bad request params | Validate input |
| `DataInspectionFailed` | Content moderation | Show user message |
| `IPInfringementSuspect` | IP violation | Block + notify |
| `Throttling.RateQuota` | Rate limit hit | Exponential backoff |
| `UnsupportedOperation` | Invalid cancel (not PENDING) | Ignore gracefully |

### Our Current Error Handling
```
Daemon: catch HTTP errors → mark task FAILED → webhook → Laravel deducts nothing
```

### Gaps
1. **No retry logic** for transient errors (5xx, network)
2. **No content moderation handling** — user sees generic error
3. **No rate limit handling** — immediate failure instead of backoff
4. **No task expiration handling** — if daemon restarts, orphaned tasks

---

## 7. So sánh với Project Hiện Tại

### Architecture Comparison
```
DashScope (Alibaba):
  Client → POST create task → Poll task status → Download video
  (No webhooks, pure polling)

Our Platform:
  Web → Laravel API → Daemon → Provider API → Daemon polls → Webhook → Laravel → WebSocket → Web
```

### Feature Mapping
| DashScope Feature | Our Equivalent | Status |
|-------------------|---------------|--------|
| Create async task | `generateMedia()` | ✅ Implemented |
| Poll task status | `setInterval` in daemon | ✅ Implemented |
| Download video URL | `downloadAndStore()` | ✅ Implemented |
| Batch task query | N/A | ❌ **Not implemented** |
| Task cancellation | N/A | ❌ **Not implemented** |
| Multi-shot narrative | N/A | ❌ **Not implemented** |
| Auto dubbing | Voiceover flow (separate) | ⚠️ Different approach |
| Negative prompt | N/A | ❌ **Not implemented** |
| prompt_extend | N/A | ❌ **Not implemented** |
| Content moderation | Generic error | ⚠️ Needs improvement |
| Region routing | Single endpoint | ⚠️ Could optimize |

### Models We Use vs Available
| Our Model | DashScope Equivalent | Notes |
|-----------|---------------------|-------|
| happyhorse-1.0-t2v | `happyhorse-1.0-t2v` | ✅ Match |
| wan2.6-t2v | `wan2.6-t2v` | ✅ Match |
| wan2.7 | `wan2.7` | ⚠️ Check if available |
| kling | Kling (not DashScope) | ❌ Different provider |

### DashScope Models We Don't Use (Opportunities)
| Model | Capability | Opportunity |
|-------|-----------|-------------|
| wan2.6-i2v | Image-to-video with audio | **Add I2V with sound** |
| wan2.6-r2v | Reference-to-video | **Character consistency** |
| wan2.1-vace | Video editing | **Post-generation editing** |
| wan2.2-s2v | Digital human lip-sync | **New product feature** |
| wan2.2-animate-move | Motion transfer | **New product feature** |
| wan2.2-animate-mix | Character swap | **New product feature** |
| wan2.2-kf2v | First+last frame | **Controlled transitions** |

---

## 8. Best Practices — Đề xuất 3-5 cái có thể áp dụng ngay

### ✅ Best Practice 1: Implement Batch Polling
**Impact**: HIGH | **Effort**: LOW (2-3h)

```typescript
// Current: N individual polls
tasks.forEach(task => pollTask(task.id)); // N QPS

// Recommended: 1 batch call
const result = await fetch(
  `GET /api/v1/tasks/?task_id=${id1},${id2},${id3}&status=RUNNING`
);
// 1 QPS for N tasks
```

**Implementation**:
1. Daemon collects pending task IDs
2. Single batch API call every 15s
3. Distribute results via event emitter
4. **Reduce QPS usage by 80-90%**

**Files to modify**:
- `apps/daemon/src/media/providers/dashscope.ts` — add `batchQueryTasks()`
- `apps/daemon/src/services/task-manager.ts` — switch to batch polling

---

### ✅ Best Practice 2: Add Task Cancellation Support
**Impact**: MEDIUM | **Effort**: LOW (1-2h)

```typescript
// Add to daemon
async function cancelTask(taskId: string): Promise<void> {
  await fetch(`POST /api/v1/tasks/${taskId}/cancel`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
}

// Expose via API
app.post('/api/tasks/:id/cancel', async (req, res) => {
  await cancelTask(req.params.id);
  // Update SQLite status to CANCELED
  res.json({ success: true });
});
```

**Files to modify**:
- `apps/daemon/src/services/task-manager.ts` — add `cancelTask()`
- `apps/daemon/src/routes/` — add cancel endpoint
- Backend: `DaemonClient.php` — add `cancelTask()` method

---

### ✅ Best Practice 3: Implement Negative Prompt + prompt_extend
**Impact**: MEDIUM | **Effort**: LOW (1-2h)

```typescript
// In dashscope provider
function buildRequestBody(params: GenerateParams) {
  return {
    model: params.model,
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || '', // NEW
    },
    parameters: {
      size: params.resolution,
      duration: params.duration,
      prompt_extend: params.promptExtend ?? true, // NEW: default true
      shot_type: params.shotType || 'single', // NEW: optional multi
      seed: params.seed, // NEW: reproducibility
    }
  };
}
```

**UI Changes**:
- Add "Advanced Settings" accordion in video generation form
- Show: Negative Prompt, Prompt Extend toggle, Shot Type (single/multi)
- Default: Prompt Extend ON, Shot Type single

**Files to modify**:
- `apps/daemon/src/media/providers/dashscope.ts` — extend params
- `apps/web/src/components/video-sidebar.tsx` — add advanced settings
- Backend: validation for new fields

---

### ✅ Best Practice 4: Video URL Expiry Handling + Auto-Download
**Impact**: HIGH | **Effort**: MEDIUM (3-4h)

**Problem**: DashScope video URLs expire in 24h. If daemon fails to download before expiry, video is lost.

**Solution**: Multi-layer download strategy:
```typescript
// 1. Immediate download on success
if (taskStatus === 'SUCCEEDED') {
  const videoBuffer = await downloadVideo(videoUrl);
  await uploadToR2(videoBuffer, `projects/${projectId}/${taskId}.mp4`);
  await updateTaskStatus(taskId, 'DOWNLOADED');
}

// 2. Retry queue for failed downloads
if (taskStatus === 'SUCCEEDED' && !downloaded) {
  scheduleRetry(taskId, videoUrl, attempts: 3);
}

// 3. Periodic cleanup of expired tasks
// Every 6 hours, check for SUCCEEDED tasks without downloads
// Mark as FAILED with reason "URL_EXPIRED"
```

**Files to modify**:
- `apps/daemon/src/services/task-manager.ts` — add download retry logic
- `apps/daemon/src/services/storage.ts` — add R2 upload
- `apps/daemon/src/services/cleanup.ts` — new: expired task cleanup

---

### ✅ Best Practice 5: Rate Limit Backoff + Smart Polling
**Impact**: MEDIUM | **Effort**: LOW (1-2h)

```typescript
// Current: Fixed 5s interval
setInterval(() => pollTask(taskId), 5000);

// Recommended: Adaptive polling with backoff
function getPollInterval(elapsedSeconds: number, taskStatus: string): number {
  if (taskStatus === 'PENDING') return 15000; // 15s for pending
  if (taskStatus === 'RUNNING') {
    if (elapsedSeconds < 60) return 10000;   // 10s first minute
    if (elapsedSeconds < 180) return 15000;  // 15s next 2 min
    return 20000;                             // 20s after 3 min
  }
  return 30000; // 30s for unknown states
}

// Plus jitter to prevent thundering herd
function jitter(base: number): number {
  return base + Math.random() * 2000;
}
```

**Files to modify**:
- `apps/daemon/src/services/task-manager.ts` — replace fixed interval

---

## 9. Implementation Priority

| # | Best Practice | Effort | Impact | Priority | Dependencies |
|---|--------------|--------|--------|----------|-------------|
| 1 | Batch Polling | 2-3h | HIGH | 🔴 P0 | None |
| 2 | Video URL Expiry Handling | 3-4h | HIGH | 🔴 P0 | R2 integration |
| 3 | Task Cancellation | 1-2h | MEDIUM | 🟡 P1 | API endpoint |
| 4 | Negative Prompt + prompt_extend | 1-2h | MEDIUM | 🟡 P1 | UI changes |
| 5 | Rate Limit Backoff | 1-2h | MEDIUM | 🟢 P2 | None |

**Total estimated effort**: 8-13 hours

---

## 10. Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| Batch polling adds complexity | Start with simple batch, add filters later |
| Task cancellation may race with completion | Check status before cancel, handle gracefully |
| prompt_extend increases latency | Show "Enhancing prompt..." progress to user |
| Video download fails (network) | Retry queue with exponential backoff |
| Rate limit hit at scale | Batch polling + backoff = 90% QPS reduction |

---

## 11. Quick Wins (Apply This Sprint)

1. **Change polling interval from 5s → 15s** (5 min)
2. **Add `prompt_extend: true` to all wan2.6 requests** (10 min)
3. **Add negative prompt field to UI** (1h)
4. **Add `seed` parameter for reproducibility** (30 min)
5. **Log task metrics (duration, resolution, cost) for analytics** (2h)

---

## Sources
- [Video Generation API Overview](https://www.alibabacloud.com/help/en/model-studio/video-generation-api)
- [Async Task Management](https://www.alibabacloud.com/help/en/model-studio/manage-asynchronous-tasks)
- [Text-to-Video API Reference](https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference)
- [Video Generation Models](https://www.alibabacloud.com/help/en/model-studio/use-video-generation)
- [Model Pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing)
