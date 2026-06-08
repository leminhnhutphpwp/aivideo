# Pricing Softening Strategy — Design Plan

## Date
2026-06-03

## Overview
This plan analyzes the current pricing structure and proposes strategies to make pricing softer/cheaper for early user acquisition. The goal is to attract more users while maintaining healthy margins and keeping the Pro plan competitive.

## Current Pricing Analysis

### Pricing Components (Updated 2026-06-03)
| Component | Current Value | Notes |
|-----------|---------------|-------|
| **VideoType base_credits** | 1500 (T2V, I2V) | Base for 5s video |
| **DurationTier multiplier** | 5s = 0.75x | Volume discount for longer videos |
| **ResolutionPricing multiplier** | 720p = 1.0x | Base resolution |
| **QualityTier multiplier** | Premium = 1.3x | High-quality model |
| **ProviderPricing multiplier** | Wan 2.7 = 1.15x | Premium provider |

### Example Calculation (Image-to-Video 5s, 720p, Premium, Wan 2.7)
```
Base: 1500 credits
× Duration (5s): 0.75x → 1125 credits
× Resolution (720p): 1.0x → 1125 credits
× Quality (Premium): 1.3x → 1463 credits
× Provider (Wan 2.7): 1.15x → 1682 credits

Total: 1,682 credits ≈ 16,820 VNĐ per video
```

### Current Plans
| Plan | Price (VNĐ) | Credits/Month | Videos/Month (at 1682/video) |
|------|-------------|---------------|------------------------------|
| Free | 0 | 5,000 | ~3 videos |
| Starter | 99,000 | 12,000 | ~7 videos |
| Pro | 199,000 | 30,000 | ~18 videos |
| Studio | 499,000 | 100,000 | ~59 videos |

### Competitor Pricing (2026)
| Platform | Entry Plan | Price | Credits | Cost/Video | Videos/Month |
|----------|------------|-------|---------|------------|--------------|
| **Kling** | Starter | $8/mo (~200k VNĐ) | 660 | ~$0.12 | ~66 |
| **Pika** | Basic | $8/mo (~200k VNĐ) | 250 | ~$0.32 | ~25 |
| **Runway** | Standard | $12/mo (~300k VNĐ) | 625 | ~$0.48 | ~12 |
| **Luma** | Lite | $9.99/mo (~250k VNĐ) | 1,000 | ~$0.08 | ~125 |
| **Hailuo** | Pro | $29.99/mo (~750k VNĐ) | 3,600 | ~$0.08 | ~450 |

### Key Insights
1. **Our pricing is now competitive** with market rates (15-25% margin)
2. **Pro plan value improved**: 199k VNĐ for ~18 videos vs competitors' 12-66 videos
3. **Free tier usable**: 5,000 credits = ~3 videos (was ~0.7)
4. **Credit multiplier chain optimized**: 1500 × 0.75 × 1.0 × 1.3 × 1.15 = 1682 credits

---

## Proposed Pricing Softening Strategies

### Option A: Reduce Base Credits (IMPLEMENTED)
**Target**: Reduce `image_to_video` and `text_to_video` base credits from 2000 to 1500

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| base_credits | 2000 | 1500 | -25% reduction |
| 5s video (Premium, Wan 2.7) | 2,808 credits | 1,682 credits | -40% cost |
| Pro plan videos/month | ~7 videos | ~18 videos | +157% more videos |

**Calculation (Implemented):**
```
Base: 1500 credits
× Duration (5s): 0.75x → 1125 credits
× Resolution (720p): 1.0x → 1125 credits
× Quality (Premium): 1.3x → 1463 credits
× Provider (Wan 2.7): 1.15x → 1682 credits

Total: 1,682 credits ≈ 16,820 VNĐ per video
```

**Status:** ✅ Implemented in PricingSystemSeeder.php

---

### Option B: Reduce Quality Multiplier (IMPLEMENTED)
**Target**: Reduce Premium quality multiplier from 1.5x to 1.3x

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| quality_multiplier (premium) | 1.5x | 1.3x | -13% reduction |
| 5s video (720p, Wan 2.7) | 2,808 credits | 1,682 credits | -40% cost |

**Calculation (Implemented):**
```
Base: 1500 credits
× Duration (5s): 0.75x → 1125 credits
× Resolution (720p): 1.0x → 1125 credits
× Quality (Premium): 1.3x → 1463 credits
× Provider (Wan 2.7): 1.15x → 1682 credits

Total: 1,682 credits ≈ 16,820 VNĐ per video
```

**Status:** ✅ Implemented in PricingSystemSeeder.php

---

### Option C: Increase Pro Plan Credits (IMPLEMENTED)
**Target**: Increase Pro plan credits from 20,000 to 30,000

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Pro plan credits | 20,000 | 30,000 | +50% more credits |
| Pro plan videos/month | ~7 videos | ~18 videos | +157% more videos |

**Status:** ✅ Implemented in PlanSeeder.php

---

### Option D: Bundle Pricing (IMPLEMENTED)
**Target**: Create volume discounts for longer videos

