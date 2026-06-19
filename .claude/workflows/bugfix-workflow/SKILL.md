---
name: bugfix-workflow
description: Bugfix and troubleshooting workflow
compatibility: opencode
metadata:
  scope: global
  type: workflow
---

# Bugfix Workflow

## 1. Reproduce

1. **Get reproduction steps** from user/report
2. **Reproduce locally** — Confirm the bug exists
3. **Check logs** — Look for error messages
4. **Check status** — Review `task-status.md` for known issues

## 2. Investigate

### Check Logs
```bash
# Daemon logs
bash scripts/dev.sh logs daemon

# Backend logs
bash scripts/dev.sh logs backend

# Web logs
bash scripts/dev.sh logs web
```

### Check Status
```bash
bash scripts/dev.sh status all
```

### Common Issues

| Issue | Check | Fix |
|-------|-------|-----|
| Port in use | `lsof -i :3000` | `bash scripts/dev.sh stop` |
| Docker not running | `docker ps` | Start Docker Desktop |
| DB connection | Check `.env` | Verify credentials |
| Migration pending | `php artisan migrate:status` | Run migrations |

## 3. Fix

1. **Identify root cause** — Don't just fix symptoms
2. **Write failing test** — If applicable
3. **Implement fix** — Minimal change
4. **Run tests** — Verify fix works
5. **Typecheck** — No type errors

## 4. Verify

1. **Manual testing** — Reproduce original steps
2. **Automated tests** — Run test suite
3. **Edge cases** — Test related scenarios
4. **Documentation** — Update if behavior changed

## 5. Document

Write worklog in appropriate `worklogs/` directory:
- `backend/worklogs/bugfix-<date>.md`
- `apps/web/worklogs/bugfix-<date>.md`
- `apps/daemon/worklogs/bugfix-<date>.md`

## When to use this skill

Reference this when:
- Debugging reported bugs
- Troubleshooting issues
- Following bugfix procedures
