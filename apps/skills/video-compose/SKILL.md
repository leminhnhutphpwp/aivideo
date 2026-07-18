---
id: video-compose
label: Bộ soạn prompt video
label_en: Video Prompt Composer
category: compose
---

# Video Prompt Composer

## Purpose

Orchestrates the prompt enrichment pipeline. Takes raw user input and produces provider-ready parameters by stacking multiple enrichment layers in order.

## Layer Order (critical)

```
1. Discovery      → validate input, identify missing fields
2. Direction      → resolve preset, inject template + keywords
3. Enrichment     → weave style/mood/camera/lighting into prompt
4. Validation     → clamp parameters, run anti-slop checks
5. Return         → enriched prompt + validated params + metadata
```

## Layer Details

### 1. Discovery
- Check all required fields (prompt, aspect, length)
- Check optional fields (direction, style, mood, camera, lighting)
- Return list of questions to ask user if missing
- Assess prompt quality

### 2. Direction
- Look up selected direction from `video-direction/{id}`
- Extract camera_presets, lighting_presets, mood_tones, style_keywords
- Use prompt_template if user prompt is missing
- Apply suggested aspect ratio per direction

### 3. Enrichment
- Analyze style → add style keywords
- Analyze mood → add mood description
- Analyze camera → add camera movement type
- Analyze lighting → add lighting description
- Analyze negative_prompt → add avoidance terms
- If field equals default value, skip (reduce noise)
- Order: style → mood → camera → lighting → negative

### 4. Validation
- Clamp aspect ratio to supported values
- Clamp length to nearest bucket
- Run anti-slop pattern check on prompt
- Generate quality estimate (low/medium/high)
- Return warnings for detected issues

### 5. Return
- `prompt`: enriched text ready for provider
- `aspect`: validated aspect ratio
- `length`: validated/clamped duration
- `metadata.estimatedQuality`: low/medium/high
- `metadata.antiSlopScore`: 0-20
- `metadata.warnings`: list of detected issues
- `metadata.providerHints`: model-specific advice