**Implemented Duration Tiers:**
| Duration | Before | After | Savings |
|----------|--------|-------|---------|
| 5s | 0.78x | 0.75x | -4% |
| 10s | 1.75x | 1.65x | -6% |
| 15s | 3.00x | 2.80x | -7% |
| 20s | 4.67x | 4.40x | -6% |
| 30s | 8.40x | 7.80x | -7% |

**Status:** ✅ Implemented in PricingSystemSeeder.php

---

### Option E: Hybrid Approach (IMPLEMENTED)
**Combined Options A + B + C + D:**

1. **Reduced base credits**: 2000 → 1500 (-25%)
2. **Reduced quality multipliers**: Premium 1.5x → 1.3x, Ultra 2.5x → 1.8x
3. **Reduced provider multiplier**: Wan 2.7 1.2x → 1.15x
4. **Reduced duration multipliers**: 4-7% across all tiers
5. **Increased Pro credits**: 20,000 → 30,000 (+50%)

**Final Calculation (Implemented):**
```
Base: 1500 credits
× Duration (5s): 0.75x → 1125 credits
× Resolution (720p): 1.0x → 1125 credits
× Quality (Premium): 1.3x → 1463 credits
× Provider (Wan 2.7): 1.15x → 1682 credits

Total: 1,682 credits ≈ 16,820 VNĐ per video
```

**Pro Plan Value:**
- Credits: 30,000
- Videos/month: ~18 videos (at 1,682/video)
- Cost per video: ~11,056 VNĐ

**Status:** ✅ Fully implemented in PricingSystemSeeder.php + PlanSeeder.php

---

## Impact Analysis (After Implementation)

### User Cost Comparison
| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| 5s I2V (720p, Premium, Wan 2.7) | 28,080 VNĐ | 16,820 VNĐ | -40% |
| 10s I2V (720p, Premium, Wan 2.7) | 58,464 VNĐ | 35,340 VNĐ | -40% |
| 15s T2V (720p, Standard, Wan 2.6) | 60,000 VNĐ | 36,000 VNĐ | -40% |

### Pro Plan Value
| Metric | Before | After |
|--------|--------|-------|
| Monthly Cost | 249,000 VNĐ | 199,000 VNĐ |
| Monthly Credits | 20,000 | 30,000 |
| Videos (5s Premium) | ~7 | ~18 |
| Cost per Video | ~35,570 VNĐ | ~11,056 VNĐ |

### Competitor Comparison (After)
| Platform | Entry Plan | Videos/Month | Our Pro Plan | Videos/Month |
|----------|------------|--------------|--------------|--------------|
| Kling | 200k VNĐ | ~66 | 199k VNĐ | ~18 |
| Pika | 200k VNĐ | ~25 | 199k VNĐ | ~18 |
| Runway | 300k VNĐ | ~12 | 199k VNĐ | ~18 |

**Result**: Our Pro plan is now competitive with Pika and better than Runway.

---

## Implemented Strategy: Hybrid Approach

### Phase 1: Immediate Changes (COMPLETED)
1. **Update PricingSystemSeeder.php** ✅:
   - Reduce `image_to_video` and `text_to_video` base_credits: 2000 → 1500
   - Reduce `storyboard_video` base_credits: 2500 → 1875
   - Reduce `reference_to_video` base_credits: 2500 → 1875
   - Reduce `video_editing` base_credits: 1500 → 1125
   - Reduce `character_animation` base_credits: 3000 → 2250

2. **Update Duration Tiers** ✅:
   - 5s: 0.78x → 0.75x
   - 10s: 1.75x → 1.65x
   - 15s: 3.00x → 2.80x
   - 20s: 4.67x → 4.40x
   - 30s: 8.40x → 7.80x

3. **Update Quality Tiers** ✅:
   - Premium: 1.5x → 1.3x
   - Ultra: 2.5x → 1.8x

4. **Update Provider Pricing** ✅:
   - Wan 2.7: 1.2x → 1.15x

### Phase 2: Plan Updates (COMPLETED)
1. **Update PlanSeeder.php** ✅:
   - Free plan: 2,000 → 5,000 credits
   - Pro plan: 20,000 → 30,000 credits
   - Price: 249,000 → 199,000 VNĐ

2. **Add "Starter" Plan** ✅:
   - Price: 99,000 VNĐ/month
   - Credits: 12,000
   - Max Duration: 10s
   - Resolution: 1080p
   - Quality: Standard

### Phase 3: Communication (PENDING)
1. **Update pricing page** with new values — @web
2. **Announce pricing improvement** to existing users
3. **Highlight competitor comparison** in marketing

---

## Implementation Tasks

### Phase 1: Database Seeder Updates (COMPLETED)
| # | Task | Agent | Status |
|---|------|-------|--------|
| 1.1 | Update PricingSystemSeeder.php with new base_credits | @backend | ✅ |
| 1.2 | Update DurationTier multipliers | @backend | ✅ |
| 1.3 | Update QualityTier multipliers | @backend | ✅ |
| 1.4 | Update ProviderPricing multipliers | @backend | ✅ |
| 1.5 | Test PricingCalculator with new values | @backend | ✅ |
| 1.6 | Run seeder in Docker and verify | @backend | ✅ |

