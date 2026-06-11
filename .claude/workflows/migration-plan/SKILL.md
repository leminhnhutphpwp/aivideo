---
name: migration-plan
description: Database migration workflow for Laravel
compatibility: opencode
metadata:
  scope: backend
  type: workflow
---

# Migration Workflow

## Creating Migrations

```bash
# Create migration
docker compose exec app php artisan make:migration create_projects_table

# Create model with migration
docker compose exec app php artisan make:model Project -m
```

## Migration Structure

```php
public function up(): void
{
    Schema::create('projects', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained();
        $table->string('name');
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('projects');
}
```

## Running Migrations

### Development
```bash
# Run all migrations
bash scripts/migrate.sh

# Or via docker
docker compose exec app php artisan migrate

# Fresh database
docker compose exec app php artisan migrate:fresh --seed
```

### Production
```bash
# Run migrations (idempotent)
bash scripts/migrate.sh

# Or via docker compose
docker compose exec app php artisan migrate --force
```

## Rollback

```bash
# Rollback last batch
docker compose exec app php artisan migrate:rollback

# Rollback all
docker compose exec app php artisan migrate:rollback --step=5

# Reset and re-run
docker compose exec app php artisan migrate:reset
docker compose exec app php artisan migrate
```

## Seeding

```bash
# Run seeders
docker compose exec app php artisan db:seed

# Run specific seeder
docker compose exec app php artisan db:seed --class=PlanSeeder

# Fresh + seed
docker compose exec app php artisan migrate:fresh --seed
```

## Best Practices

1. **Never edit migrations** — Create new migration for changes
2. **Test rollbacks** — Ensure `down()` works
3. **Batch changes** — Group related migrations
4. **Production safety** — Test migrations on staging first

## When to use this skill

Reference this when:
- Creating database changes
- Running migrations in production
- Managing database schema
