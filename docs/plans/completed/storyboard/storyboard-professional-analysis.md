# Professional Storyboard Analysis — Learnings & Effort

## Date
2026-06-02

## Overview
Analysis of 3 professional storyboard images vs our current Wavise Studio implementation. Identifies key gaps, prioritized improvements, and concrete effort estimates.

---

## 1. What Did We Learn? — Key Insights

### 🔴 Most Important Lesson: **Structure > Freedom**

Professional storyboards are **structured data entry**, not free-form creative canvases. Every field has a predefined set of options. This is the opposite of our current "prompt-first" philosophy.

| Aspect | Professional | Our Platform | Gap |
|--------|-------------|--------------|-----|
| Camera movement | 12+ structured types (dropdown) | 11 structured types (dropdown) | **Small** — we're close |
| Timeline view | Sequential list (Scene 1 → 2 → 3) | React Flow canvas (free-form) | **Major** — different paradigm |
| Character consistency | Lock character across scenes | Per-scene reference images only | **Medium** — need character nodes |
| Opening/closing | Logo IN, END - FADE OUT frames | No support | **Medium** — new scene types |
| Timestamps | 00:00 → 00:12 per scene | No structured timestamps | **Small** — derived from duration |
| Shot composition | Detailed (wide/medium/close-up + action) | Prompt text only | **Medium** — could add shot type field |

### 💡 Key Insight 1: Users Want **Guidance**, Not Blank Canvas

Professional tools guide users through a structured workflow:
1. Define characters (reference images)
2. Set opening frame (logo/brand)
3. Add scenes sequentially (each with: shot type, camera, duration, narration)
4. Set closing frame (END card)
5. Review timeline

Our current React Flow canvas gives too much freedom — users don't know where to start.

### 💡 Key Insight 2: **Timeline View is Essential**

Professional storyboards show scenes as a horizontal timeline:
```
[Scene 1: 00:00-00:05] → [Scene 2: 00:05-00:10] → [Scene 3: 00:10-00:15] → [END]
```

Our React Flow canvas is great for complex branching, but 90% of storyboards are linear sequences. Users want to see the flow, not arrange nodes.

### 💡 Key Insight 3: **Character Lock is a Killer Feature**

Professional storyboards have a "character reference" that persists across all scenes. Our per-scene reference images force users to re-upload the same character for every scene.

### 💡 Key Insight 4: **Opening/Closing Frames Matter**

Professional storyboards start with a logo/brand frame and end with an END card. We have no concept of these — they're special scene types that don't need prompts.

---

## 2. Implementation Effort Analysis

### Priority 1: Timeline View (Replace Canvas)
**Why:** Most impactful UX change. Linear timeline is what 90% of users need.

| Layer | Change | Effort |
|-------|--------|--------|
| **Frontend** | New `TimelineView` component (horizontal scroll, scene cards) | 16h |
| **Frontend** | Toggle between Canvas/Timeline views | 4h |
| **Frontend** | Scene reorder via drag-and-drop in timeline | 8h |
| **Backend** | No changes needed (data model supports linear sequences) | 0h |
| **Database** | Add `sort_order` column to `storyboard_scenes` | 1h |
| **Total** | | **29h** |

**MVP:** Show scenes as horizontal cards with thumbnails, duration, and scene number. No drag-and-drop initially.

**MVP Effort:** **12h** (just display, no reorder)

---

### Priority 2: Character Lock System
**Why:** Eliminates repetitive reference uploads, ensures consistency.

| Layer | Change | Effort |
|-------|--------|--------|
| **Database** | New `characters` table (id, storyboard_id, name, reference_image, description) | 2h |
| **Database** | Add `character_id` column to `storyboard_scenes` | 1h |
| **Backend** | New API: `GET/POST/PUT/DELETE /api/storyboards/{uuid}/characters` | 6h |
| **Backend** | Propagate character reference_image to scene when rendering | 3h |
| **Frontend** | Character panel in storyboard editor (add/edit/delete characters) | 8h |
| **Frontend** | Character selector in scene properties (dropdown) | 4h |
| **Frontend** | Visual indicator on scene node showing locked character | 2h |
| **Total** | | **26h** |

**MVP:** Add character reference at storyboard level, auto-apply to all scenes.

**MVP Effort:** **10h** (just storyboard-level character, no per-scene override)

---

### Priority 3: Opening/Closing Frames
**Why:** Professional polish, brand consistency.

| Layer | Change | Effort |
|-------|--------|--------|
| **Database** | Add `opening_frame` and `closing_frame` columns to `storyboards` table | 1h |
| **Backend** | Handle opening/closing frames in render pipeline (prepend/append) | 4h |
| **Frontend** | Opening frame section in storyboard editor (logo upload, text) | 4h |
| **Frontend** | Closing frame section (END card, fade out options) | 4h |
| **Frontend** | Preview timeline shows opening/closing frames | 2h |
| **Total** | | **15h** |

**MVP:** Just opening frame (logo) and closing frame (text "END").

**MVP Effort:** **6h**

---

### Priority 4: Structured Shot Types
**Why:** Better AI prompt generation, more professional output.

| Layer | Change | Effort |
|-------|--------|--------|
| **Frontend** | Add shot_type field to scene properties (dropdown: wide/medium/close-up/extreme close-up) | 3h |
| **Backend** | Include shot_type in prompt enrichment | 2h |
| **Database** | Add `shot_type` column to `storyboard_scenes` | 1h |
| **Total** | | **6h** |

