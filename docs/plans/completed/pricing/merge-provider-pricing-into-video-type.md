# Merge ProviderPricing into VideoTypeResource — Design Plan

## Date
2026-06-03

## Overview
Consolidate two separate admin pages for pricing management into a single, cohesive interface. Currently, administrators must navigate between `/admin/video-types` and `/admin/provider-pricings` to manage related pricing data. This plan merges ProviderPricing as a nested relation inside VideoTypeResource using Filament's Repeater component, providing a unified management experience.

## User Stories
- As an admin, I want to manage all pricing configuration for a video type in one place so that I don't have to switch between pages
- As an admin, I want to see all provider-specific multipliers for a video type at a glance so that I can quickly compare pricing across providers
- As an admin, I want to add/edit/delete provider pricings directly from the video type edit page so that my workflow is more efficient
- As an admin, I want to see a summary of provider count in the video type list so that I can quickly identify which types have provider configurations

## Current Architecture

### Database Relationship
```
VideoType (1) ──< ProviderPricing (N)
  - id
  - code
  - name
  - base_credits
  - is_active
  
  └── providerPricings(): HasMany
        - id
        - video_type_id (FK)
        - provider
        - model
        - base_multiplier
        - min_duration_seconds
        - max_duration_seconds
        - supported_resolutions (JSON)
        - supported_addons (JSON)
        - is_active
        - sort_order
```

### Current UI Structure
- **VideoTypeResource**: `/admin/video-types`
  - List page: code, name, icon, base_credits, is_active, sort_order
  - Edit page: Tabs (Thông tin chung, Cấu hình giá)
  
- **ProviderPricingResource**: `/admin/provider-pricings`
  - List page: provider, videoType, model, multiplier, duration range, is_active
  - Edit page: provider, video_type_id, model, multiplier, duration, is_active

### Key Files
| File | Purpose |
|------|---------|
| `backend/app/Filament/Resources/VideoTypes/VideoTypeResource.php` | Main resource class |
| `backend/app/Filament/Resources/VideoTypes/Schemas/VideoTypeForm.php` | Form schema with tabs |
| `backend/app/Filament/Resources/VideoTypes/Tables/VideoTypesTable.php` | Table configuration |
| `backend/app/Filament/Resources/VideoTypes/Pages/EditVideoType.php` | Edit page |
| `backend/app/Filament/Resources/ProviderPricingResource.php` | Standalone resource (to be deprecated) |
| `backend/app/Models/VideoType.php` | Model with providerPricings() relationship |
| `backend/app/Models/ProviderPricing.php` | Model with videoType() relationship |
| `backend/app/Services/Pricing/PricingCalculator.php` | Uses both tables correctly |

## Technical Design

### Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    VideoTypeResource                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ EditVideoType Page                                      ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │ VideoTypeForm                                       │││
│  │  │  ┌───────────────────────────────────────────────┐  │││
│  │  │  │ Tab: Thông tin chung                          │  │││
│  │  │  │  - code, name, description, icon              │  │││
│  │  │  │  - base_credits, sort_order, is_active        │  │││
│  │  │  └───────────────────────────────────────────────┘  │││
│  │  │  ┌───────────────────────────────────────────────┐  │││
│  │  │  │ Tab: Cấu hình giá                            │  │││
│  │  │  │  - base_credits, sort_order, is_active        │  │││
│  │  │  └───────────────────────────────────────────────┘  │││
│  │  │  ┌───────────────────────────────────────────────┐  │││
│  │  │  │ Tab: Provider Pricing (NEW)                   │  │││
│  │  │  │  ┌─────────────────────────────────────────┐  │  │││
│  │  │  │  │ Repeater: provider_pricings             │  │  │││
│  │  │  │  │  - provider (select)                    │  │  │││
│  │  │  │  │  - model (text)                         │  │  │││
│  │  │  │  │  - base_multiplier (numeric)            │  │  │││
│  │  │  │  │  - min_duration_seconds (numeric)       │  │  │││
│  │  │  │  │  - max_duration_seconds (numeric)       │  │  │││
│  │  │  │  │  - supported_resolutions (select)       │  │  │││
│  │  │  │  │  - supported_addons (select)            │  │  │││
│  │  │  │  │  - is_active (toggle)                   │  │  │││
│  │  │  │  │  - sort_order (numeric)                 │  │  │││
│  │  │  │  │  - description (textarea)               │  │  │││
│  │  │  │  └─────────────────────────────────────────┘  │  │││
│  │  │  └───────────────────────────────────────────────┘  │││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Filament Repeater Configuration

