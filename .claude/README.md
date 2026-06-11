# .claude — Claude Code Configuration

Knowledge base for **Claude Code CLI**, cloned and adapted from `.opencode/`.
Same content, formatted so Claude Code reads it natively.

> Source of truth for project context is the root **`CLAUDE.md`** (auto-loaded every session).
> This folder holds the deeper, on-demand material that `CLAUDE.md` points to.

## Layout

```
.claude/
├── agents/        # Subagents — invoke via the Task tool (subagent_type: <name>)
│   ├── coordinator.md   # Master orchestrator / delegator
│   ├── backend.md       # Laravel specialist (backend/)
│   ├── web.md           # Next.js specialist (apps/web/)
│   ├── daemon.md        # Express media engine (apps/daemon/)
│   ├── planner.md       # Feature planning & task breakdown
│   ├── explorer.md      # Read-only codebase search
│   └── tester.md        # Writes & runs tests
│
├── skills/        # On-demand skills (Skill tool) — SKILL.md per folder
│   ├── architecture/          # 3-layer architecture overview
│   ├── api-contract-daemon/   # Laravel ↔ Daemon API contract
│   ├── billing-and-credits/   # Credits & pricing system
│   ├── job-lifecycle/         # Render job lifecycle
│   ├── queue-and-jobs/        # Laravel queue / Horizon
│   ├── realtime-reverb/       # Realtime events via Reverb
│   ├── planning/              # Planning methodology
│   └── simulation-mode/       # Daemon fake-generation mode
│
├── rules/         # Coding standards (reference docs)
│   ├── coding-rules/   product-scope/   laravel/
│   ├── security/       testing/         logging/
│   └── documentation/  # 🔴 MANDATORY worklog + task-status rules
│
└── workflows/     # Step-by-step processes (reference docs)
    ├── development/   bugfix-workflow/
    ├── migration-plan/   release-hardening/
```

## How Claude Code uses this

| Mechanism | What loads | When |
|-----------|-----------|------|
| `CLAUDE.md` (root) | Always-on project memory | Every session, automatic |
| `.claude/agents/*.md` | Subagent definitions | When you delegate via the Task tool |
| `.claude/skills/*/SKILL.md` | Skill instructions | On demand via the Skill tool |
| `.claude/rules/`, `.claude/workflows/` | Reference docs | Read when relevant (linked from `CLAUDE.md`) |

## Relationship to `.opencode/`

`.opencode/` is the original OpenCode config (agents invoked with `@name`, plus its
own `node_modules`). `.claude/` is a **content clone** with:

- Agent frontmatter converted to Claude Code schema (`name` / `description` / `tools`).
- Skill frontmatter normalized (`name` matches folder, single `description`).
- Internal `.opencode/` path references rewritten to `.claude/`.
- No `node_modules` (not needed by Claude Code).

Keep both in sync if you edit shared guidance, or treat `CLAUDE.md` + `.claude/` as the
canonical set for Claude Code work.