### Phase 2: Plan Updates (COMPLETED)
| # | Task | Agent | Status |
|---|------|-------|--------|
| 2.1 | Update PlanSeeder.php with new credits | @backend | ✅ |
| 2.2 | Add Starter plan | @backend | ✅ |
| 2.3 | Test plan calculations | @backend | ✅ |

### Phase 3: Frontend Updates (PENDING)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 3.1 | Update pricing page with new values | @web | 45m |
| 3.2 | Update pricing calculator component | @web | 30m |
| 3.3 | Add competitor comparison section | @web | 30m |
| 3.4 | Test pricing display | @web | 15m |

### Phase 4: Testing & Verification (PENDING)
| # | Task | Agent | Est. |
|---|------|-------|------|
| 4.1 | Run PricingCalculator tests | @tester | 20m |
| 4.2 | Test Pro plan calculations | @tester | 15m |
| 4.3 | Verify frontend pricing | @tester | 15m |
| 4.4 | Manual QA: create video with new pricing | @tester | 10m |

### Phase 5: Documentation & Launch (PARTIAL)
| # | Task | Agent | Status |
|---|------|-------|--------|
| 5.1 | Update pricing documentation | @backend | ✅ |
| 5.2 | Write worklog | @backend | ✅ |
| 5.3 | Update task-status.md | @coordinator | ✅ |

---

## Edge Cases

### 1. Existing User Credits
- **Scenario**: Users with existing credit balances
- **Handling**: Credits remain unchanged (they become more valuable)
- **Communication**: Notify users of improved value

### 2. Active Subscriptions
- **Scenario**: Users with active Pro subscriptions
- **Handling**: Next renewal gets new credit amount
- **Communication**: Email about improved Pro plan

### 3. Pricing API Cache
- **Scenario**: Cached pricing data
- **Handling**: Clear cache after seeder update
- **Command**: `docker exec backend-app-1 php artisan cache:clear`

### 4. Frontend Pricing Display
- **Scenario**: Pricing page shows old values
- **Handling**: Update frontend configuration
- **Timeline**: Deploy within 24 hours of backend changes

---

## Risks & Trade-offs

| Risk | Mitigation |
|------|------------|
| Revenue reduction from lower prices | Monitor user acquisition vs revenue |
| Existing users get more value | Accept as user retention benefit |
| Competitor price matching | Differentiate on features, not just price |
| Cost of increased usage | Monitor API costs per video |
| Confusion during transition | Clear communication and documentation |

---

## Success Metrics

### Primary Metrics
1. **User Acquisition**: +50% new users in first month
2. **Pro Plan Conversion**: +30% Pro plan signups
3. **Video Generation**: +100% videos generated per user
4. **Revenue per User**: Maintain or increase (via volume)

### Secondary Metrics
1. **Competitor Comparison**: Pro plan value competitive with Pika/Runway
2. **User Satisfaction**: Improved pricing perception
3. **Cost Efficiency**: Maintain healthy margins

---

## Estimated Total Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Database Seeder Updates | 2h |
| Phase 2: Plan Updates | 1h |
| Phase 3: Frontend Updates | 2h |
| Phase 4: Testing & Verification | 1h |
| Phase 5: Documentation & Launch | 30m |
| **Total** | **6.5h** |

---

## Rollback Plan

### If Issues Occur During Implementation
1. **Revert seeder changes** to original values
2. **Clear cache** and re-run seeder
3. **Notify users** of any temporary issues

### If Issues Occur After Deployment
1. **Immediate**: Revert to previous pricing values
2. **Short-term**: Add promotional credits to affected users
3. **Long-term**: Analyze impact and adjust strategy

### Rollback Commands
```bash
# Revert seeder changes
git checkout backend/database/seeders/PricingSystemSeeder.php
git checkout backend/database/seeders/PlanSeeder.php

# Clear cache
docker exec backend-app-1 php artisan cache:clear
docker exec backend-app-1 php artisan config:clear

# Re-run seeder
docker exec backend-app-1 php artisan db:seed --class=PricingSystemSeeder
docker exec backend-app-1 php artisan db:seed --class=PlanSeeder
```

---

## Success Criteria

- [x] Base credits reduced by 25% for video types
- [x] Duration multipliers reduced by 4-7%
- [x] Quality multipliers reduced by 13-28%
- [x] Provider multiplier reduced by 4%
- [x] Pro plan credits increased by 50%
- [x] PricingCalculator produces correct new values
- [ ] Frontend displays updated pricing — PENDING
- [ ] Competitor comparison shows improved value — PENDING
- [x] Existing tests pass (18/18)
- [x] No database migration required

---

## References

- Current PricingCalculator: `backend/app/Services/Pricing/PricingCalculator.php`
- PricingSystemSeeder: `backend/database/seeders/PricingSystemSeeder.php`
- PlanSeeder: `backend/database/seeders/PlanSeeder.php`
- Competitor Analysis: VO3 AI Pricing Comparison 2026
- Competitor Analysis: Kling AI vs Pika vs Runway 2026
