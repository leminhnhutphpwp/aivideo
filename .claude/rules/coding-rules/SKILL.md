---
name: coding-rules
description: General coding rules for all TypeScript and PHP code
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Coding Rules

## TypeScript Rules

1. **Strict mode** — No `any` type allowed
2. **Error handling** — Async functions must handle errors
3. **Named exports** — Prefer named exports over default exports
4. **Typecheck** — Run typecheck before commit
5. **JSDoc** — Document public API with JSDoc
6. **Reliability** — Prefer reliability over breadth

## PHP/Laravel Rules

1. **Type hints** — Use strict parameter and return types
2. **Service layer** — Keep business logic in `app/Services`
3. **Validation** — Use FormRequest classes
4. **Error handling** — Use `try-catch` for external API calls
5. **Configuration** — Never hardcode values, use `config()` and `.env`

## General Rules

1. **Small patches** — Keep changes small and verifiable
2. **Tests** — Add tests for new functionality
3. **Documentation** — Update docs when behavior changes
4. **No secrets** — Never commit secrets or keys
5. **Vietnamese locale** — UI text in Vietnamese

## When to use this skill

Reference this when:
- Writing new code
- Reviewing code quality
- Setting up linting/typecheck
