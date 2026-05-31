---
name: logging
description: Logging standards and best practices
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Logging Standards

## TypeScript Logging

### Log Levels
```typescript
logger.debug('Detailed info for debugging');
logger.info('General operational info');
logger.warn('Warning, not critical');
logger.error('Error that needs attention');
logger.fatal('Critical error, app may crash');
```

### Context
Always include relevant context:
```typescript
logger.info('Job started', {
  jobId: job.id,
  userId: job.userId,
  provider: job.provider,
});
```

### Sensitive Data
- Never log passwords, tokens, or API keys
- Redact PII (personally identifiable information)
- Use safe serializers

## PHP/Laravel Logging

### Log Channels
```env
LOG_CHANNEL=stack
LOG_LEVEL=debug
```

### Usage
```php
use Illuminate\Support\Facades\Log;

Log::info('Job completed', ['job_id' => $job->id]);
Log::error('Job failed', ['error' => $e->getMessage()]);
Log::channel('slack')->critical('System down');
```

### Log Structure
```php
[
  'timestamp' => '2024-01-01T00:00:00Z',
  'level' => 'info',
  'message' => 'Job completed',
  'context' => [
    'job_id' => 123,
    'user_id' => 456,
  ],
]
```

## Log Retention

- **Development** — Keep all logs
- **Production** — Rotate daily, keep 7 days
- **Audit logs** — Keep 1 year minimum

## Monitoring

- Set up alerts for error rate spikes
- Monitor log volume
- Use structured logging for easier querying

## When to use this skill

Reference this when:
- Adding new log statements
- Debugging production issues
- Setting up log aggregation
