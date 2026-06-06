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

### Filament v5 Conventions

**Imports & Namespace Resolution:**
- ALWAYS use explicit `use` imports for Filament classes — never rely on relative namespace resolution
- Use bare class names after `use` imports (e.g., `Action::make(...)`) not `Actions\Action::make(...)`
  - `Filament\Actions\Action`, `Filament\Actions\BulkActionGroup`, `Filament\Actions\DeleteBulkAction` (v5 — NOT `Filament\Tables\Actions\*`)
  - `Filament\Forms\Components\*` for form fields
  - `Filament\Tables\Columns\*` for table columns
  - `Filament\Tables\Filters\*` for table filters
  - `Filament\Schemas\Components\*` for layout components (Tabs, Section, Group)

**Badge Colors — Use `color()` with `match`, NOT `colors()`:**
```php
// ✅ CORRECT
TextColumn::make('status')
    ->badge()
    ->color(fn (string $state): string => match ($state) {
        'draft' => 'gray',
        'completed' => 'success',
        'failed' => 'danger',
        default => 'gray',
    })
    ->formatStateUsing(fn (string $state): string => match ($state) {
        'draft' => 'Nháp',
        'completed' => 'Hoàn thành',
        default => $state,
    })

// ❌ WRONG — `colors()` array syntax does not work reliably in v5
```

**Resource Form with Tabs:**
```php
use Filament\Schemas\Components;

Components\Tabs::make('form_name')
    ->tabs([
        Components\Tabs\Tab::make('Tab title')
            ->icon('heroicon-o-xxx')
            ->schema([
                Components\Section::make('Section title')
                    ->schema([
                        // form fields
                    ]),
            ]),
    ])->columnSpanFull(),
```

**Settings Page with Tabs** (extends `SettingsPage`):
```php
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;

Tabs::make('SettingsTabs')
    ->columnSpanFull()
    ->tabs([
        Tab::make('tab_id')
            ->label('Label')
            ->schema([
                Section::make('...')->schema([...]),
            ]),
    ]),
```

**Table Actions:**
- Use `Filament\Actions\Action` for row actions (NOT `Tables\Actions`)
- Use `Filament\Actions\BulkActionGroup` and `Filament\Actions\DeleteBulkAction` for bulk actions

**Resource Registration:**
- Register resources via `->discoverResources()` in PanelProvider (auto-discovers classes under `app/Filament/Resources/`)
- Subdirectory resources (e.g., `Resources/StoryboardResource/StoryboardResource.php`) get compound route slugs. Override with `getSlug()`:
```php
public static function getSlug(?Panel $panel = null): string
{
    return 'storyboards';
}
```
- Use `StoryboardResource::getUrl('page', ['record' => $record])` NOT `route('filament...')`

**Other:**
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
