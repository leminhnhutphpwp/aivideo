---
name: product-scope
description: Product scope and identity for AI Video Platform
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Product Scope

## Identity

**AI Video Platform** — Professional AI filmmaking platform

## Core Features

1. **Video Generation** — 13 providers (Seedance, Runway, Kling, Veo, Sora...)
2. **Multi-scene Editor** — Create videos with multiple scenes
3. **Asset Library** — Manage generated media
4. **Credits System** — Pay-per-use credit system
5. **Plans & Billing** — Free/Pro/Studio tiers
6. **Admin Dashboard** — User management, system monitoring

## Target Users

- Content creators
- Marketing teams
- Video producers
- AI enthusiasts

## Technical Principles

1. **Control Plane** — Laravel handles auth, credits, queue, admin
2. **Execution Plane** — Daemon handles media generation
3. **Webhook Callbacks** — Async job completion via webhooks
4. **Realtime Updates** — Reverb/WebSockets for live progress
5. **Vietnamese Locale** — Primary UI language

## Non-Goals

- Real-time collaboration
- Mobile apps (web-first)
- On-premise deployment (cloud-first)

## When to use this skill

Reference this when:
- Planning new features
- Making product decisions
- Prioritizing roadmap
