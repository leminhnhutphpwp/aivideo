---
name: queue-and-jobs
description: Laravel queue system with Horizon and Redis
compatibility: opencode
metadata:
  scope: backend
  type: reference
---

## Queue Configuration

### Connection
```env
QUEUE_CONNECTION=redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### Horizon
```env
HORIZON_BALANCE=auto
HORIZON_BALANCE_MAX_SHIFT=10
HORIZON_BALANCE_COOLDOWN=3
```

## Job Types

### Render Jobs
- `ProcessRenderJob` — Main job for media generation
- `HandleJobCompletion` — Process successful completion
- `HandleJobFailure` — Process failed jobs
- `RefundCredits` — Refund credits on failure

### Email Jobs
- `SendEmailNotification` — Queue email sending
- `SendJobCompletionEmail` — Send completion notification
- `SendJobFailureEmail` — Send failure notification

## Job Middleware
```php
class RenderJobMiddleware {
  public function handle($job, $next) {
    // Check rate limits
    // Verify credits
    // Set timeout
    $next($job);
  }
}
```

## Monitoring

### Horizon Dashboard
- `http://localhost:8000/horizon`
- View job metrics
- Retry failed jobs
- Monitor queue depth

### Commands
```bash
php artisan horizon:status
php artisan horizon:terminate
php artisan horizon:snapshot
```

## When to use this skill

Reference this when:
- Creating new queued jobs
- Debugging queue issues
- Configuring Horizon
