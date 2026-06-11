---
name: planning
description: Strategic planning, task decomposition, progress tracking, and cross-layer coordination
---

# Planning Skill

## Purpose
Strategic planning, task decomposition, progress tracking, and agent coordination. Used by the @planner agent.

## When to Use
- Designing new features before implementation
- Breaking down complex features into executable tasks
- Coordinating work across multiple agents (backend, web, daemon)
- Tracking progress and identifying blockers

## Planning Methodology

### 1. Feature Analysis
Analyze user requirements and identify:
- Which layers are affected (web/backend/daemon)
- Dependencies between layers
- Existing code that can be reused
- New code that needs to be written

### 2. Research Pattern
For each layer, search the codebase:
- **Web**: Check `apps/web/src/components/` for similar UI patterns
- **Backend**: Check `backend/app/Services/` for similar service patterns
- **Daemon**: Check `apps/daemon/src/` for similar provider/renderer patterns
- Check `docs/plans/` for existing architectural decisions

### 3. Design Document
Create a plan file with:
- Clear user stories
- Data flow diagram (text)
- API contract (endpoints, methods, params)
- Component list with props
- Database migrations if needed
- Edge cases and error handling

### 4. Task Decomposition
Break into independent tasks ordered by:
1. Backend models/migrations
2. Backend API endpoints
3. Daemon integration (if needed)
4. Frontend components
5. Frontend pages
6. Integration testing
7. Polish and edge cases

### 5. Agent Assignment
| Layer | Agent | File Pattern |
|-------|-------|-------------|
| Backend | @backend | `backend/app/**/*.php` |
| Web | @web | `apps/web/src/**/*.{tsx,ts}` |
| Daemon | @daemon | `apps/daemon/src/**/*.ts` |
| Testing | @tester | Run tests, verify flows |

### 6. Progress Tracking
- Update `task-status.md` when tasks start/complete
- Check agent worklogs in `*/worklogs/` for completion evidence
- Re-plan if implementation reveals new information

## Plan Storage
Plans are stored in `docs/plans/` organized by category:
```
docs/plans/
├── storyboard/      # Storyboard feature plans
├── integration/     # Cross-layer integration plans
├── skills/          # Skills system plans
├── ui/              # UI/UX improvement plans
├── performance/     # Optimization plans
├── billing/         # Billing & credits plans
├── api/             # API contract changes
└── roadmap.md       # High-level roadmap
```

## Quality Standards
Every plan must address:
- What happens on success?
- What happens on failure?
- What happens on empty state?
- What happens on loading state?
- How is the user notified of progress?
- How can the user recover from errors?