#### Option A: Simple Repeater (Recommended for v1)
```php
// In VideoTypeForm.php - New Tab
Tabs\Tab::make('Provider Pricing')
    ->icon('heroicon-o-currency-dollar')
    ->schema([
        Section::make('Provider Configurations')
            ->description('Configure provider-specific pricing multipliers for this video type')
            ->schema([
                Forms\Components\Repeater::make('providerPricings')
                    ->relationship()
                    ->schema([
                        Forms\Components\Select::make('provider')
                            ->label('Provider')
                            ->options([
                                'wan' => 'Wan (DashScope)',
                                'qwencloud' => 'Qwen Cloud',
                                'volcengine' => 'Volcengine (Seedance)',
                                'grok' => 'xAI Grok',
                                'kling' => 'Kling',
                                'hyperframes' => 'HyperFrames',
                            ])
                            ->required()
                            ->searchable()
                            ->columnSpan(2),
                        
                        Forms\Components\TextInput::make('model')
                            ->label('Model')
                            ->placeholder('e.g., 2.6, 2.7, happyhorse')
                            ->required()
                            ->maxLength(255)
                            ->columnSpan(2),
                        
                        Forms\Components\TextInput::make('base_multiplier')
                            ->label('Cost Multiplier')
                            ->numeric()
                            ->default(1.0)
                            ->minValue(0.1)
                            ->maxValue(10.0)
                            ->step(0.1)
                            ->required()
                            ->helperText('1.0 = base cost, 2.0 = double cost')
                            ->columnSpan(2),
                        
                        Forms\Components\TextInput::make('min_duration_seconds')
                            ->label('Min Duration (s)')
                            ->numeric()
                            ->default(5)
                            ->minValue(1)
                            ->maxValue(120)
                            ->required()
                            ->columnSpan(1),
                        
                        Forms\Components\TextInput::make('max_duration_seconds')
                            ->label('Max Duration (s)')
                            ->numeric()
                            ->default(30)
                            ->minValue(1)
                            ->maxValue(120)
                            ->required()
                            ->columnSpan(1),
                        
                        Forms\Components\Select::make('supported_resolutions')
                            ->label('Supported Resolutions')
                            ->options([
                                '480p' => '480p',
                                '720p' => '720p',
                                '1080p' => '1080p',
                            ])
                            ->multiple()
                            ->default(['720p', '1080p'])
                            ->columnSpan(2),
                        
                        Forms\Components\Select::make('supported_addons')
                            ->label('Supported Addons')
                            ->options([
                                'voice_over' => 'Voice Over',
                                'ai_script' => 'AI Script',
                                'bgm' => 'Background Music',
                                'subtitles' => 'Subtitles',
                                'priority_render' => 'Priority Render',
                            ])
                            ->multiple()
                            ->default(['bgm'])
                            ->columnSpan(2),
                        
                        Forms\Components\Toggle::make('is_active')
                            ->label('Active')
                            ->default(true)
                            ->columnSpan(1),
                        
                        Forms\Components\TextInput::make('sort_order')
                            ->label('Sort Order')
                            ->numeric()
                            ->default(0)
                            ->columnSpan(1),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Description')
                            ->rows(2)
                            ->columnSpanFull(),
                    ])
                    ->columns(4)
                    ->defaultItems(0)
                    ->addActionLabel('Add Provider Pricing')
                    ->reorderable()
                    ->collapsible()
                    ->itemLabel(fn (array $state): ?string => 
                        isset($state['provider'], $state['model']) 
                            ? ucfirst($state['provider']) . ' ' . $state['model']
                            : null
                    ),
            ]),
    ]),
```

#### Option B: Section-based with Toggle (Better UX for many providers)
```php
// Alternative: Use Section with collapsed items
Forms\Components\Section::make('Provider Pricing')
    ->description('Configure provider-specific pricing multipliers')
    ->schema([
        Forms\Components\Repeater::make('providerPricings')
            ->relationship()
            ->schema([
                // Same fields as above
            ])
            ->columns(4)
            ->defaultItems(0)
            ->addActionLabel('Add Provider')
            ->reorderable()
            ->collapsible()
            ->cloneable()
            ->live(onBlur: true)
            ->afterStateUpdated(function (Forms\Set $set, ?array $state): void {
                // Auto-calculate sort_order based on provider
                if ($state && isset($state['provider'])) {
                    // Optional: auto-set sort_order
                }
            }),
    ])
    ->collapsible()
    ->columnSpanFull(),
```

