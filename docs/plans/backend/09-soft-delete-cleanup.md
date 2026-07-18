# Soft Delete & Cleanup — Implementation Plan

## 1. Summary

Add `SoftDeletes` to core content models, update Filament resources for trashed record management, and create a scheduled `PruneTrashedRecords` job to permanently purge expired soft-deleted records.

## 2. Model-by-Model Analysis

### 2.1 User
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | `email` (unique index), `uuid` (unique index), `username` (unique index) |
| Uniqueness risk | Soft-deleting user A (`email@a.com`) blocks new registration with same email |
| Relationships | hasMany(RenderJob, Asset, Storyboard, CreditTransaction, etc.) |
| **Verdict** | **YES** — soft delete |
| **Solution for unique email** | Drop the `users_email_unique` index, add a composite unique index on `(email, deleted_at)`. Migration must handle this with raw SQL partial unique index (MySQL 8.0.13+). |

### 2.2 Storyboard
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | `uuid` (unique) |
| Relationships | scenes (cascadeOnDelete), references (cascadeOnDelete) |
| **Verdict** | **YES** — soft delete |
| **Cascade** | Scenes + References should also soft-delete when storyboard is soft-deleted |
| **Note** | The `booted()` `deleting` event manually iterates scenes/references and calls `->delete()` — must be changed to use SoftDeletes on children instead |

### 2.3 StoryboardScene
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | `(storyboard_id, scene_number)` composite unique |
| Uniqueness risk | A new scene in same storyboard could conflict with soft-deleted scene's number |
| Self-referencing | `parent_scene_id` FK to self (nullable) |
| **Verdict** | **YES** — soft delete |
| **Solution for unique constraint** | Drop composite unique, add partial unique index. Or query explicitly filters out trashed scenes. |

### 2.4 StoryboardReference
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | None |
| **Verdict** | **YES** — soft delete |
| **Note** | No unique constraint issues. `asset_id` FK uses `nullOnDelete`, safe. |

### 2.5 RenderJob
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | `uuid` (unique) |
| Relationships | hasMany(Asset, Like) |
| **Verdict** | **YES** — soft delete |
| **Cascade** | Associated Assets can be soft-deleted via `RenderJob` scope, or left orphaned (user should still see assets even if job is deleted). **Recommendation**: do NOT cascade — keep assets accessible for download. |
| **Note** | `daemon_project_id` is NOT unique. |

### 2.6 Asset
| Property | Status |
|---|---|
| `deleted_at` column? | **No** — needs migration |
| Unique constraints | `uuid` (unique) |
| Relationships | belongsTo(User, RenderJob) |
| **Verdict** | **YES** — soft delete |
| **Note** | Physical file cleanup is handled separately (existing `CleanupExpiredAssets` job). Soft delete should NOT delete files — let the cleanup job handle it. |

### 2.7 Plan
| Property | Status |
|---|---|
| `deleted_at` column? | **No** |
| Unique constraints | `slug` (unique) |
| Relationships | hasMany(User) — users have `plan_id` FK |
| Note | Plans are reference/pricing data. Users depend on `plan_id`. Plan snapshot exists in render jobs. |
| **Verdict** | **SKIP** — do NOT soft delete |
| **Reason** | Plans are hand-curated pricing tiers (free, pro, studio). They already have a `status` field (`active`, `coming_soon`, `archived`). Adding soft delete risks FK issues, plan_snapshot inconsistencies, and makes the admin experience worse. Use `status = 'archived'` instead. |

### 2.8 PendingCreditPurchase
| Property | Status |
|---|---|
| `deleted_at` column? | **No** |
| Unique constraints | `transfer_code` (unique) |
| Relationships | belongsTo(User) |
| **Verdict** | **SKIP** — do NOT soft delete |
| **Reason** | Financial audit trail. The model already has a `status` field (`pending`, `paid`, `expired`) that serves as the lifecycle state. Hard-deleting financial records is also unacceptable. Soft delete provides no benefit here. |

## 3. Migration Files Needed

