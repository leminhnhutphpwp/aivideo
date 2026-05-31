---
name: documentation
description: Mandatory worklog and task-status documentation rules for every task
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Documentation Rules — Worklog & Task Status

## 🔴 MANDATORY: After every task, every agent MUST write a worklog

This is a hard rule. Every agent (@backend, @web, @daemon) must write a worklog after completing a task.
No worklog = task not complete.

## Worklog Format

### File Naming
`<scope>/worklogs/<YYYY-MM-DD>-<task-slug>.md`

Examples:
- `backend/worklogs/2025-05-28-forgot-password-flow.md`
- `apps/daemon/worklogs/2025-05-28-add-kling-provider.md`
- `apps/web/worklogs/2025-05-28-landing-page-hero-animation.md`

### Required Template

```markdown
# [Task Name] — Worklog

## Date
YYYY-MM-DD

## Overview
Brief description of what was done (2-3 sentences).

## Files Changed
| File | Change |
|------|--------|
| `path/file.ts` | Description of change |
| `path/file2.ts` | Description of change |

## Key Decisions
1. Decision 1 — Reason
2. Decision 2 — Reason

## Verification
- [ ] TypeScript/Lint: pass / fail
- [ ] Tests: X/Y passed
- [ ] Manual check: (describe manual testing steps)

## Handoff Notes
<!-- Only fill if this task affects other agents -->
- **@backend needs to know**: ...
- **@daemon needs to know**: ...
- **@web needs to know**: ...

## Status
<!-- Choose one -->
✅ Completed | 🔄 In Progress | ⚠️ Blocked (reason)
```

### Writing Rules

1. **1 worklog file per 1 task or 1 session.** Do not merge unrelated tasks into one file.
2. **Write IMMEDIATELY after verify** (typecheck/tests), do not delay.
3. **Handoff Notes** — CRITICAL if task creates new APIs, changes config, or touches multiple layers.
4. **Always run verify before writing** — record verification results in the worklog.
5. **If task is blocked** — still write a worklog, clearly state the blocking reason.

## Task Status Format

### File: `task-status.md` (project root)

This file is maintained by @coordinator or the user. Agents may update their own task entries.

### Template

```markdown
# Task Status — AI Video Platform

> Last updated: YYYY-MM-DD HH:MM

---

## 🔄 Active Tasks

### [Task Name]
- **Status**: 🔄 In Progress
- **Agent**: @backend / @web / @daemon
- **Scope**: backend / web / daemon
- **Started**: YYYY-MM-DD
- **Worklog**: `path/to/worklog.md`
- **Notes**: ...

---

## ✅ Recently Completed

### [Task Name]
- **Completed**: YYYY-MM-DD
- **Agent**: @backend / @web / @daemon
- **Worklog**: `path/to/worklog.md`
- **Verification**: ✅ typecheck + tests passed

---

## 📋 Backlog

### [Task Name]
- **Priority**: 🔴 High / 🟡 Medium / 🟢 Low
- **Scope**: backend / web / daemon
- **Dependencies**: ...
- **Notes**: ...
```

## Agent Requirements

### After completing a task, EVERY agent must:

1. ✅ Run verify (typecheck, tests)
2. ✅ Write worklog to `<scope>/worklogs/`
3. ✅ Update `task-status.md` (if task is not yet listed)
4. ✅ Report results to user

### @coordinator must:

1. ✅ Read `task-status.md` at the start of every session
2. ✅ Read worklogs in `<scope>/worklogs/` before planning tasks
3. ✅ After delegating a task and task completes, verify worklog was written
4. ✅ Update `task-status.md` when task status changes

## When to use this rule

Applies to ALL TASKS, no exceptions. This is a foundational project rule.
