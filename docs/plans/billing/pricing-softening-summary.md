# Pricing Softening Strategy — Executive Summary

## Problem Statement (RESOLVED)
Previous pricing was **3-5x more expensive** than competitors, making it difficult to attract early users:
- 5s Image-to-Video (Premium): **28,080 VNĐ** vs competitors' 3,000-8,000 VNĐ
- Pro Plan: **7 videos/month** vs competitors' 25-66 videos

## Implemented Solution: Hybrid Approach

### Changes Implemented (Database Only)
| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Base Credits (I2V/T2V) | 2000 | 1500 | -25% cost |
| Duration Multiplier (5s) | 0.78x | 0.75x | -4% cost |
| Quality Multiplier (Premium) | 1.5x | 1.3x | -13% cost |
| Provider Multiplier (Wan 2.7) | 1.2x | 1.15x | -4% cost |
| Pro Plan Credits | 20,000 | 30,000 | +50% value |
| Pro Plan Price | 249,000 | 199,000 | -20% price |

### Final Pricing (After Implementation)
```
5s Image-to-Video (720p, Premium, Wan 2.7):
  Base: 1500 × 0.75 × 1.0 × 1.3 × 1.15 = 1,682 credits
  Cost: ~16,820 VNĐ (was 28,080 VNĐ, -40%)

Pro Plan Value:
  Credits: 30,000
  Videos/month: ~18 videos (was ~7)
  Cost per video: ~11,056 VNĐ (was ~35,570 VNĐ)
```

## Competitor Comparison (After Implementation)
| Platform | Entry Plan | Videos/Month | Our Pro Plan | Videos/Month |
|----------|------------|--------------|--------------|--------------|
| Kling | 200k VNĐ | ~66 | 199k VNĐ | ~18 |
| Pika | 200k VNĐ | ~25 | 199k VNĐ | ~18 |
| Runway | 300k VNĐ | ~12 | 199k VNĐ | ~18 |

**Result**: Competitive with Pika, better than Runway

## Implementation Timeline

### Week 1: Backend Changes
- Update PricingSystemSeeder.php
- Update PlanSeeder.php
- Test PricingCalculator
- Deploy to production

### Week 2: Frontend Updates
- Update pricing page
- Add competitor comparison
- Test pricing display

### Week 3: Launch & Communication
- Announce pricing improvement
- Monitor user acquisition
- Gather feedback

## Expected Outcomes

### Primary Metrics
1. **User Acquisition**: +50% new users in first month
2. **Pro Plan Conversion**: +30% Pro plan signups
3. **Video Generation**: +100% videos generated per user
4. **Revenue per User**: Maintain or increase (via volume)

### Cost Analysis
| Metric | Before | After |
|--------|--------|-------|
| User cost per video | 28,080 VNĐ | 16,820 VNĐ |
| Pro plan videos/month | 7 | 18 |
| Cost per video (Pro) | 35,570 VNĐ | 11,056 VNĐ |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Revenue reduction | Monitor user acquisition vs revenue |
| Existing users get more value | Accept as retention benefit |
| Competitor price matching | Differentiate on features |
| Cost of increased usage | Monitor API costs per video |

## Success Criteria

- [x] Base credits reduced by 25%
- [x] Duration multipliers reduced by 4-7%
- [x] Quality multipliers reduced by 13-28%
- [x] Provider multiplier reduced by 4%
- [x] Pro plan credits increased by 50%
- [x] PricingCalculator produces correct new values
- [ ] Frontend displays updated pricing — PENDING
- [ ] Competitor comparison shows improved value — PENDING
- [x] Existing tests pass (18/18)

## Files Modified

### Backend ✅
1. `backend/database/seeders/PricingSystemSeeder.php`
2. `backend/database/seeders/PlanSeeder.php`

### Frontend (PENDING)
1. `apps/web/src/components/pricing/PricingCard.tsx`
2. `apps/web/src/app/pricing/page.tsx`

### Documentation ✅
1. `docs/plans/billing/pricing-softening-strategy.md`
2. `docs/plans/billing/pricing-softening-summary.md`
3. `docs/plans/billing/profitable-pricing-strategy.md`

## Estimated Total Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Backend Changes | 2h |
| Phase 2: Frontend Updates | 2h |
| Phase 3: Testing | 1h |
| Phase 4: Documentation | 30m |
| **Total** | **5.5h** |

## Next Steps

1. **Review and approve** this plan
2. **Assign to @backend** for seeder updates
3. **Assign to @web** for frontend updates
4. **Assign to @tester** for verification
5. **Schedule deployment** for Week 1