### 3.1 `xxxx_xx_xx_000001_add_soft_deletes_to_users_table.php`
```php
Schema::table('users', function (Blueprint $table) {
    $table->softDeletes();
});

// Handle unique email constraint for soft deletes
// MySQL 8.0.13+: partial unique index where deleted_at IS NULL
DB::statement('ALTER TABLE users DROP INDEX users_email_unique');
DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_email_unique (email(191), deleted_at)');

// Similarly for username
DB::statement('ALTER TABLE users DROP INDEX users_username_unique');
DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_username_unique (username(191), deleted_at)');
```

### 3.2 `xxxx_xx_xx_000002_add_soft_deletes_to_storyboards_table.php`
```php
Schema::table('storyboards', function (Blueprint $table) {
    $table->softDeletes();
});
```

### 3.3 `xxxx_xx_xx_000003_add_soft_deletes_to_storyboard_scenes_table.php`
```php
Schema::table('storyboard_scenes', function (Blueprint $table) {
    $table->softDeletes();
});

// Handle unique constraint: drop composite unique, add partial unique
$table->dropUnique(['storyboard_id', 'scene_number']);
$table->index(['storyboard_id', 'scene_number']); // plain index, not unique
// Unique enforcement handled at application level or via partial unique index
```

### 3.4 `xxxx_xx_xx_000004_add_soft_deletes_to_storyboard_references_table.php`
```php
Schema::table('storyboard_references', function (Blueprint $table) {
    $table->softDeletes();
});
```

### 3.5 `xxxx_xx_xx_000005_add_soft_deletes_to_render_jobs_table.php`
```php
Schema::table('render_jobs', function (Blueprint $table) {
    $table->softDeletes();
});
```

### 3.6 `xxxx_xx_xx_000006_add_soft_deletes_to_assets_table.php`
```php
Schema::table('assets', function (Blueprint $table) {
    $table->softDeletes();
});
```

## 4. Model Changes

### 4.1 User (`app/Models/User.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles, LogsActivity, SoftDeletes;
    // ...
}
```

### 4.2 Storyboard (`app/Models/Storyboard.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Storyboard extends Model
{
    use SoftDeletes;

    // CHANGE the booted deleting event — it manually deletes children.
    // Instead, use `deleting` to soft-delete children, OR rely on DB-level cascade.
    // Since we changed to SoftDeletes, we need to update the event:
    protected static function booted(): void
    {
        static::creating(function ($storyboard) {
            $storyboard->uuid ??= (string) Str::uuid();
        });

        static::deleting(function ($storyboard) {
            if (!$storyboard->isForceDeleting()) {
                $storyboard->scenes()->delete();  // soft-deletes children
                $storyboard->references()->delete(); // soft-deletes children
            }
        });
    }
}
```

### 4.3 StoryboardScene (`app/Models/StoryboardScene.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class StoryboardScene extends Model
{
    use SoftDeletes;
    // ...
}
```

### 4.4 StoryboardReference (`app/Models/StoryboardReference.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class StoryboardReference extends Model
{
    use SoftDeletes;
    // ...
}
```

### 4.5 RenderJob (`app/Models/RenderJob.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class RenderJob extends Model
{
    use SoftDeletes;
    // ...
}
```

### 4.6 Asset (`app/Models/Asset.php`)
```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use SoftDeletes;
    // ...
}
```

### 4.7 Relationship Updates

**Storyboard → scenes**: No change needed. `$this->hasMany(StoryboardScene::class)` automatically filters out soft-deleted scenes when `SoftDeletes` trait is present on StoryboardScene.

**Storyboard → references**: Same as above.

**User → renderJobs**: No change. SoftDeletes on User means `$user->renderJobs()` excludes soft-deleted RenderJobs (if the RenderJob itself uses SoftDeletes, which it does). If we want to include soft-deleted RenderJobs when querying from User, we'd use `$user->renderJobs()->withTrashed()`.

## 5. Filament Resource Changes

### 5.1 UserResource (`app/Filament/Resources/UserResource.php`)

The `table()` method currently uses `Actions\DeleteBulkAction`. Changes needed:

- **Table filters**: Add `->trashed()` filter to allow admins to see soft-deleted users
- **Restore action**: Add per-row action to restore trashed users
- **Force delete**: Add option/action for permanent deletion
- **Bulk actions**: Keep `DeleteBulkAction` (it soft-deletes when SoftDeletes is present). Add `ForceDeleteBulkAction` and `RestoreBulkAction`.

```php
use Filament\Tables\Filters\TrashedFilter;

