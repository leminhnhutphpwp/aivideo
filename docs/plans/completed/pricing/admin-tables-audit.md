> [!WARNING]
> **TÀI LIỆU CŨ / LEGACY DOCUMENT**
> Tài liệu này mô tả kiến trúc định giá dựa trên `QualityTier` và `ProviderPricing` cũ. 
> Hiện tại, hệ thống đã được tái cấu trúc để **hợp nhất toàn bộ cấu hình Model & Provider trực tiếp vào từng Gói dịch vụ (Plan)**.
> Vui lòng tham khảo thiết kế mới tại: [rearchitect_plan_unify_model_and_provider_config.md](file:///home/minhnhut/.gemini/antigravity-cli/brain/834e59c0-9adc-4b27-aaa6-2701513eb03d/rearchitect_plan_unify_model_and_provider_config.md).


# Admin & Tables Audit — Pricing/Credits System

## Date
2026-06-03

## Overview
Comprehensive audit of all admin panels (Filament resources) and database tables related to pricing, credits, and billing. Covers redundancy, admin UX, data integrity, optimization opportunities, and error-prone areas.

## Methodology
- Read all relevant Models (9 total)
- Read all Filament Resources (10 total) + form/table schemas
- Read all relevant migrations (14 total covering plans + pricing)
- Read all seeders (PlanSeeder, CreditSettingsSeeder, PricingSystemSeeder)
- Read PricingCalculator service
- Read daemon models.ts for model_mapping sync check
- Cross-referenced with existing plans in `docs/plans/pricing/` and `docs/plans/billing/`

---

## 1. ✅ What's Good

### 1.1 Plan Credit Auto-Calculation
The `mutateFormDataBeforeSave` / `mutateFormDataBeforeCreate` hooks in PlanResource correctly auto-compute `monthly_credits` = `ceil(price × exchange_rate) + bonus_credits`. An admin cannot create/save a plan without proper credit calculation.

### 1.2 Single Source of Truth for Exchange Rate
`CreditSetting::exchangeRate()` is used consistently across:
- `Plan::getEffectiveCreditsAttribute()`
- `PlanResource` mutation hooks
- `CreditSetting::vndToCredits()` / `creditsToVnd()`
- `PricingCalculator::calculate()` (VND equivalent)

### 1.3 Foreign Key Constraints Properly Set
| FK | Constraint | Status |
|---|---|---|
| `provider_pricings.video_type_id` → `video_types.id` | `cascadeOnDelete` | ✅ |
| `plan_upgrades.from_plan_id` / `to_plan_id` → `plans.id` | implicit | ✅ |
| `plans.quality_tier_id` → `quality_tiers.id` | `nullOnDelete` | ✅ |
| `subscriptions.user_id` → `users.id` | `cascadeOnDelete` | ✅ |
| `subscriptions.plan_id` → `plans.id` | `cascadeOnDelete` | ✅ |
| `pricing_audit_logs.user_id` → `users.id` | `nullOnDelete` | ✅ |
| `credit_transactions.user_id` → `users.id` | FK exists (fixed in `fix_credit_transactions_fk_ondelete`) | ✅ |
| `pending_credit_purchases.user_id` → `users.id` | implicit | ✅ |

### 1.4 ProviderPricing Merged into VideoType
The `VideoTypeForm.php` already has the "Provider Pricing" tab with a Filament Repeater. The standalone `ProviderPricingResource` is hidden via `shouldRegisterNavigation(): return false`. Good progress on the merge plan.

### 1.5 CreditTransactionResource is Read-Only
Correctly designed as a log viewer — no create/edit form, only ViewAction. The "Tặng credits" action is a header action (manual grant), not a CRUD operation on transactions themselves.

### 1.6 PlanUpgradeResource Workflow Clean
The approve/reject actions in PlanUpgradeResource properly handle: marking status, updating user plan, creating subscription record, adding credits, sending email notification — all within a DB transaction.

### 1.7 Model-Mapping UI in QualityTier Form
The `QualityTierForm` uses `ModelSelector::getAvailableModels()` to populate dropdowns for `model_mapping`, dynamically synced with daemon's provider definitions.

---

## 2. ❌ What's Redundant / Problematic (Needs Fixing)

### 2.1 [P0] `plans.monthly_credits` — Stored Column Drifts from Reality

**Problem:** `monthly_credits` is stored in the DB, auto-computed on save, BUT the `effective_credits` accessor re-computes it from price + exchange_rate + bonus_credits without reading the stored value. The system uses the STORED `monthly_credits` (not the computed one) in:
- `PlanUpgradeResource.php` line 135: `$toPlan->monthly_credits > 0`
- `PlanUpgradeResource.php` line 138: `$toPlan->monthly_credits` used for credit grant
- `Plan::toSnapshot()` line 71: `'monthly_credits' => $this->monthly_credits`

This means:
- If `exchange_rate` changes in CreditSettings → ALL plan stored credits become stale
- Old subscriptions get wrong credit amounts when approved by admin
- API responses return stale data

**Fix:** Either (a) replace all `$this->monthly_credits` references with `$this->effective_credits`, or (b) add an accessor that shadows the column: `getMonthlyCreditsAttribute() { return $this->effective_credits; }`

**Effort:** ~30m (search-and-replace + test)

### 2.2 [P0] Dead Tables: `video_type_pricings` + `pricing_addons`

**Tables still in MySQL but completely unreferenced:**

| Table | Created In | Referenced In | Status |
|---|---|---|---|
| `video_type_pricings` | `2026_05_20_131855_create_credit_settings_table.php` | Nowhere | ❌ Dead |
| `pricing_addons` | `2026_05_20_134743_create_pricing_tables.php` | Nowhere (PricingAddon model deleted) | ❌ Dead |

These tables were created in early migrations before the current pricing system was finalized. They take up space and confuse schema reading.

**Fix:** Add a cleanup migration to drop both tables.

**Effort:** ~15m

### 2.3 [P1] Dirty `$fillable` in Plan.php — References Dropped Columns

```php
// Plan.php line 13-16 — THESE COLUMNS WERE DROPPED FROM DB
protected $fillable = [
    'max_duration_seconds',  // ❌ Dropped in 2026_05_22_000002
    'max_resolution',        // ❌ Dropped in 2026_05_22_000002
    'upscale',               // ❌ Dropped in 2026_05_22_000003
    ...
];
```

If any code path calls `Plan::create($data)` or `Plan::update($data)` with these keys, MySQL will throw a `Column not found` error. Currently the Filament form doesn't expose these, but it's a landmine.

**Fix:** Remove from `$fillable`. They're already absent from the form.

**Effort:** ~5m

---

## 3. ⚠️ What Could Be Improved (With Effort)

### 3.1 [P1] Navigation Group Inconsistency

Current state — resources are scattered across 3 groups:

| Resource | Current Group | Should Be |
|---|---|---|
| `PlanResource` | `Video Platform` | `Billing & Credits` |
| `CreditTransactionResource` | `Video Platform` | `Billing & Credits` |
| `CreditSettingResource` | `Billing & Credits` | ← Correct |
| `VideoTypeResource` | `Billing & Credits` | ← Correct |
| `DurationTierResource` | `Billing & Credits` | ← Correct |
| `ResolutionPricingResource` | `Billing & Credits` | ← Correct |
| `QualityTierResource` | `Billing & Credits` | ← Correct |
| `PlanUpgradeResource` | `Hệ thống` | `Billing & Credits` |
| `PendingCreditPurchaseResource` | `Hệ thống` | `Billing & Credits` |

**Problem:** Plans (pricing configuration) are in "Video Platform" while all other pricing tools are in "Billing & Credits". Plan Upgrades and Pending Purchases (both financial operations) are buried in "Hệ thống". An admin managing pricing has to jump between 3 navigation groups.

**Fix:** Move PlanResource, PlanUpgradeResource, PendingCreditPurchaseResource, and CreditTransactionResource all into `navigationGroup = 'Billing & Credits'` with appropriate sort orders.

**Effort:** ~30m

### 3.2 [P1] Missing Admin UIs

| Model | Exists in DB? | Has Filament Resource? | Need? |
|---|---|---|---|
| `Subscription` | ✅ | ❌ | **Medium** — no way to view active subscriptions from admin |
| `PricingPackage` | ✅ | ❌ | **Low** — packages are populated by seeder, rarely changed |
| `PricingAuditLog` | ✅ | ❌ | **Low** — audit trail, could be useful for debugging |
| `ResolutionPricing` | ✅ | ✅ (hidden from nav?) | Let me check... |

Wait, `ResolutionPricingResource` exists at `ResolutionPricings/ResolutionPricingResource.php` with `navigationGroup = 'Billing & Credits'` and `navigationSort = 13`. So it IS visible. Good.

**Missing:**
- `Subscription` — admins can't see who has active subscriptions without querying DB. Important for support/finance.
- `PricingPackage` — exists in DB but no admin UI for management.

**Fix:** Create SubscriptionResource (read-only list + view). PricingPackageResource (optional).

**Effort:** ~2h for Subscription, ~1.5h for PricingPackage

### 3.3 [P2] `exchange_rate` Changes Don't Cascade to Plans

When admin changes `exchange_rate` in Credit Settings, existing plans' stored `monthly_credits` become stale. There's no event/listener to recalculate all plans.

**Fix (lightweight):** Add a `saved` event on `CreditSetting` that dispatches a job to recalculate all plan `monthly_credits` when exchange_rate changes.

**Better fix:** Remove `monthly_credits` as a stored column entirely and use a computed attribute everywhere (see 2.1).

**Effort:** ~1h for event + job; ~2h for full computed attribute migration

### 3.4 [P2] `CreditSetting::exchangeRate()` is Not Cached

Every call to `effective_credits`, `mutateFormDataBeforeSave`, etc. hits the DB. On a page listing 20 plans, this could be 20 extra queries if not eager-loaded.

**Fix:** Add a short-lived cache:
```php
public static function exchangeRate(): float
{
    return Cache::remember('credit_settings.exchange_rate', 300, function () {
        return (float) static::get('exchange_rate', 0.1);
    });
}
```
And clear on save:
```php
protected static function booted(): void
{
    static::saved(fn () => Cache::forget('credit_settings.exchange_rate'));
}
```

**Effort:** ~15m

### 3.5 [P2] `api_rate_limit` Field Missing from Plan Form

The `api_rate_limit` column exists in the DB, is in the fillable array, is used by `ThrottleApiRequests` middleware — but is NOT in the PlanResource form. Admin can't edit it.

**Fix:** Add a `TextInput::make('api_rate_limit')` to the "Giới hạn" tab in PlanResource.

**Effort:** ~10m

### 3.6 [P3] `PricingAuditLog` Table Has No Cleanup Policy

This table logs every pricing calculation. It has no TTL/index on `created_at` for pruning. Could grow unbounded.

**Fix:** Add a model `prunable()` method or scheduled job to delete logs older than 90 days.

**Effort:** ~30m

### 3.7 [P3] Plan Form: `max_concurrent_jobs` Uses TextInput Instead of Select

Currently `max_concurrent_jobs` uses a plain numeric `TextInput`. Could be a `Select` with dropdown options (1, 2, 3, 5, 10, 20) for better UX.

**Effort:** ~5m

---

## 4. Data Integrity Deep Dive

### 4.1 `quality_tiers.model_mapping` ↔ Daemon `models.ts`

**Status:** ⚠️ Manual sync required, documented in AGENTS.md but no automated verification.

The `PricingSystemSeeder` defines model IDs (e.g., `wan2.6-t2v`, `wan2.7-i2v`) in `model_mapping` for each quality tier.
The daemon defines models in `providers.ts` with those same IDs.

**Risk:** If a daemon model is renamed or removed, the seeder entries become stale. The `verify-media-models.mjs` script checks this for daemon models but doesn't cross-check against `model_mapping` values.

**Recommendation:** Extend `verify-media-models.mjs` to:
1. Parse `PricingSystemSeeder.php` for all `model_mapping` values
2. Verify each model ID exists in daemon's `models.ts`
3. Report mismatches

**Effort:** ~45m

### 4.2 PlanSeeder Computes Credits at Seed Time (Stale Risk)

`PlanSeeder` computes `monthly_credits` using `CreditSetting::exchangeRate()` at seed time. This is correct at seed time but:
- Re-seeding overwrites computed values (which is what you want)
- NOT re-seeding after exchange_rate change leaves stale values

**Fix:** See 3.3 (computed attribute or cache invalidation cascade).

### 4.3 `PendingCreditPurchase` Role vs `CreditTransaction`

`PendingCreditPurchase` represents an incomplete top-up (user submitted transfer, not yet verified by admin).
`CreditTransaction` represents completed operations (purchases, usage, etc.).

This separation is correct — pending ≠ transaction. The flow is:
1. User submits transfer → `PendingCreditPurchase` (status: pending)
2. Admin approves → `PendingCreditPurchase` (status: paid) + `CreditTransaction` (type: purchase) created
3. User spends → `CreditTransaction` (type: usage)

No redundancy here. ✅

---

## 5. Potential Refactoring Decisions

### 5.1 Should `credit_settings` Stay as Filament Resource or Become a Dedicated Settings Page?

**Current:** Filament CRUD resource with create/edit/delete.
**Alternative:** Dedicated settings page using `spatie/laravel-settings` (like `GeneralSettings`).

**Trade-offs:**

| Factor | Filament Resource (Current) | Dedicated Settings Page |
|---|---|---|
| Flexibility | Admin can add/remove settings | Fixed settings, edit only |
| Validation | Per-field via form schema | Per-field in settings class |
| UX | Generic CRUD | Purpose-built forms |
| Risk | Admin could create garbage keys | Controlled keys only |
| Effort to migrate | — | ~3h |

**Recommendation:** Keep as CRUD for now. The key-value pattern is intentional — new settings can be added via seeder without code changes. If settings become more complex (conditional logic, cross-field validation), migrate to dedicated pages at that point.

### 5.2 Should `monthly_credits` Be Fully Replaced by a Computed Attribute?

**Answer: YES** — but with care.

**Approach A: Drop the column, add accessor**
```php
public function getMonthlyCreditsAttribute(): int
{
    return $this->effective_credits;
}
```
- + Eliminates drift permanently
- - Requires changing all code that reads `$this->monthly_credits`
- - Performance: N+1 queries unless exchange_rate is cached
- - `PlanResource` table sort by monthly_credits would break (can't sort by accessor without `sort` query)

**Approach B: Keep column, add listener to auto-recalculate**
- + Minimal code change
- - Still a stored computed column (redundant)

**Suggested path (hybrid):**
1. Add `getMonthlyCreditsAttribute()` accessor that delegates to `effective_credits`
2. Update all internal code to use `->monthly_credits` (which now goes through accessor)
3. Cache `CreditSetting::exchangeRate()` to avoid N+1
4. In a future migration, drop the DB column

**Effort:** ~2h

### 5.3 Should `PricingPackage` Stay, Get Admin UI, or Be Removed?

`PricingPackage` is a "combo deal" concept — pre-configured bundles at a discount. Currently:
- Seeded with 3 packages
- No admin UI (can't edit without reseeding)
- Used by `PricingCalculator::getPackages()` 
- Frontend may or may not use it

**Decision depends on product requirements:**
- If packages are static (set once), keep as seeder-only
- If packages change frequently, add admin UI (~1.5h)
- If packages are unused, remove entirely

---

## 6. Summary of Action Items (Prioritized)

### 🔴 P0 — Must Fix (bugs)

| # | Item | Type | Effort | File(s) |
|---|---|---|---|---|
| 1 | **Stale `monthly_credits` on exchange_rate change** — replace column reads with computed attribute | Data integrity | 30m | `Plan.php`, `PlanUpgradeResource.php`, `PlanResource/*` |
| 2 | **Drop `video_type_pricings` table** — dead | Cleanup | 15m | New migration |
| 3 | **Drop `pricing_addons` table** — dead | Cleanup | 15m | New migration |
| 4 | **Remove dropped columns from Plan $fillable** (`max_duration_seconds`, `max_resolution`, `upscale`) | Bug risk | 5m | `Plan.php` |

### 🟡 P1 — Should Fix (UX, missing UIs)

| # | Item | Type | Effort | File(s) |
|---|---|---|---|---|
| 5 | **Move Plans/Transactions/Upgrades/Purchases to "Billing & Credits"** nav group | Navigation | 30m | 4 Resource files |
| 6 | **Create Subscription admin UI** (read-only list) | Missing UI | 2h | New resource |
| 7 | **Add `api_rate_limit` to Plan form** | Missing field | 10m | `PlanResource.php` |

### 🔵 P2 — Good to Have

| # | Item | Type | Effort | File(s) |
|---|---|---|---|---|
| 8 | **Cache `CreditSetting::exchangeRate()`** | Performance | 15m | `CreditSetting.php` |
| 9 | **Extend `verify-media-models.mjs` to check model_mapping** | Data integrity | 45m | Daemon script |
| 10 | **Recalculate plan credits on exchange_rate change** (event + job) | Data integrity | 1h | `CreditSetting.php` + new Job |

### ⚪ P3 — Nice to Have

| # | Item | Type | Effort | File(s) |
|---|---|---|---|---|
| 11 | **Add PricingAuditLog cleanup/pruning** (90d TTL) | Maintenance | 30m | `PricingAuditLog.php` |
| 12 | **Improve `max_concurrent_jobs` to Select dropdown** | UX polish | 5m | Plan form |
| 13 | **Create PricingPackage admin UI** (if packages are actively used) | Missing UI | 1.5h | New resource |

---

## 7. Quick-Win Cleanup: Files to Change Immediately

If you only have 1 hour, do these:

```bash
# 1. Fix Plan $fillable (remove dropped columns)
# Edit: backend/app/Models/Plan.php
# Remove: 'max_duration_seconds', 'max_resolution', 'upscale'

# 2. Fix navigation group for PlanResource
# Edit: backend/app/Filament/Resources/PlanResource.php
# Change: navigationGroup from 'Video Platform' to 'Billing & Credits'

# 3. Fix navigation group for CreditTransactionResource
# Edit: backend/app/Filament/Resources/CreditTransactionResource.php
# Change: navigationGroup from 'Video Platform' to 'Billing & Credits'

# 4. Fix navigation group for PlanUpgradeResource + PendingCreditPurchaseResource
# Edit: both files
# Change: navigationGroup from 'Hệ thống' to 'Billing & Credits'

# 5. Add cache to CreditSetting::exchangeRate()
# Edit: backend/app/Models/CreditSetting.php
```

(All 5 changes in ~30m)

---

## 8. Verifier's Checklist

Run these after implementing any fixes:
```bash
# Backend tests
docker exec backend-app-1 php artisan test --filter="PricingCalculator"

# TypeScript check
cd apps/daemon && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# Model sync check
node apps/daemon/scripts/verify-media-models.mjs

# API pricing smoke test
curl http://localhost:8000/api/v1/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"video_type":"text_to_video","duration":"5s","resolution":"720p","quality":"standard"}'

# Plan API
curl http://localhost:8000/api/v1/plans
```

---

## References

- Plan: `backend/app/Models/Plan.php`
- CreditSetting: `backend/app/Models/CreditSetting.php`
- PlanResource: `backend/app/Filament/Resources/PlanResource.php`
- CreditSettingResource: `backend/app/Filament/Resources/CreditSettings/`
- ProviderPricingResource: `backend/app/Filament/Resources/ProviderPricingResource.php`
- VideoTypeResource: `backend/app/Filament/Resources/VideoTypes/`
- PricingCalculator: `backend/app/Services/Pricing/PricingCalculator.php`
- Seeder - Plan: `backend/database/seeders/PlanSeeder.php`
- Seeder - CreditSettings: `backend/database/seeders/CreditSettingsSeeder.php`
- Seeder - PricingSystem: `backend/database/seeders/PricingSystemSeeder.php`
- Daemon models: `apps/daemon/src/media/models.ts`
- Merge plan: `docs/plans/pricing/merge-provider-pricing-into-video-type.md`