### API Contracts
No new API endpoints needed. The existing relationships handle everything:
- `GET /api/video-types` — Returns video types with providerPricings relation
- `POST /api/video-types` — Creates video type with nested providerPricings
- `PUT /api/video-types/{id}` — Updates video type and syncs providerPricings
- `DELETE /api/video-types/{id}` — Deletes video type (cascades to providerPricings)

### Frontend Components
No changes needed for web frontend. The admin panel is Filament-only.

### Database Changes
**None required.** The existing schema supports this architecture:
- `provider_pricings.video_type_id` foreign key exists
- `VideoType::providerPricings()` relationship defined
- Filament Repeater handles the nested CRUD automatically

### Form Validation Rules

#### VideoType Validation
```php
'code' => 'required|string|max:255|unique:video_types,code,' . $record?->id,
'name' => 'required|string|max:255',
'base_credits' => 'required|integer|min:1',
'is_active' => 'required|boolean',
'sort_order' => 'required|integer|min:0',
```

#### ProviderPricing Validation (nested)
```php
'providerPricings.*.provider' => 'required|string|max:255',
'providerPricings.*.model' => 'required|string|max:255',
'providerPricings.*.base_multiplier' => 'required|numeric|min:0.1|max:10',
'providerPricings.*.min_duration_seconds' => 'required|integer|min:1|max:120',
'providerPricings.*.max_duration_seconds' => 'required|integer|min:1|max:120|gte:providerPricings.*.min_duration_seconds',
'providerPricings.*.supported_resolutions' => 'required|array',
'providerPricings.*.supported_addons' => 'array',
'providerPricings.*.is_active' => 'required|boolean',
'providerPricings.*.sort_order' => 'required|integer|min:0',
```

### Table Columns Update

#### VideoTypesTable — Add Provider Summary
```php
TextColumn::make('providerPricings_count')
    ->label('Providers')
    ->counts('providerPricings')
    ->badge()
    ->color(fn (int $state): string => match (true) {
        $state === 0 => 'gray',
        $state <= 2 => 'info',
        default => 'success',
    }),

TextColumn::make('providerPricings.provider')
    ->label('Providers')
    ->badge()
    ->separator(',')
    ->limitedList(3)
    ->tooltip(fn (VideoType $record): string => 
        $record->providerPricings->pluck('provider')->map(fn($p) => ucfirst($p))->implode(', ')
    ),
```

## Edge Cases

### 1. Empty Provider Pricing
- **Scenario**: Video type has no provider configurations
- **Handling**: Show "No providers configured" message in the tab
- **Impact**: PricingCalculator will use default 1.0x multiplier

### 2. Duplicate Provider+Model Combination
- **Scenario**: User tries to add same provider+model twice
- **Handling**: Add unique validation rule: `unique:provider_pricings,provider,model,video_type_id`
- **UX**: Show inline validation error on the Repeater item

### 3. Duration Range Overlap
- **Scenario**: Two provider pricings for same provider with overlapping duration ranges
- **Handling**: Allow overlaps (different models may have same duration support)
- **Future**: Add warning notification if overlaps detected

### 4. Cascade Delete
- **Scenario**: Deleting a video type with provider pricings
- **Handling**: Soft delete video type, hard delete provider pricings
- **Alternative**: Use `restrictOnDelete()` to prevent deletion if pricings exist

### 5. Bulk Operations
- **Scenario**: Bulk delete video types with provider pricings
- **Handling**: Filament handles cascade via relationship constraints
- **Safety**: Add confirmation dialog for bulk delete

### 6. Import/Export
- **Scenario**: Future feature to import/export pricing data
- **Handling**: Export VideoType with nested providerPricings as JSON
- **Not in scope**: Phase 1 focuses on UI merge only

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| Form complexity increases | Use collapsible Repeater, clear section headers |
| Performance with many providers | Limit to 10-15 providers per type (business rule) |
| Migration path for existing data | No migration needed — data stays in same tables |
| User confusion during transition | Keep standalone page for 30 days as fallback |
| Filament Repeater limitations | Test with max expected providers (7-10 per type) |