// In table() method:
->filters([
    TrashedFilter::make(),
    // ... existing filters
])

->actions([
    // ...existing actions
    \Filament\Actions\RestoreAction::make()->label('Khôi phục'),
    \Filament\Actions\ForceDeleteAction::make()->label('Xoá vĩnh viễn'),
])

->bulkActions([
    \Filament\Actions\BulkActionGroup::make([
        // ...existing bulk actions
        \Filament\Actions\DeleteBulkAction::make()->label('Xoá đã chọn'),
        \Filament\Actions\RestoreBulkAction::make()->label('Khôi phục đã chọn'),
        \Filament\Actions\ForceDeleteBulkAction::make()->label('Xoá vĩnh viễn'),
    ]),
])
```

### 5.2 RenderJobResource (`app/Filament/Resources/RenderJobResource.php`)

Same pattern as UserResource:
- Add `TrashedFilter::make()` to filters
- Add `RestoreAction` + `ForceDeleteAction` to actions array
- Add `RestoreBulkAction` + `ForceDeleteBulkAction` to bulk actions

Note: The existing `DeleteAction` and `DeleteBulkAction` already work with SoftDeletes — they become soft deletes.

### 5.3 AssetResource (`app/Filament/Resources/AssetResource.php`)

Same pattern. Also note:
- The `deleteAssetWithFiles()` helper method currently calls `$asset->delete()` then also deletes physical files. With SoftDeletes, this method must be updated:
  - For soft delete: do NOT delete physical files. Only set `deleted_at`.
  - For force delete: delete physical files AND the DB record.

**Recommendation**: Split into two actions:
- `DeleteAction`: soft-deletes (just sets `deleted_at`), keeps files
- `ForceDeleteAction`: hard-deletes both DB record AND physical files

### 5.4 PlanResource

No changes — Plan is NOT getting soft delete.

### 5.5 PendingCreditPurchaseResource

No changes — PendingCreditPurchase is NOT getting soft delete.

### 5.6 Other Resources (no soft delete changes needed)

- PlanUpgradeResource, CreditTransactionResource, NotificationResource, EmailLogs, ActivityLogs, RegistrationLogs, WhitelistIp, BlockedIp, CreditSettings, EmailTemplates, QualityTiers, ProviderPricing — these are not getting soft delete.

## 6. Cleanup Job: PruneTrashedRecords

### 6.1 Config: `config/soft-delete.php`

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Soft Delete Pruning Configuration
    |--------------------------------------------------------------------------
    |
    | Define the TTL (in days) for each model. Records that have been
    | soft-deleted for longer than the TTL will be permanently deleted
    | by the PruneTrashedRecords command.
    |
    | Set to 0 or null to disable pruning for a specific model.
    |
    */

    'ttl' => [
        App\Models\User::class => 30,
        App\Models\Storyboard::class => 30,
        App\Models\StoryboardScene::class => 30,
        App\Models\StoryboardReference::class => 30,
        App\Models\RenderJob::class => 30,
        App\Models\Asset::class => 30,
    ],

    /*
    |--------------------------------------------------------------------------
    | Batch Size
    |--------------------------------------------------------------------------
    |
    | How many records to prune per batch to avoid long-running queries.
    |
    */
    'batch_size' => 100,

    /*
    |--------------------------------------------------------------------------
    | Log Channel
    |--------------------------------------------------------------------------
    |
    | Where to log pruning activity. Null uses the default log channel.
    |
    */
    'log_channel' => null,
];
```

