---
name: job-lifecycle
description: Render job lifecycle from submission to completion
---

## Job Lifecycle

### States
```
queued → processing → completed
                     → failed
                     → cancelled
```

### 1. Job Creation (Laravel)
```php
RenderJob::create([
  'user_id' => $userId,
  'provider' => $provider,
  'model' => $model,
  'prompt' => $prompt,
  'params' => $params,
  'status' => 'queued',
  'credits_reserved' => $duration,
]);
```

### 2. Queue Dispatch
- Job added to Redis queue
- Horizon monitors queue
- Worker picks up job

### 3. Daemon Processing
- Laravel POST to `http://daemon:7456/api/projects/:id/media/generate`
- Daemon creates task, returns task ID
- Task status: `pending` → `processing` → `completed/failed`

### 4. Webhook Callback
- Daemon POST to `http://laravel/api/webhooks/daemon/job-complete`
- Payload: `{ job_id, status, output_url, error? }`
- Laravel verifies HMAC signature

### 5. Completion Handling
```php
match($status) {
  'completed' => $job->markCompleted($outputUrl),
  'failed' => $job->markFailed($error),
  'cancelled' => $job->markCancelled(),
};
```

### 6. Credit Finalization
- Completed: deduct reserved credits
- Failed/Cancelled: refund reserved credits
- Send email notification

## When to use this skill

Reference this when:
- Debugging job failures
- Adding new job states
- Modifying webhook handling
