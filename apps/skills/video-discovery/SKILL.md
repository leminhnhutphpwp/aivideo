---
id: video-discovery
label: Giao thức khám phá video
label_en: Video Discovery Protocol
category: discovery
---

# Video Discovery Protocol

## Purpose

Defines the information to collect from users BEFORE generating video. Prevents 80% of redirects by locking down the brief upfront.

## Required Fields

| Field | Why | Default |
|-------|-----|---------|
| **prompt** | Main visual description — subject, action, setting | — |
| **aspect** | Output aspect ratio | 16:9 |
| **length** | Duration in seconds | 5 |

## Optional Fields

| Field | Why | Default |
|-------|-----|---------|
| **direction** | Visual direction preset (cinematic, product-reveal, etc.) | auto-detect |
| **style** | Visual style keywords | Cinematic |
| **mood** | Emotional tone | Dramatic |
| **camera** | Camera movement | Fixed |
| **lighting** | Lighting type | Natural |

## Discovery Questions

### If no direction selected
Ask: "What type of video are you making?"
Options: cinematic, product reveal, social ad, explainer, motion graphics

### If no prompt provided
Request video description: subject, action, setting, desired mood

### If prompt is very short (< 20 chars)
Warn: "Adding details about subject, action, and setting helps create better results."

## Quality Thresholds

- Prompt < 15 chars: critical — request more detail
- Prompt 15-80 chars: short — suggest adding detail
- Prompt > 80 chars: sufficient
- Invalid aspect ratio: clamp to 16:9
- Invalid length: clamp to nearest value