### 6.2 Command: `app/Console/Commands/PruneTrashedRecords.php`

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PruneTrashedRecords extends Command
{
    protected $signature = 'model:prune-trashed
        {--model= : Prune only a specific model class}
        {--dry-run : Only count, don\'t delete}';

    protected $description = 'Permanently delete soft-deleted records past their TTL';

    public function handle(): int
    {
        $config = config('soft-delete.ttl', []);
        $batchSize = config('soft-delete.batch_size', 100);
        $logChannel = config('soft-delete.log_channel');
        $dryRun = $this->option('dry-run');
        $specificModel = $this->option('model');

        $logger = $logChannel ? Log::channel($logChannel) : Log::stack(config('logging.channels'));

        $totalPruned = 0;

        foreach ($config as $modelClass => $ttlDays) {
            if ($specificModel && $modelClass !== $specificModel) {
                continue;
            }

            if ($ttlDays <= 0) {
                continue;
            }

            if (!class_exists($modelClass) || !in_array('Illuminate\Database\Eloquent\SoftDeletes', class_uses($modelClass))) {
                continue;
            }

            $cutoff = now()->subDays($ttlDays);
            $query = $modelClass::onlyTrashed()->where('deleted_at', '<=', $cutoff);
            $count = $query->count();

            if ($count === 0) {
                continue;
            }

            $this->info("[{$modelClass}] {$count} record(s) past {$ttlDays} day TTL (before {$cutoff->toDateTimeString()})");

            $logger->info('Pruning soft-deleted records', [
                'model' => $modelClass,
                'count' => $count,
                'ttl_days' => $ttlDays,
                'cutoff' => $cutoff->toDateTimeString(),
                'dry_run' => $dryRun,
            ]);

            if (!$dryRun) {
                $pruned = 0;
                $query->chunkById($batchSize, function ($records) use ($modelClass, &$pruned, $logger) {
                    foreach ($records as $record) {
                        try {
                            DB::beginTransaction();
                            
                            // For models with children that cascade force-delete:
                            // If Storyboard has SoftDeletes, scenes/references cascade on force delete
                            if (method_exists($record, 'forceDelete')) {
                                $record->forceDelete();
                            } else {
                                $record->delete();
                            }
                            
                            DB::commit();
                            $pruned++;
                        } catch (\Throwable $e) {
                            DB::rollBack();
                            $logger->error('Failed to prune record', [
                                'model' => $modelClass,
                                'id' => $record->id,
                                'error' => $e->getMessage(),
                            ]);
                            $this->error("  Failed to prune {$modelClass}#{$record->id}: {$e->getMessage()}");
                        }
                    }
                });

                $totalPruned += $pruned;
                $this->info("  Pruned {$pruned} record(s)");
                $logger->info('Pruned records', [
                    'model' => $modelClass,
                    'count' => $pruned,
                ]);
            }
        }

        if ($dryRun) {
            $this->info('Dry run complete — no records were pruned.');
        } else {
            $this->info("Done. Total pruned: {$totalPruned}");
            $logger->info('Pruning cycle complete', ['total_pruned' => $totalPruned]);
        }

        return Command::SUCCESS;
    }
}
```

### 6.3 Register Scheduler

In `routes/console.php`:
```php
Schedule::command('model:prune-trashed')->dailyAt('02:00');
```

## 7. API Controller Changes

The key question: When a model uses `SoftDeletes`, all Eloquent queries automatically exclude trashed records via `WHERE deleted_at IS NULL`. For API controllers that fetch records by user ownership, this is the **desired behavior** — users should NOT see trashed records in their lists.

### 7.1 StoryboardController (`app/Http/Controllers/API/StoryboardController.php`)

| Method | Model Resolution | Change Needed |
|---|---|---|
| `index()` | `$request->user()->storyboards()` | **No change** — auto-filters trashed |
| `show()` | Route-model binding `Storyboard $storyboard` | **No change** — 404 if trashed |
| `update()` | Route-model binding | **No change** — can't update trashed |
| `destroy()` | Route-model binding → `$storyboard->delete()` | **No change** — becomes soft-delete |
| `render()` | Route-model binding | **No change** |
| `analyze()` | Route-model binding | **No change** |
| `download()` | Route-model binding | **No change** |
| `retry()` | Route-model binding | **No change** |
| `cancel()` | Route-model binding | **No change** |
| `addVoiceover()` | Route-model binding | **No change** |
| `compilePrompt()` | Route-model binding | **No change** |
| `generateMultiPanelImage()` | Route-model binding | **No change** |

**Implicit binding concern**: If we want admins to access trashed storyboards via API, we'd need `Storyboard::withTrashed()->where('uuid', $uuid)->first()`. But this is likely not needed — admins use Filament, not API.

**Note**: The `destroy()` method also calls `$this->creditService->releaseStoryboardReserved($storyboard)` and `$this->daemonClient->deleteProject(...)`. These should still run on soft delete. The `deleting` model event is the right place for that cleanup.

**Move Daemon cleanup to model event**: Move the daemon project deletion from the controller's `destroy()` to the Storyboard model's `deleting` event:

```php
static::deleting(function ($storyboard) {
    // Clean up daemon project if exists and not force-deleting
    if (!$storyboard->isForceDeleting() && $storyboard->daemon_project_id) {
        try {
            app(\App\Services\DaemonClient::class)->deleteProject($storyboard->daemon_project_id);
        } catch (\Throwable $e) {
            // Non-critical
        }
    }

    // Soft-delete children
    if (!$storyboard->isForceDeleting()) {
        $storyboard->scenes()->delete();
        $storyboard->references()->delete();
    }
});
```

### 7.2 RenderJobController (`app/Http/Controllers/API/RenderJobController.php`)

| Method | Change Needed |
|---|---|
| `index()` | `$request->user()->renderJobs()` — **No change** |
| `show()` | Route-model binding — **No change** |
| `destroy()` | `$renderJob->delete()` — **No change**, becomes soft-delete |
| `cancel()` | No delete involved — **No change** |
| `retry()` | No delete involved — **No change** |

### 7.3 AssetController (`app/Http/Controllers/API/AssetController.php`)

| Method | Change Needed |
|---|---|
| `index()` | `$request->user()->assets()->where(...)` — **No change** |
| `show()` | Route-model binding — **No change** |
| `download()` | Route-model binding — **No change** |
| `destroy()` | `$asset->delete()` — **No change**, becomes soft-delete |

**Critical**: The `destroy()` method in AssetController currently deletes physical files. With soft deletes, calling `$asset->delete()` (soft) should NOT delete files. Only force-delete should clean up files.

### 7.4 UserController (`app/Http/Controllers/API/UserController.php`)

| Method | Change Needed |
|---|---|
| `index()` | `User::query()` — **No change** (excludes trashed) |
| `show()` | Route-model binding — **No change** |
| `update()` | Route-model binding — **No change** |
| `store()` | Creating a user — **Watch out**: email uniqueness. If user soft-deleted with same email, `unique:users` validation will pass but the DB unique constraint will fail. Need to add `->whereNull('deleted_at')` to validation or handle `QueryException`. |

### 7.5 CreditController (`app/Http/Controllers/API/CreditController.php`)

- `pendingPurchases()`: `PendingCreditPurchase::where(...)` — Not affected (no soft delete on this model).
- `purchase()`: Creating a `PendingCreditPurchase` — Not affected.
- `upgrade()`: `Plan::where(...)` — Not affected (Plan doesn't use SoftDeletes).

## 8. Other Impacted Files

### 8.1 `CleanupOrphanDaemonProjects.php` (`app/Console/Commands/CleanupOrphanDaemonProjects.php`)

Line 57: `RenderJob::where('daemon_project_id', $projectId)->exists()`

This checks if any RenderJob references a daemon project. With SoftDeletes, this would miss soft-deleted RenderJobs. If a RenderJob was soft-deleted, its daemon project might not be in use, but the command should still consider it.

**Fix**: Use `RenderJob::withTrashed()->where(...)->exists()`.

### 8.2 Asset `isExpired()` (`app/Models/Asset.php`)

The `isExpired()` method checks `$this->created_at->diffInDays(now()) > 30`. This still works fine with soft deletes — a soft-deleted asset is still "expired".

## 9. Test Plan

### 9.1 Unit / Feature Tests

| Test | Description |
|---|---|
| `UserSoftDeleteTest` | Soft-delete user, verify hidden from API, verify email unique constraint with deleted user |
| `StoryboardSoftDeleteCascadeTest` | Soft-delete storyboard, verify scenes & references also soft-deleted |
| `RenderJobSoftDeleteTest` | Soft-delete render job, verify assets NOT deleted |
| `AssetSoftDeleteTest` | Soft-delete asset, verify file NOT deleted, API index excludes it |
| `PruneTrashedRecordsCommandTest` | Run command with dry-run, verify counts. Run with force, verify records permanently deleted after TTL |
| `CleanupOrphanDaemonProjectsWithSoftDeleteTest` | Verify withTrashed() fix works |
| `FilamentTrashedFilterTest` | (Optionally, via browser test) Verify admin can see/filter trashed records |

### 9.2 Edge Cases

- **Restore cascade**: If a storyboard is restored, should scenes/references also restore? **No** — Laravel's `SoftDeletes` does not auto-restore related soft-deleted records. The plan recommends manual restore handling only via Filament per-model.
- **Unique constraint after restore**: Restoring a user with `email@a.com` when another user now has `email@a.com` (because the soft-deleted user freed it) — this would fail. Solution: handle in restore action by appending a timestamp to the email if duplicate exists.
- **Force delete cascade**: When force-deleting a Storyboard (via `forceDelete()`), scenes and references should also be force-deleted. The `deleting` event with `isForceDeleting()` guard handles this.

## 10. Implementation Order

| Step | Task | Files |
|---|---|---|
| 1 | Create config file | `config/soft-delete.php` |
| 2 | Create migration: add `deleted_at` to `users` + handle unique indexes | `database/migrations/..._add_soft_deletes_to_users_table.php` |
| 3 | Create migration: add `deleted_at` to `storyboards` | `database/migrations/..._add_soft_deletes_to_storyboards_table.php` |
| 4 | Create migration: add `deleted_at` to `storyboard_scenes` + handle unique constraint | `database/migrations/..._add_soft_deletes_to_storyboard_scenes_table.php` |
| 5 | Create migration: add `deleted_at` to `storyboard_references` | `database/migrations/..._add_soft_deletes_to_storyboard_references_table.php` |
| 6 | Create migration: add `deleted_at` to `render_jobs` | `database/migrations/..._add_soft_deletes_to_render_jobs_table.php` |
| 7 | Create migration: add `deleted_at` to `assets` | `database/migrations/..._add_soft_deletes_to_assets_table.php` |
| 8 | Add `SoftDeletes` trait to `User` model | `app/Models/User.php` |
| 9 | Add `SoftDeletes` trait to `Storyboard` model + update `booted()` deleting event | `app/Models/Storyboard.php` |
| 10 | Add `SoftDeletes` trait to `StoryboardScene` model | `app/Models/StoryboardScene.php` |
| 11 | Add `SoftDeletes` trait to `StoryboardReference` model | `app/Models/StoryboardReference.php` |
| 12 | Add `SoftDeletes` trait to `RenderJob` model | `app/Models/RenderJob.php` |
| 13 | Add `SoftDeletes` trait to `Asset` model | `app/Models/Asset.php` |
| 14 | Create `PruneTrashedRecords` command | `app/Console/Commands/PruneTrashedRecords.php` |
| 15 | Register scheduler command | `routes/console.php` |
| 16 | Update `UserResource` — add trashed filter, restore/force-delete actions | `app/Filament/Resources/UserResource.php` |
| 17 | Update `RenderJobResource` — same as above | `app/Filament/Resources/RenderJobResource.php` |
| 18 | Update `AssetResource` — same as above, handle physical file deletion | `app/Filament/Resources/AssetResource.php` |
| 19 | Update `CleanupOrphanDaemonProjects` — add `withTrashed()` | `app/Console/Commands/CleanupOrphanDaemonProjects.php` |
| 20 | Move daemon project cleanup from StoryboardController to model event | `app/Models/Storyboard.php`, `app/Http/Controllers/API/StoryboardController.php` |
| 21 | Write tests | `tests/Feature/SoftDeleteTest.php`, `tests/Feature/PruneTrashedTest.php` |
| 22 | Run migrations, tests, verify | — |

## 11. Self-Review: Concerns & Edge Cases

### ⚠️ Concern 1: Storyboard `deleting` event already manually deletes scenes

The current `booted()` in Storyboard:
```php
static::deleting(function ($storyboard) {
    $storyboard->scenes()->each(fn ($scene) => $scene->delete());
    $storyboard->references()->each(fn ($ref) => $ref->delete());
});
```

This calls `->delete()` on each scene/reference. With `SoftDeletes`, this becomes a soft-delete call. The `->each()` approach is fine but should be updated to use the query builder (`->delete()`) for efficiency, and to guard against force-deleting:

```php
static::deleting(function ($storyboard) {
    if (!$storyboard->isForceDeleting()) {
        $storyboard->scenes()->delete();
        $storyboard->references()->delete();
    }
});
```

### ⚠️ Concern 2: User email uniqueness

If user A is soft-deleted and a new user registers with the same email, the `unique` validation will pass (because it doesn't check soft-deleted records by default), but the DB insert will hit the unique constraint. 

**Solution**: Modify validation rules in `UserController::store()` and `UserController::update()` to exclude soft-deleted records, or handle the DB exception and return a clear error.

Better: Keep the partial unique index on `(email, deleted_at)` and modify the `unique` validation to include a `whereNull('deleted_at')` clause. Laravel's `Rule::unique('users', 'email')->whereNull('deleted_at')` works with the `Illuminate\Validation\Rule` class.

### ⚠️ Concern 3: StoryboardScene composite unique `(storyboard_id, scene_number)`

If scene 1 of storyboard 5 is soft-deleted, and the user adds a new scene 1, the DB-level unique constraint will fail.

**Solution**: Drop the unique constraint and use a plain index. Enforce uniqueness at the application level by querying `scenes()->withTrashed()->where('scene_number', $num)->doesntExist()` before creating.

### ⚠️ Concern 4: Asset physical files on soft delete

The `AssetController::destroy()` and `AssetResource::deleteAssetWithFiles()` both delete physical files. After soft delete:
- `$asset->delete()` should NOT delete files (only mark as deleted)
- Only force-delete should actually remove files

The `AssetResource` already uses a custom `deleteAssetWithFiles()` method that does `$asset->delete()` after deleting files. This needs to be split into two actions.

### ⚠️ Concern 5: `Plan` and `PendingCreditPurchase` — skipped

Verified: `Plan` has a `status` field (`active`, `coming_soon`, `archived`) that serves as a soft-delete-like mechanism. `PendingCreditPurchase` also has `status` (`pending`, `paid`, `expired`). Both are reference/financial data where soft delete offers no benefit and introduces risk. These are correctly skipped.

### ⚠️ Concern 6: `Subscription` — not included

Subscriptions are not in the original list. They depend on Plan (FK) and User (FK). If a Plan is never soft-deleted (correct), subscriptions are fine. If a User is soft-deleted, should subscriptions track this? **Recommendation**: Subscription is fine as-is — it references `user_id` which will still point to the soft-deleted user record. The subscription's own data (status, dates) handles lifecycle.

### ⚠️ Concern 7: `CreditTransaction` — not included

Transactions are financial audit data. They reference `user_id`, `render_job_id`, `storyboard_id`. Even if those records are soft-deleted, the transaction record is still valid — it just references a "deleted" record. **Recommendation**: Do NOT soft-delete CreditTransaction. This is financial immutable audit data.

## 12. Summary Table

| Model | Soft Delete? | Migration | Model Trait | Filament Updates | Cascade | Unique Issue |
|---|---|---|---|---|---|---|
| User | **Yes** | `deleted_at`, fix unique indexes | `SoftDeletes` | Trashed filter, restore, force-delete | — | email/username |
| Storyboard | **Yes** | `deleted_at` | `SoftDeletes` + update `booted()` | Trashed filter, restore, force-delete | scenes, references | — |
| StoryboardScene | **Yes** | `deleted_at`, fix unique | `SoftDeletes` | Trashed filter, restore, force-delete | — | (storyboard_id, scene_number) |
| StoryboardReference | **Yes** | `deleted_at` | `SoftDeletes` | Trashed filter, restore, force-delete | — | — |
| RenderJob | **Yes** | `deleted_at` | `SoftDeletes` | Trashed filter, restore, force-delete | — | — |
| Asset | **Yes** | `deleted_at` | `SoftDeletes` | Trashed filter, restore, force-delete, fix `deleteAssetWithFiles` | — | — |
| Plan | **No** | — | — | — | — | — |
| PendingCreditPurchase | **No** | — | — | — | — | — |
