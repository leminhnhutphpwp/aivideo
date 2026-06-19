---
name: context-efficiency
description: Read project docs/code in a targeted, per-task way — never bulk-read the repo
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Context Efficiency — Read Targeted, Not Everything

The repo is large (3 layers, 74+ worklogs, dozens of plans). Reading broadly "to be safe"
wastes context and slows every task. Default to the **smallest set of docs/files that
answers the task**, and expand only when a specific gap forces it.

## The reading order (cheapest first)

1. **`task-status.md`** (root) — always the entry point for "what's going on". It is the
   *selective* index of current work. Do **not** read `HISTORY.md` (archived) unless you are
   explicitly researching a past task.
2. **The "Feature → where to look" table in root `CLAUDE.md` / `AGENTS.md`** — maps a feature
   to its 1–3 primary files/skills. Start there instead of guessing.
3. **CodeGraph (`codegraph_*`) for structural questions** — symbol defs, callers, callees,
   impact. Far cheaper than reading whole files. Grep/Glob are the next fallback.
4. **Grep/Glob to locate**, then **read only the relevant range** — not the whole file —
   unless the file is short or you genuinely need all of it.
5. **Load a Skill** (`api-contract-daemon`, `billing-and-credits`, `queue-and-jobs`, …) only
   when its "When to use" matches. One skill, not all of them.

## Hard rules

- **Stay in your layer.** backend/ work reads `backend/` + `backend/AGENTS.md`; same for
  `apps/web/` and `apps/daemon/`. Don't read other layers unless the task is cross-cutting.
- **Worklogs = the 3 most recent in your scope, or the last ~7 days** — whichever is smaller.
  "Check recent worklogs" never means read all 74. Grep them by keyword if you need a
  specific past change.
- **Plans: open the one file, not the folder.** Browse `docs/plans/active/<area>/` (or
  `completed/` for shipped work) and open the single relevant `.md`. Don't bulk-read a dir.
- **Don't re-read what's already in context** (AGENTS.md, loaded skills, files you just
  edited).
- **Prefer search over read for a single fact** — if you know the symbol/flag/value, grep it;
  don't open the file to "have context".

## When to read more

Escalate deliberately, not pre-emptively: a failing assumption, a cross-layer change, or a
contract you must not break (API contract, pricing, webhook HMAC) justifies pulling the
matching skill/plan. State *why* you're widening the read.

## When to use this skill

Reference this at the **start of any task** to decide what to read, and whenever you feel the
urge to "read everything first". Pairs with `.opencode/workflows/development` (task-type
routing) and the `AGENTS.md` feature map.
