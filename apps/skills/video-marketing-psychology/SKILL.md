---
id: video-marketing-psychology
label: Tâm lý marketing video
label_en: Marketing Psychology for Video
category: marketing-psychology
---

# Marketing Psychology for Video

## Purpose

Applies behavioral science principles to video structure, scene sequencing, and visual triggers — making AI-generated videos more persuasive, memorable, and actionable. Bridges marketing copywriting frameworks with visual storytelling.

## Core Frameworks

### 1. AIDA (Attention → Interest → Desire → Action)

Applied to scene sequence:

| Stage | Scene Role | Duration | Visual Cues |
|-------|-----------|----------|-------------|
| **Attention** | Hook scene — break pattern, surprise, question | 1–3s | Bright flash, unexpected movement, question text |
| **Interest** | Problem/context — "this is for you" | 3–5s | Product in use, relatable situation |
| **Desire** | Solution/Benefit — "here's how it helps" | 3–5s | Close-up result, before/after |
| **Action** | CTA — "get it now" | 2–3s | Product hero + button/arrow visual |

### 2. PAS (Problem → Agitate → Solve)

| Stage | Scene Role | Duration | Visual Cues |
|-------|-----------|----------|-------------|
| **Problem** | Show the pain point | 2–4s | Frustrated expression, messy situation |
| **Agitate** | Amplify the frustration | 2–3s | Close-up of problem getting worse |
| **Solve** | Product as hero | 3–5s | Product appears, problem fixed, smile |

### 3. Hook Patterns

| Pattern | Description | Best For |
|---------|------------|----------|
| **Pattern Interrupt** | Something unexpected breaks scroll | All short-form |
| **Curiosity Gap** | "Wait for it..." / "The result will shock you" | Viral content |
| **Social Proof** | "5M people already use this" | Testimonial / UGC |
| **Loss Aversion** | "Don't miss out" / limited time | Flash sale |
| **Authority** | Expert / doctor / influencer endorsement | Brand TVC |
| **Reciprocity** | Free value → ask for action | Educational content |

## Scene Structure by Video Type

### Short-Form Ads (9:16, 15-30s)
```
Frame 1: Hook (pattern interrupt)       [0-3s]
Frame 2: Problem (relatable)            [3-6s]
Frame 3: Product reveal (desire)        [6-10s]
Frame 4: Benefit / result               [10-15s]
Frame 5: CTA (action)                   [15-20s]
```

### Testimonial (9:16, 30-60s)
```
Frame 1: Empathetic hook                [0-4s]
Frame 2: Before state (problem)         [4-12s]
Frame 3: Discovery of solution          [12-20s]
Frame 4: After state (transformation)   [20-35s]
Frame 5: Recommendation + CTA           [35-45s]
```

### Product Reveal (16:9, 15-30s)
```
Frame 1: Teaser / mystery               [0-3s]
Frame 2: Product intro (wide)           [3-7s]
Frame 3: Feature detail (macro)         [7-12s]
Frame 4: Use case (lifestyle)           [12-18s]
Frame 5: CTA / branding                 [18-22s]
```

## Psychological Triggers in Visuals

### Color Psychology
- **Red/Orange**: urgency, excitement — use for CTA / sale scenes
- **Blue**: trust, calm — use for testimonial / brand intro
- **Yellow**: happiness, warmth — use for lifestyle / before
- **Purple**: luxury, premium — use for high-end product
- **Green**: health, nature — use for organic / wellness

### Framing Psychology
- **Eye-level**: equal, trustworthy — testimonial, review
- **Low angle**: powerful, dominant — product hero shot
- **High angle**: vulnerable, small — problem / before state
- **Close-up**: intimate, emotional — reaction / detail
- **Wide**: contextual, environmental — opening / establishing

### Motion Psychology
- **Slow dolly in**: intimacy, importance — product reveal
- **Fast zoom out**: reveal, surprise — hook pattern
- **Whip pan**: energy, transition — short-form cuts
- **Static**: authority, stability — expert / testimonial
- **Handheld**: authenticity, UGC — review / real content

## Integration

- Apply framework selection based on `video_type` and `direction_hints` from storyboard types
- Scene sequence should be restructured per chosen framework before rendering
- Duration per scene should follow framework specs (shorter for attention, longer for desire)
- Mood and lighting choices should align with psychological triggers for the target emotion
