---
name: laravel
description: Laravel 12 coding standards and best practices
compatibility: opencode
metadata:
  scope: backend
  type: rules
---

# Laravel 12 Coding Standards

## Architecture

### Service Layer
- Keep business logic in `app/Services`
- Controllers handle validation, service calls, and responses only
- Use dependency injection for services

### Models
- Keep models thin
- Use scopes for complex queries
- Use DTOs for complex data passed between controllers and services

### Filament
- Use Filament v5 with `Filament\Schemas\Schema`
- Use `CuratorPicker` for managed media uploads
- Configure permissions with Shield

## Best Practices

### Validation
- Use FormRequest classes for request validation
- Define validation rules in dedicated classes

### Error Handling
- Use `try-catch` for external API calls
- Log failures with `Log::error()`
- Return clear error responses

### Configuration
- Never hardcode values
- Use `config()` helper
- Store secrets in `.env`

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Controllers | `[Name]Controller.php` | `RenderJobController.php` |
| Services | `[Name]Service.php` | `RenderJobService.php` |
| Models | Singular PascalCase | `Project.php`, `User.php` |
| Migrations | Standard Laravel | `2024_01_01_000000_create_projects_table.php` |
| Jobs | `[Action][Entity]` | `ProcessRenderJob.php` |
| Events | `[Entity][Event]` | `JobCompleted.php` |

## Database

- Use Eloquent relationships correctly
- Include timestamps in migrations
- Apply all schema changes via migrations
- Use database transactions for multi-step operations

## Security

- Validate all external input
- Use Laravel built-in protections (CSRF, XSS)
- Protect APIs with correct middleware (`auth:api` for JWT)

## When to use this skill

Reference this when:
- Writing Laravel code
- Reviewing backend PRs
- Setting up new services
