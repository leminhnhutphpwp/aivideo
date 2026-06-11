---
name: realtime-reverb
description: Realtime events via Laravel Reverb (WebSockets)
---

## Reverb Configuration

### Docker Service
```yaml
reverb:
  image: serversideup/php:8.3-fpm-nginx
  command: php artisan reverb:start --host=0.0.0.0 --port=8080
  ports:
    - "8080:8080"
```

### Environment
```env
REVERB_APP_ID=app-id
REVERB_APP_KEY=app-key
REVERB_APP_SECRET=app-secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
```

## Events

### Job Events
- `JobQueued` — Job added to queue
- `JobProgress` — Job progress update (0-100%)
- `JobCompleted` — Job finished successfully
- `JobFailed` — Job failed with error
- `JobCancelled` — Job cancelled by user

### Credits Events
- `CreditsUpdated` — Credit balance changed

## Frontend Integration

### Laravel Echo Client
```typescript
import Echo from 'laravel-echo';

const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.NEXT_PUBLIC_REVERB_KEY,
  wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
  wsPort: process.env.NEXT_PUBLIC_REVERB_PORT,
  forceTLS: false,
});

// Subscribe to user's private channel
echo.private(`users.${userId}`)
  .listen('JobCompleted', (e) => { /* handle */ })
  .listen('JobProgress', (e) => { /* update progress bar */ });
```

## When to use this skill

Reference this when:
- Adding new realtime events
- Debugging WebSocket connections
- Implementing live progress updates
