# OpenCode Configuration

This directory contains OpenCode configuration for AI Video Platform.

## Setup

### Global + Local (Recommended)

Agents are installed both globally and locally for maximum flexibility:

```bash
# Setup (run once)
bash scripts/setup-agents.sh --both

# Now you can:
# 1. Work from root with all agents
cd /var/www/AIVideoPaltfom && opencode

# 2. Work from subfolder with global agents
cd /var/www/AIVideoPaltfom/backend && opencode  # @backend available
cd /var/www/AIVideoPaltfom/apps/web && opencode  # @web available
cd /var/www/AIVideoPaltfom/apps/daemon && opencode  # @daemon available
```

### Locations

| Location | Path | Purpose |
|----------|------|---------|
| **Global** | `~/.config/opencode/` | Available in all projects |
| **Local** | `.opencode/` | Project-specific config |

### Setup Options

```bash
# Global only (available everywhere)
bash scripts/setup-agents.sh --global

# Local only (project-specific)
bash scripts/setup-agents.sh --local

# Both (recommended)
bash scripts/setup-agents.sh --both
```

---

```
.opencode/
├── agents/           # Custom subagents (invoke with @name)
│   ├── coordinator.md    # Master orchestrator
│   ├── backend.md        # Laravel specialist
│   ├── web.md            # Next.js specialist
│   ├── daemon.md         # Express media engine
│   ├── explorer.md       # Read-only codebase analysis
│   └── tester.md         # Testing specialist
│
├── skills/           # Agent skills (reusable behavior)
│   ├── architecture/
│   ├── api-contract-daemon/
│   ├── billing-and-credits/
│   ├── job-lifecycle/
│   ├── realtime-reverb/
│   └── queue-and-jobs/
│
├── rules/            # Coding rules and standards
│   ├── coding-rules/
│   ├── product-scope/
│   ├── laravel/
│   ├── security/
│   ├── testing/
│   ├── logging/
│   └── documentation/     # 🔴 MANDATORY worklog + task-status rules
│
└── workflows/        # Development workflows
    ├── development-workflow/
    ├── bugfix-workflow/
    ├── migration-plan/
    └── release-hardening/
```

## Agents

Custom subagents that can be invoked with `@name` in chat.

| Agent | Description | Scope | Mode |
|-------|-------------|-------|------|
| `@coordinator` | Master orchestrator | Global | Primary |
| `@backend` | Laravel backend specialist | `backend/` | Subagent |
| `@web` | Next.js frontend specialist | `apps/web/` | Subagent |
| `@daemon` | Express media engine | `apps/daemon/` | Subagent |
| `@explorer` | Read-only codebase analysis | Global | Subagent |
| `@tester` | Testing specialist | Global | Subagent |

### Usage

```
@backend Implement forgot password flow
@web Add dark mode toggle to topbar
@daemon Add new provider integration
@explorer Find all JWT authentication code
@tester Write tests for credits system
```

### Invoking Subagents

1. **Manual**: Type `@agent-name` in chat
2. **Automatic**: Primary agents invoke subagents via Task tool
3. **Tab**: Cycle through primary agents (coordinator)

---

## Skills

Skills are loaded on-demand via the `skill` tool. Each skill has:
- YAML frontmatter with `name`, `description`, `compatibility`
- Markdown content with instructions

### Available Skills

| Skill | Description | Scope |
|-------|-------------|-------|
| `architecture` | 3-layer architecture overview | Global |
| `api-contract-daemon` | Laravel↔Daemon API contract | Backend |
| `billing-and-credits` | Billing and credits system | Backend |
| `job-lifecycle` | Render job lifecycle | Backend |
| `realtime-reverb` | Realtime events via Reverb | Backend |
| `queue-and-jobs` | Laravel queue system | Backend |

## Rules

Rules define coding standards and best practices.

| Rule | Description | Scope |
|------|-------------|-------|
| `coding-rules` | General coding rules | Global |
| `product-scope` | Product identity and scope | Global |
| `laravel` | Laravel 12 standards | Backend |
| `security` | Security best practices | Global |
| `testing` | Testing guidelines | Global |
| `logging` | Logging standards | Global |
| `documentation` | 🔴 Worklog & task-status rules | Global |

## Workflows

Workflows define step-by-step processes.

| Workflow | Description | Scope |
|----------|-------------|-------|
| `development-workflow` | General development workflow | Global |
| `bugfix-workflow` | Bugfix and troubleshooting | Global |
| `migration-plan` | Database migrations | Backend |
| `release-hardening` | Release preparation | Global |

## Usage

Agents can load skills using the `skill` tool:

```
skill({ name: "architecture" })
skill({ name: "api-contract-daemon" })
```

## Permissions

Skills permissions can be configured in `opencode.json`:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

## Migration from .agents

This project migrated from `.agents/` to `.opencode/` structure:

| Old Path | New Path |
|----------|----------|
| `.agents/skills/*.md` | `.opencode/skills/*/SKILL.md` |
| `.agents/rules/*.md` | `.opencode/rules/*/SKILL.md` |
| `.agents/workflows/*.md` | `.opencode/workflows/*/SKILL.md` |

## See Also

- [OpenCode Skills Docs](https://opencode.ai/docs/skills/)
- [OpenCode Agents Docs](https://opencode.ai/docs/agents/)
- [OpenCode Rules Docs](https://opencode.ai/docs/rules/)