---

### Priority 5: Scene Timestamps
**Why:** Professional polish, easy to reference specific moments.

| Layer | Change | Effort |
|-------|--------|--------|
| **Frontend** | Calculate and display timestamps per scene (00:00 → 00:05) | 3h |
| **Backend** | No changes (timestamps are derived from duration) | 0h |
| **Total** | | **3h** |

---

## 3. Effort Summary

| Priority | Feature | Total Effort | MVP Effort | Value |
|----------|---------|--------------|------------|-------|
| 1 | Timeline View | 29h | 12h | 🔴 Critical |
| 2 | Character Lock | 26h | 10h | 🔴 Critical |
| 3 | Opening/Closing | 15h | 6h | 🟡 High |
| 4 | Shot Types | 6h | 6h | 🟡 High |
| 5 | Timestamps | 3h | 3h | 🟢 Medium |
| **Total** | | **79h** | **37h** | |

---

## 4. What Can We Do WITHOUT Major Refactoring?

### Already Done ✅
- Camera movement dropdown (11 types) — matches professional standard
- Style/Mood/Lighting dropdowns — professional quality
- Scene duration per scene — professional standard
- Reference images per scene — professional standard
- Edge labels between scenes — professional standard

### Quick Wins (1-3 days each)
1. **Timestamps** — just display calculated values (3h)
2. **Shot Type dropdown** — add one more field (6h)
3. **Opening frame** — add logo upload to storyboard (3h MVP)

### Medium Effort (1 week each)
1. **Timeline View** — new component, toggle from canvas (12h MVP)
2. **Character Lock** — new table + API + UI (10h MVP)

### Major Effort (2+ weeks)
1. **Full Timeline with Drag-and-Drop** (29h)
2. **Full Character System with Per-Scene Override** (26h)

---

## 5. Recommendations

### What Should We Do FIRST?

**Week 1: Quick Wins**
1. Add timestamps to scene display (3h)
2. Add shot_type dropdown (6h)
3. Add opening frame (logo) support (3h MVP)

**Total: 12h — 1.5 days**

### What Gives Most Value for Least Effort?

**Timeline View MVP (12h)** — This is the single most impactful change. Users will immediately understand the storyboard flow without learning React Flow.

### What Can Wait?

- Full character system with per-scene override
- Drag-and-drop reordering in timeline
- Closing frame with multiple options
- Advanced shot composition controls

---

## 6. Minimal Viable Improvement Plan

If we have **1 week (40h)**, do this:

1. **Timeline View MVP** (12h) — Show scenes as horizontal cards
2. **Character Lock MVP** (10h) — Storyboard-level character reference
3. **Opening Frame MVP** (3h) — Logo upload
4. **Shot Type Dropdown** (6h) — Add to scene properties
5. **Timestamps** (3h) — Display calculated values
6. **Polish & Testing** (6h)

**Result:** Professional-looking storyboard editor that matches 80% of what users need.

---

## 7. What We Got Right

Our current implementation actually has several professional-grade features:

1. ✅ **Structured dropdowns** for camera, style, mood, lighting (11+ options each)
2. ✅ **Per-scene duration** control
3. ✅ **Reference images** per scene
4. ✅ **Edge labels** for scene transitions
5. ✅ **Credit estimation** before rendering
6. ✅ **AI prompt enrichment** with anti-slop
7. ✅ **Template system** with 30 production templates
8. ✅ **Mobile responsive** layout
9. ✅ **One-Shot mode** for single-generation storyboards
10. ✅ **Multi-Scene mode** for traditional storyboards

The gap is mainly in **UX paradigm** (canvas vs timeline) and **consistency features** (character lock, opening/closing frames).

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Timeline view breaks existing canvas users | High | Keep both views, toggle switch |
| Character lock adds complexity | Medium | Start with storyboard-level only |
| Opening/closing frames increase render time | Low | Only render if user adds them |
| Timestamps confuse users | Low | Show as optional display, not required |

---

## 9. Next Steps

1. **Review this analysis** with team
2. **Prioritize** which improvements to implement first
3. **Create detailed technical specs** for each feature
4. **Start with Timeline View MVP** — highest impact, moderate effort

---

## Appendix: Current Camera Movement Options

Our current 11 camera options (from `options.ts`):

| Value | Label (VI) | Description |
|-------|------------|-------------|
| Fixed | Đứng Yên | Machine gun fixed, no movement |
| Pan Left | Quét Trái | Machine gun rotates right to left |
| Pan Right | Quét Phải | Machine gun rotates left to right |
| Zoom In | Phóng To | Move closer to subject |
| Zoom Out | Thu Nhỏ | Move away from subject |
| Dolly | Trượt Tới | Machine gun slides on rails towards subject |
| Tracking | Bám Theo | Machine gun moves parallel to subject |
| Crane Up | Cẩu Lên | Machine gun rises up |
| Crane Down | Cẩu Xuống | Machine gun descends from above |
| Handheld | Cầm Tay | Machine gun shakes slightly |

Professional storyboards typically have 12+ options. We're missing:
- Tilt Up/Down (vertical pan)
- Rack Focus (focus pull)
- Whip Pan (fast pan)
- Steadicam (smooth follow)
- Drone/Aerial shot

**Recommendation:** Add these 5 options to match professional standard. Effort: 2h.
