# AI Video Platform — Plans & Docs Index

## Plans Index

> **Note:** Many previously referenced directories (`backend/`, `appclient/`, `deployment/env-reference.md`, `pipeline-overview.md`, `roadmap.md`, `update-plan.md`, `integration/01-*.md`) no longer exist. See below for the current structure.

### 📋 Next Tasks & Status
| File | Description |
|------|-------------|
| `plans/next-tasks.md` | Current next tasks, recently completed, P0-P2 priorities |

### 💰 Billing & Pricing
| File | Description |
|------|-------------|
| `plans/billing/credit-pack-ui.md` | Credit pack purchase UI plan |
| `plans/billing/final-pricing-plan.md` | Final pricing plan specification |
| `plans/billing/pricing-analysis.md` | Pricing analysis and recommendations |
| `plans/billing/pricing-margin-analysis.md` | Margin analysis per model/tier |
| `plans/billing/pricing-review.md` | Full pricing system review |

### 🔌 Integration & API
| File | Description |
|------|-------------|
| `plans/integration/alibaba-model-studio-analysis.md` | Alibaba Cloud Model Studio API analysis |
| `plans/integration/dashscope-best-practices.md` | DashScope API best practices |
| `plans/integration/fix-email-notification.md` | Email notification fix plan |

### 🎬 Storyboard
| File | Description |
|------|-------------|
| `plans/storyboard/phase0-refactor-detail.md` | Phase 0 refactor detailed plan |
| `plans/storyboard/professional-storyboard-analysis.md` | Professional storyboard analysis |
| `plans/storyboard/professional-storyboard-improvements.md` | Proposed improvements |
| `plans/storyboard/single-flow-narrative.md` | One-Shot single-flow narrative design |
| `storyboard-flow-plan.md` | Original storyboard flow plan |

### 🎨 UI & Landing Page
| File | Description |
|------|-------------|
| `plans/ui/landing-page-settings.md` | Landing page dynamic settings |
| `plans/ui/manage-general-settings-refactor.md` | General settings refactor |
| `plans/ui/remove-scene-repeater.md` | Scene repeater removal plan |
| `plans/ui/server-render-landing-seo.md` | Server-render landing for SEO |

### 🚀 Deployment
| File | Description |
|------|-------------|
| `deployment/README.md` | Deployment overview |
| `deployment/env-vars.md` | Environment variables reference |
| `deployment/ssl-routing.md` | SSL and routing configuration |

### 📖 Reference Docs (Vendor APIs)
| File | Description |
|------|-------------|
| `docs.ckey.vn/text-to-image.md` | CKey text-to-image API docs |
| `docs.qwencloud.com/` | QwenCloud/DashScope API docs (various) |

### 🏷️ Branding
| File | Description |
|------|-------------|
| `brading/README.md` | Brand guide index |
| `brading/wavise-brand.md` | Wavise Studio brand guidelines |

## Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Next.js 16)                    │
│  Dashboard · Studio · Library · Credits              │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────▼──────────────────────────────┐
│              Control Plane (Laravel)                  │
│  Auth · Subscription · Credits · Queue · Admin       │
└──────────────────────┬──────────────────────────────┘
                       │ Internal API
┌──────────────────────▼──────────────────────────────┐
│              Media Engine (Daemon)                    │
│  Media Gen · Webhook · FFmpeg · Storage              │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Compute Plane (GPU / API)                │
│  Seedance · HunyuanVideo · Runway · FFmpeg           │
└─────────────────────────────────────────────────────┘
```

## Nguyên tắc thiết kế

1. **Next.js là Presentation Layer** — UI thuần, không business logic
2. **Laravel là Business OS** — mọi business logic tập trung ở Laravel
3. **Daemon là Media Engine** — chỉ làm media generation, không auth/billing
4. **Pluggable Compute** — GPU tự render hay thuê API đều được
5. **Event-driven** — mọi state change đều qua event/realtime
6. **Fail-safe** — không mất job, không double charge, có retry/dead-letter
