---
name: billing-and-credits
description: Billing, credits, and plans system for AI Video Platform
compatibility: opencode
metadata:
  scope: backend
  type: reference
---

## Plans System

### Plan Tiers
- **Free**: 100 credits/month, 5s max, 720p, 1 concurrent job
- **Pro**: 500 credits/month, 30s max, 1080p, 3 concurrent jobs
- **Studio**: 100,000 credits/month, 60s max, 4K, 10 concurrent jobs

### Credit System
- 1 credit = 1 second of video generation
- Credits deducted on job submission
- Credits refunded on job failure
- Monthly reset based on subscription cycle

## Models

### Plan Model
```php
Plan {
  slug: string (unique)
  name: string
  price_monthly: integer (cents)
  max_duration_seconds: integer
  max_resolution: enum (720p, 1080p, 4K)
  max_concurrent_jobs: integer
  queue_priority: enum (low, normal, high)
  monthly_credits: integer
  watermark: boolean
  quality_multiplier: decimal
  model_mapping: json
  provider_config: json
}
```

### User Model
```php
User {
  credits: integer (current balance)
  plan_id: foreign_key
  plan_expires_at: datetime
  auto_renew: boolean
}
```

### Credit History
```php
CreditTransaction {
  user_id: foreign_key
  amount: integer (positive=add, negative=deduct)
  type: enum (purchase, grant, refund, usage)
  render_job_id: foreign_key (nullable)
  description: string
}
```

## When to use this skill

Reference this when:
- Modifying credit logic
- Adding new plans
- Changing billing behavior
