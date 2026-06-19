---
name: release-hardening
description: Release preparation and hardening workflow
compatibility: opencode
metadata:
  scope: global
  type: workflow
---

# Release Hardening Workflow

## Pre-Release Checklist

### Code Quality
- [ ] All tests passing
- [ ] Typecheck clean
- [ ] Lint clean
- [ ] No console.log in production code

### Documentation
- [ ] Update `task-status.md` with latest changes
- [ ] Update `CHANGELOG.md` with version notes
- [ ] Update API docs if endpoints changed
- [ ] Review `.claude/` skills for accuracy

### Security
- [ ] No secrets in code
- [ ] Environment variables documented
- [ ] Rate limits configured
- [ ] CORS configured for production

### Performance
- [ ] Database queries optimized (N+1 check)
- [ ] Assets optimized
- [ ] Caching configured
- [ ] Memory leaks checked

## Release Steps

### 1. Version Bump
```bash
# Tag release
git tag -a v1.2.3 -m "Release v1.2.3"
```

### 2. Deploy
```bash
# Run production deploy
bash scripts/deploy.sh v1.2.3
```

### 3. Health Checks
```bash
# Check all services
curl http://localhost:8000/api/health
curl http://localhost:7456/api/health
curl http://localhost:3000
```

### 4. Monitor
- Watch error rates
- Check response times
- Monitor queue depth
- Verify webhook callbacks

## Rollback Plan

```bash
# Stop current deployment
docker compose -f backend/docker-compose.yml down

# Checkout previous version
git checkout v1.2.2

# Deploy previous version
bash scripts/deploy.sh v1.2.2
```

## Post-Release

1. **Monitor for 24 hours** — Watch for issues
2. **Update roadmap** — Mark completed features
3. **Write worklog** — Document release process
4. **Gather feedback** — User reports, analytics

## When to use this skill

Reference this when:
- Preparing production releases
- Hardening before deployment
- Creating rollback plans
