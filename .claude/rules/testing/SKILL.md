---
name: testing
description: Testing guidelines for TypeScript and PHP
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Testing Guidelines

## TypeScript Testing

### Framework
- **Vitest** for unit and integration tests
- **React Testing Library** for component tests

### Test Structure
```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    // Test implementation
  });
  
  it('should handle edge cases', () => {
    // Edge case tests
  });
});
```

### Best Practices
- Test user interactions, not implementation details
- Mock external dependencies
- Use descriptive test names
- Keep tests independent

## PHP/Laravel Testing

### PHPUnit + Pest
```php
it('creates a render job', function() {
    $response = $this->postJson('/api/render-jobs', [
        'provider' => 'seedance',
        'prompt' => 'test',
    ]);
    
    $response->assertCreated();
});
```

### Test Types
- **Unit** — Test individual classes/methods
- **Feature** — Test API endpoints
- **Integration** — Test service integration

### Best Practices
- Use factories for test data
- Test happy path and edge cases
- Mock external APIs
- Run tests in CI pipeline

## Coverage Goals

- **Critical paths** — 100% coverage (auth, billing, jobs)
- **Business logic** — 80%+ coverage
- **UI components** — Test key interactions

## 🔴 NEVER clear database during testing

- `migrate:fresh`, `db:wipe`, manual DELETE are FORBIDDEN unless user explicitly asks.
- User accounts, credits, projects are real test data — clearing wastes time.
- Only run `db:seed --class=SpecificSeeder` when adding NEW seed data.
- Target tests: `--filter="RenderJobPipelineTest|RenderJobTest"` (19 tests) — green
- ✅ Full suite (2026-06-19): **447 passed / 1 skipped / 0 failed** — green. Prior drift (70 failed) cleared 2026-06-19. See root `task-status.md` → Test Health and `backend/worklogs/2026-06-19-test-drift-fix-aipromptcompiler.md` before assuming a red suite is your regression.

## Running Tests

```bash
# Daemon TypeScript compile check
cd apps/daemon && npx tsc --noEmit

# Web TypeScript compile check
cd apps/web && npx tsc --noEmit

# PHP/Laravel (inside Docker)
docker exec backend-app-1 php artisan test
docker exec backend-app-1 php artisan test --filter="RenderJobPipelineTest|RenderJobTest"

# Model sync verify
node apps/daemon/scripts/verify-media-models.mjs

# PHP syntax check
cd backend && php -l app/Path/To/File.php
```

## Service Restart after code changes

| Code changed | Command |
|-------------|---------|
| Daemon `src/` | `docker compose -f backend/docker-compose.dev.yml up -d --force-recreate daemon` |
| Daemon `skills/` | Same as above |
| Backend PHP | `bash scripts/dev.sh restart backend` |
| Web `apps/web/` | `bash scripts/dev.sh restart web` |

## When to use this skill

Reference this when:
- Writing new tests
- Setting up test infrastructure
- Reviewing test coverage
- Running tests after code changes