## Implementation Tasks

### Phase 1: Backend — Form Integration (2h)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 1.1 | Add Provider Pricing tab to VideoTypeForm.php | @backend | 45m |
| 1.2 | Configure Repeater with all fields | @backend | 30m |
| 1.3 | Add validation rules for nested records | @backend | 15m |
| 1.4 | Test create/edit/delete nested provider pricings | @backend | 30m |

### Phase 2: Backend — Table Enhancement (1h)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 2.1 | Add provider count column to VideoTypesTable | @backend | 20m |
| 2.2 | Add provider badges with tooltips | @backend | 20m |
| 2.3 | Add filter by provider availability | @backend | 20m |

### Phase 3: Backend — Deprecate Standalone Resource (30m)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 3.1 | Hide ProviderPricingResource from navigation | @backend | 10m |
| 3.2 | Add redirect from old URL to VideoTypeResource | @backend | 10m |
| 3.3 | Update any direct references to ProviderPricingResource | @backend | 10m |

### Phase 4: Testing & Verification (1h)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 4.1 | Test CRUD operations for nested provider pricings | @backend | 20m |
| 4.2 | Verify PricingCalculator still works correctly | @backend | 15m |
| 4.3 | Run existing test suite | @tester | 15m |
| 4.4 | Manual QA: create video type with 3 providers | @tester | 10m |

### Phase 5: Documentation & Cleanup (30m)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 5.1 | Update PricingSystemSeeder if needed | @backend | 15m |
| 5.2 | Write worklog documenting changes | @backend | 10m |
| 5.3 | Update task-status.md | @coordinator | 5m |

## Rollback Plan

### If Issues Occur During Implementation
1. **Revert VideoTypeForm.php** to previous version (remove new tab)
2. **Restore ProviderPricingResource.php** navigation visibility
3. **No database changes** — data remains intact
4. **Test PricingCalculator** to ensure no regression

### If Issues Occur After Deployment
1. **Immediate**: Re-enable ProviderPricingResource navigation
2. **Short-term**: Add link from VideoType edit page to standalone ProviderPricingResource
3. **Long-term**: Fix issues and re-attempt merge

### Rollback Commands
```bash
# Revert code changes
git checkout backend/app/Filament/Resources/VideoTypes/Schemas/VideoTypeForm.php
git checkout backend/app/Filament/Resources/VideoTypes/Tables/VideoTypesTable.php
git checkout backend/app/Filament/Resources/ProviderPricingResource.php

# Clear cache
docker exec backend-app-1 php artisan cache:clear
docker exec backend-app-1 php artisan config:clear
docker exec backend-app-1 php artisan route:clear
```

## Estimated Total Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Backend Form | 2h |
| Phase 2: Backend Table | 1h |
| Phase 3: Deprecate Standalone | 30m |
| Phase 4: Testing | 1h |
| Phase 5: Documentation | 30m |
| **Total** | **5h** |

## Success Criteria

- [ ] Admin can create/edit video type with nested provider pricings in single form
- [ ] Admin can add/edit/delete provider pricings without leaving video type page
- [ ] Video type list shows provider count and provider names
- [ ] PricingCalculator continues to work correctly with both tables
- [ ] Existing test suite passes (18/18)
- [ ] No database migration required
- [ ] Standalone ProviderPricingResource hidden from navigation (but still accessible via direct URL for 30 days)

## Future Enhancements (Out of Scope)

1. **Bulk Import/Export**: JSON/CSV import of provider pricings
2. **Provider Pricing Templates**: Save/load common pricing configurations
3. **Audit Log**: Track changes to provider pricings
4. **Validation Rules**: Duration range overlap detection
5. **Visual Pricing Matrix**: Grid view showing all provider × duration combinations
6. **API for Provider Pricings**: Public API for frontend pricing calculator

## References

- Filament Repeater Docs: https://filamentphp.com/docs/3.x/forms/fields/repeater
- Filament Relationship Fields: https://filamentphp.com/docs/3.x/forms/fields/relationship
- Current PricingCalculator: `backend/app/Services/Pricing/PricingCalculator.php`
- PricingSystemSeeder: `backend/database/seeders/PricingSystemSeeder.php`
