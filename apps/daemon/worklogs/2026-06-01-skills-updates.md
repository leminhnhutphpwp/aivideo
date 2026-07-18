# Skills & Training Data Updates

## Date
2026-06-01

## Overview
Updated video-contract SKILL.md with Qwen Cloud section, added qwencloud hints to getProviderHints(), fixed NEGATIVE_PROMPT_PROVIDERS.

## Files Changed
| File | Change |
|------|--------|
| `apps/skills/video-contract/SKILL.md` | Added Qwen Cloud section (models, prompt_extend, negative prompt, image input, resolution, audio, multi-shot) |
| `apps/daemon/src/prompts/video-contract.ts` | Added qwencloud branch in getProviderHints(), NEGATIVE_PROMPT_PROVIDERS includes 'qwencloud' |

## Key Decisions
1. Qwen Cloud section covers wan2.6, wan2.7, i2v, r2v, s2v models
2. prompt_extend enabled by default for t2v
3. Negative prompt supported for all Qwen models

## Verification
- [x] tsc daemon: 0 errors
