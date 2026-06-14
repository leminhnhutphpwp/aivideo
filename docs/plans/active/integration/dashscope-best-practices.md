# DashScope (Alibaba Cloud Model Studio) — Best Practices Reference

## Date
2026-06-01

## Overview
Tổng hợp best practices từ Alibaba Cloud Model Studio (DashScope) docs cho 6 lĩnh vực: prompt engineering (text, image, video), rate limiting, cache, và third-party model integration. Mỗi section bao gồm: best practices từ docs, gap analysis với project hiện tại, và đề xuất cập nhật.

---

## 1. Text-to-Text Prompt Guide

### 1.1 Prompt Framework (COSTAR)
Alibaba recommends the **COSTAR framework** for structured prompts:
- **C**ontext — Background info related to the task
- **O**bjective — Clear task description
- **S**tyle — Writing style (celebrity, expert, etc.)
- **T**one — Formal, humorous, warm, caring
- **A**udience — Target reader group
- **R**esponse — Exact output format (JSON, list, report)

### 1.2 Prompt Optimization Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| **Few-shot examples** | Provide 2-5 input/output examples | Style-sensitive tasks (customer service, formatting) |
| **Chain-of-Thought (CoT)** | "Let's think step by step" | Complex reasoning, math, logic |
| **Prompt Chaining** | Multi-round conversation guiding LLM | Complex tasks with fixed decomposition patterns |
| **Separators** | Use `###`, `===`, `>>>` to delimit sections | Long prompts with multiple content blocks |
| **Task steps** | Break complex tasks into numbered steps | Multi-step workflows |
| **Output examples** | Show exact format expected | Structured output (JSON, tables) |

### 1.3 System Prompt Best Practices
- Define role, tone, task objectives, constraints
- Place at beginning of `messages` array
- Keep stable content at top, dynamic content at bottom (for caching)
- For knowledge-base apps: add restriction "answer only from knowledge base"
- Use prompt templates for reusability (separate logic from content)

### 1.4 Deep Thinking Models
- Use `enable_thinking: true` for complex reasoning
- Use `thinking_budget` to limit token consumption
- Hybrid thinking mode: toggle on/off per query complexity
- Thinking-only mode: always think, no disable option

### 1.5 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| Prompt templates | ✅ Reusable templates with API | ❌ Hardcoded in code | **MEDIUM** — maintainability |
| Few-shot library | ✅ Built-in sample library with RAG | ❌ Not implemented | **LOW** — not needed yet |
| CoT/thinking | ✅ Qwen3 thinking mode | ❌ Not used | **MEDIUM** — could improve AI compile |
| System prompt design | ✅ COSTAR framework documented | ⚠️ Ad-hoc prompts | **LOW** — working fine |
| Prompt chaining | ✅ Multi-round guided reasoning | ❌ Not implemented | **LOW** — not needed yet |

### 1.6 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Apply COSTAR framework to `AiPromptCompiler` system prompt | 30min | 🟡 P1 |
| 2 | Add `enable_thinking` for complex storyboard compilation | 1h | 🟢 P2 |
| 3 | Document prompt templates in `apps/skills/` for reuse | 1h | 🟢 P2 |

---

## 2. Text-to-Image Prompt Guide

### 2.1 Prompt Formula

**Basic formula:**
```
Prompt = Entity + Environment + Style
```

**Advanced formula:**
```
Prompt = Entity (description) + Environment (description) + Style (definition) + Camera language + Atmosphere + Detail modifiers
```

### 2.2 Prompt Vocabulary Reference

**Styles (keywords):**
| Style | Keyword | Use Case |
|-------|---------|----------|
| 3D cartoon | `3D cartoon style` | Animated, playful |
| Realistic | `realistic` | Photography |
| Watercolor | `watercolor` | Soft, painterly |
| Clay | `clay style` | Tactile, handmade |
| Ink painting | `ink painting` | Traditional East Asian |
| Surrealism | `surrealist style` | Dreamlike |
| Post-apocalyptic | `post-apocalyptic style` | Dystopian |

**Camera Language:**
| Dimension | Keywords |
|-----------|----------|
| Shot size | `extreme close-up`, `close-up`, `medium shot`, `wide shot`, `aerial view` |
| Perspective | `eye level`, `low angle`, `high angle`, `bird's eye`, `worm's eye` |
| Lens | `35mm`, `50mm portrait`, `wide angle`, `macro`, `telephoto` |
| Lighting | `golden hour`, `blue hour`, `studio lighting`, `neon light`, `backlight`, `moonlight` |

**Atmosphere:**
| Mood | Keywords |
|------|----------|
| Dreamy | `ethereal`, `soft focus`, `bokeh` |
| Majestic | `epic`, `grand`, `cinematic` |
| Dark | `moody`, `dramatic`, `noir` |
| Warm | `cozy`, `inviting`, `warm tones` |

### 2.3 Negative Prompt Best Practices

**Standard negative prompt (Alibaba recommended):**
```
Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-figure appearance, lack of facial detail, excessive smoothness, AI-looking artifacts, chaotic composition, blurry or warped text
```

**When to use:**
- Prevent unwanted elements (e.g., `negative_prompt: "people"`)
- Improve quality (remove common AI artifacts)
- Max 500 characters, auto-truncated

### 2.4 prompt_extend Parameter

| Setting | Behavior | Latency |
|---------|----------|---------|
| `true` (default) | LLM rewrites short prompts, adds detail | +3-5 seconds |
| `false` | Use raw prompt as-is | No extra latency |

**Recommendation:** Enable for brief prompts, disable for detailed/precise control.

### 2.5 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| Negative prompt | ✅ Supported (500 chars) | ❌ Not implemented | **HIGH** — improves quality |
| prompt_extend | ✅ Auto-rewrites short prompts | ❌ Not used | **HIGH** — easy win |
| Prompt vocabulary | ✅ Documented dictionary | ⚠️ Skills have some | **MEDIUM** — could expand |
| Style keywords | ✅ 15+ styles documented | ⚠️ Limited in skills | **MEDIUM** — add more |
| Camera language | ✅ Comprehensive reference | ⚠️ Some in skills | **LOW** — partially covered |

### 1.6 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Add `negative_prompt` field to image generation API | 1h | 🔴 P0 |
| 2 | Add `prompt_extend: true` default to all image requests | 30min | 🔴 P0 |
| 3 | Expand `apps/skills/image-direction/` with full vocabulary | 2h | 🟡 P1 |
| 4 | Add negative prompt presets in UI (quality, style, etc.) | 1h | 🟡 P1 |

---

## 3. Text-to-Video / Image-to-Video Prompt Guide

### 3.1 Text-to-Video Prompt Formulas

**Basic formula:**
```
Prompt = Entity + Scene + Motion
```

**Advanced formula:**
```
Prompt = Entity (description) + Scene (description) + Motion (description) + Aesthetic control + Stylization
```

**Sound formula (Wan 2.5/2.6):**
```
Prompt = Entity + Scene + Motion + Sound description (voice/sound effect/BGM)
```

**Multi-shot formula (Wan 2.6):**
```
Prompt = Overall description + Shot number + Timestamp + Shot content
```

**Reference-to-video formula (Wan 2.6):**
```
Prompt = @Starring Role + Action + Dialogue + Scene
```

### 3.2 Image-to-Video Prompt

```
Prompt = Motion description + Camera movement
```

- Image defines entity, scene, and style
- Prompt focuses on motion and camera only
- Use `fixed camera` or `static shot` for no camera movement

### 3.3 Sound Description Structure

```
Voice = Character's lines + Emotion + Tone + Speed + Timbre + Accent
Sound effect = Source material + Action + Ambient sound
Background music = Background music/score + Style
```

**Example:**
```
A man is doing a stand-up comedy routine. He says, "Study hard and make progress every day," in a relaxed tone, at a moderate speed, with a clear voice, in American English.
```

### 3.4 Camera Movement Keywords

| Movement | Keyword | Effect |
|----------|---------|--------|
| Push in | `camera pushes in` | Focus on subject |
| Pull back | `camera pulls back` | Reveal context |
| Pan left/right | `camera pans left/right` | Follow action |
| Tilt up/down | `camera tilts up/down` | Show vertical space |
| Dolly in/out | `dolly in`, `dolly out` | Smooth approach/retreat |
| Tracking shot | `tracking shot` | Follow subject |
| Crane shot | `crane shot` | Aerial movement |
| Handheld | `handheld camera` | Documentary feel |
| Static | `fixed camera`, `static shot` | No movement |

### 3.5 Resolution & Duration

| Model | Resolution | Duration | Notes |
|-------|-----------|----------|-------|
| wan2.7-t2v | 720P, 1080P | 2-15s | **Recommended** — newest |
| wan2.6-t2v | 720P, 1080P | 2-15s | Audio sync, multi-shot |
| wan2.5-t2v-preview | 480P, 720P, 1080P | 5s, 10s | Preview |
| wan2.2-t2v-plus | 480P, 1080P | 5s | Cost-effective |
| wan2.1-t2v-turbo | 480P, 720P | 5s | Cheapest |

**Cost formula:** `Cost = Unit price (resolution-based) × Duration (seconds)`

### 3.6 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| Multi-shot narrative | ✅ `shot_type: "multi"` | ❌ Not implemented | **HIGH** — key feature |
| Sound generation | ✅ Voice + SFX + BGM in prompt | ❌ Separate voiceover | **MEDIUM** — different approach |
| Reference-to-video | ✅ Character consistency | ❌ Not implemented | **HIGH** — character stories |
| prompt_extend | ✅ Auto-optimize short prompts | ❌ Not used | **HIGH** — easy win |
| Camera movement | ✅ Comprehensive keywords | ⚠️ Partial in skills | **MEDIUM** — expand |
| Negative prompt | ✅ Prevent unwanted elements | ❌ Not implemented | **MEDIUM** — quality |

### 3.7 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Add `prompt_extend: true` to all video requests | 30min | 🔴 P0 |
| 2 | Add `negative_prompt` support to video generation | 1h | 🟡 P1 |
| 3 | Implement `shot_type: "multi"` for wan2.6 | 2h | 🟡 P1 |
| 4 | Expand `apps/skills/video-direction/` with full vocabulary | 3h | 🟡 P1 |
| 5 | Add camera movement presets in UI | 2h | 🟢 P2 |
| 6 | Investigate reference-to-video (wan2.6-r2v) integration | 4h | 🟢 P2 |

---

## 4. Rate Limiting Best Practices

### 4.1 DashScope Rate Limit Rules

**Three types of limits:**
1. **瞬时频率限制 (RPS/TPS)** — Per-second requests and tokens
2. **增速限制 (Traffic Burst)** — Short-term spike detection
3. **分配配额限制 (TPM/TPM)** — Per-minute tokens and requests

**Error codes:**
| Error Code | Meaning | Action |
|------------|---------|--------|
| `Throttling.RateQuota` | RPM/TPM exceeded | Wait 1 min, reduce frequency |
| `Throttling.BurstRate` | Too fast increase | Smooth scheduling, exponential backoff |
| `Throttling.AllocationQuota` | Token quota exceeded | Shorten input/output |

### 4.2 Client-Side Strategies (4 levels)

**Level 1: Basic Retry**
```python
@retry(
    wait=wait_random_exponential(min=1, max=60),
    stop=stop_after_attempt(6),
    retry=retry_if_exception_type(RETRYABLE_ERRORS)
)
def chat_with_retry(client, model, messages):
    return client.chat.completions.create(model=model, messages=messages)
```
- Random jitter prevents thundering herd
- Exponential backoff: 1s → 2s → 4s → 8s → 16s → 32s

**Level 2: Request Rate Limiting (Token Bucket)**
- RPM token bucket: limit requests per minute
- Concurrency semaphore: limit parallel requests
- Must acquire RPM token BEFORE concurrency slot
- Initialize with `initial_tokens=0` for cold start

**Level 3: Traffic Shaping (RPM + TPM)**
- Dual resource control: both RPM and TPM buckets
- Input pre-deducted, output settled after completion
- Minimum interval between requests (pacing)

**Level 4: Adaptive Congestion Control (BBR-inspired)**
- TPT (Time Per Token) as congestion metric
- Hold concurrency on delay, don't backoff
- Drain state on 429, fast recovery after cooldown

### 4.3 Server-Side Queue Wait

DashScope supports `X-DashScope-Wait-Timeout` header:
```
X-DashScope-Wait-Timeout: 30  // seconds
```
- Server queues request instead of returning 429
- Recommended: 3-120 seconds
- Adjust client timeout: base_timeout + wait_timeout

### 4.4 Connection Reuse

**Python SDK:**
```python
import aiohttp
connector = aiohttp.TCPConnector(limit=100, limit_per_host=10)
session = aiohttp.ClientSession(connector=connector)
```

**Java SDK (built-in pool):**
| Parameter | Default | Tuning |
|-----------|---------|--------|
| connectionPoolSize | 32 | Increase for high concurrency |
| maximumAsyncRequests | 32 | Must ≤ connectionPoolSize |
| connectionIdleTimeout | 300s | Extend for persistent connections |

### 4.5 Backup Model Pattern

```python
async def task(i):
    # Try primary model
    if await send_request(MODEL):
        return True
    # If rate-limited, try backup
    return await send_request(BACKUP_MODEL)
```

### 4.6 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| Exponential backoff | ✅ Documented pattern | ❌ Not implemented | **HIGH** — reliability |
| Token bucket | ✅ RPM + TPM control | ❌ Not implemented | **HIGH** — production |
| Server-side queue | ✅ X-DashScope-Wait-Timeout | ❌ Not used | **MEDIUM** — reduces 429 |
| Connection reuse | ✅ SDK built-in pools | ❌ New connection each call | **MEDIUM** — latency |
| Backup model | ✅ Documented pattern | ⚠️ Some fallback | **MEDIUM** — expand |
| Batch API | ✅ 50% cost discount | ❌ Not implemented | **MEDIUM** — cost savings |

### 4.7 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Implement exponential backoff with jitter for all API calls | 2h | 🔴 P0 |
| 2 | Add `X-DashScope-Wait-Timeout: 30` header | 30min | 🔴 P0 |
| 3 | Implement token bucket rate limiter (RPM control) | 4h | 🟡 P1 |
| 4 | Enable connection reuse in DashScope HTTP client | 1h | 🟡 P1 |
| 5 | Add backup model fallback for rate-limited requests | 2h | 🟡 P1 |
| 6 | Implement batch API for non-real-time tasks | 4h | 🟢 P2 |

---

## 5. Explicit Cache Best Practices

### 5.1 Cache Types

| Type | How It Works | Hit Guarantee | Cost |
|------|-------------|---------------|------|
| **Explicit cache** | Manual `cache_control` markers | ✅ 100% deterministic | Creation: 125% input price, Hit: 10% |
| **Implicit cache** | Automatic prefix matching | ❌ Not guaranteed | Hit: 20% input price |

**Mutually exclusive** — a request uses one or the other, not both.

### 5.2 Explicit Cache Rules

1. **Minimum cacheable content**: 1024 tokens
2. **Maximum markers per request**: 4
3. **Cache TTL**: 5 minutes (resets on each hit)
4. **Marker format**: `"cache_control": {"type": "ephemeral"}`
5. **Content must be array form** (not string) to support markers
6. **Backward prefix matching**: checks last 20 content blocks from marker

### 5.3 Multi-Marker Strategy

For fine-grained control, use up to 4 markers on different roles:
```
1. System prompt — stable persona (marker 1)
2. Skills/tools definitions — may change in combination (marker 2)
3. Project context — may switch or compress (marker 3)
4. User messages / tool calls — grows each turn (marker 4)
```

**Result:** Q2 prefix (persona + tools + knowledge = 7,659 tokens) unchanged → full cache hit. Only new content after marker 2 requires processing.

### 5.4 Multi-Turn Conversation Pattern

Add cache marker to last message in each request:
```
Turn 1: [system] [user1] → creates cache
Turn 2: [system] [user1] [assistant1] [user2] → hits cache from Turn 1
Turn 3: [system] [user1] [assistant1] [user2] [assistant2] [user3] → hits cache from Turn 2
```

### 5.5 Batch Processing Pattern

For processing many items with same system prompt:
- Add `cache_control` marker only on system prompt
- All subsequent requests hit the cache
- Process 10,000 items with minimal input token cost

### 5.6 Implicit Cache Tips

- Place static content first, variable content last
- Content < 256 tokens won't be cached
- No configuration needed, always active for supported models
- Check `usage.cached_tokens` in response for hit count

### 5.7 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| Explicit cache | ✅ Manual markers | ❌ Not implemented | **MEDIUM** — cost savings |
| Implicit cache | ✅ Automatic | ❌ Not configured | **LOW** — auto-enabled |
| Multi-turn cache | ✅ Pattern documented | N/A | N/A — not multi-turn |
| Batch cache | ✅ System prompt only | ❌ Not implemented | **LOW** — not needed yet |

### 5.8 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Add `cache_control` marker to system prompt in text generation calls | 1h | 🟡 P1 |
| 2 | Monitor `cached_tokens` in usage response for cost tracking | 1h | 🟡 P1 |
| 3 | For batch jobs: cache system prompt, iterate user content | 2h | 🟢 P2 |

---

## 6. Third-Party Model Integration Tutorial

### 6.1 DashScope's Integration Pattern

DashScope provides **two abstraction layers**:

1. **DashScope SDK** — Native protocol, full feature access
2. **OpenAI-compatible API** — Drop-in replacement for OpenAI SDK

**OpenAI-compatible endpoint:**
```
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

**Just change 3 things:**
- `base_url` → DashScope endpoint
- `api_key` → DashScope API key
- `model` → DashScope model name

### 6.2 Custom Plugin Pattern

DashScope supports custom plugins for third-party API integration:

1. **Create plugin** → Configure API path, auth, parameters
2. **Add tool** → Define input/output parameters, business pass-through
3. **Test** → Online connectivity test
4. **Publish** → Make available in applications
5. **Use** → Associate with agent, call via API

**Auth support:**
- Query parameter (`api_key=xxx`)
- Header (`Authorization: Bearer xxx`)
- Business pass-through via `biz_params`

### 6.3 Assistant API (Tool Calling)

```python
# Define tool
translation_tool = {
    "type": "function",
    "function": {
        "name": "translate_text",
        "description": "Translate text into the specified target language",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "The text to be translated"},
                "target_language": {"type": "string", "description": "Target language code"}
            },
            "required": ["text", "target_language"]
        }
    }
}

# Create assistant with tool
assistant = Assistants.create(
    model='qwen-plus',
    name='Translation Assistant',
    tools=[translation_tool]
)

# Handle tool calling
if run.required_action:
    for tool_call in run.required_action.submit_tool_outputs.tool_calls:
        if tool_call.function.name == "translate_text":
            args = json.loads(tool_call.function.arguments)
            translation = translate_text(args["text"], args["target_language"])
            Runs.submit_tool_outputs(
                thread_id=thread.id,
                run_id=run.id,
                tool_outputs=[{"tool_call_id": tool_call.id, "output": translation}]
            )
```

### 6.4 Error Handling Across Providers

| Error | DashScope Code | OpenAI Code | Action |
|-------|---------------|-------------|--------|
| Auth failure | `InvalidApiKey` | `invalid_api_key` | Check key |
| Rate limit | `Throttling.RateQuota` | `429` | Backoff + retry |
| Content moderation | `DataInspectionFailed` | N/A | Show user message |
| Model not found | `Model not exist` | `model_not_found` | Check model name + region |
| Invalid params | `InvalidParameter` | `invalid_request_error` | Validate input |

### 6.5 Gap Analysis — Our Project

| Feature | DashScope | Our Project | Gap |
|---------|-----------|-------------|-----|
| OpenAI-compatible | ✅ Full support | ⚠️ Uses native SDK | **LOW** — working fine |
| Custom plugins | ✅ Console + API | ❌ Not implemented | **LOW** — not needed |
| Tool calling | ✅ Assistant API | ❌ Not used | **LOW** — not needed |
| Error mapping | ✅ Comprehensive codes | ⚠️ Generic handling | **MEDIUM** — improve |
| Multi-region | ✅ 4 regions | ⚠️ Single endpoint | **LOW** — could optimize |

### 6.6 Actionable Items
| # | Item | Effort | Priority |
|---|------|--------|----------|
| 1 | Map DashScope error codes to user-friendly Vietnamese messages | 1h | 🟡 P1 |
| 2 | Add region-specific error handling (cross-region calls fail) | 30min | 🟡 P1 |
| 3 | Consider OpenAI-compatible endpoint for simpler integration | 2h | 🟢 P2 |

---

## 7. Implementation Priority Matrix

| # | Best Practice | Effort | Impact | Priority | Dependencies |
|---|--------------|--------|--------|----------|-------------|
| 1 | Exponential backoff + jitter | 2h | HIGH | 🔴 P0 | None |
| 2 | `prompt_extend: true` default | 30min | HIGH | 🔴 P0 | None |
| 3 | Server-side queue wait header | 30min | HIGH | 🔴 P0 | None |
| 4 | Negative prompt support (image + video) | 2h | MEDIUM | 🟡 P1 | UI changes |
| 5 | Connection reuse in HTTP client | 1h | MEDIUM | 🟡 P1 | None |
| 6 | Token bucket rate limiter | 4h | MEDIUM | 🟡 P1 | None |
| 7 | Multi-shot narrative (`shot_type: "multi"`) | 2h | MEDIUM | 🟡 P1 | wan2.6 model |
| 8 | Backup model fallback | 2h | MEDIUM | 🟡 P1 | None |
| 9 | Explicit cache markers | 1h | LOW | 🟢 P2 | None |
| 10 | Batch API for non-real-time tasks | 4h | LOW | 🟢 P2 | None |
| 11 | Camera movement presets UI | 2h | LOW | 🟢 P2 | None |
| 12 | Reference-to-video integration | 4h | LOW | 🟢 P2 | wan2.6-r2v |

**Total estimated effort**: ~22 hours

---

## 8. Quick Wins (This Sprint — < 2 hours total)

| # | Change | Time | Files |
|---|--------|------|-------|
| 1 | Add `prompt_extend: true` to all DashScope requests | 10min | `apps/daemon/src/media/providers/dashscope.ts` |
| 2 | Add `X-DashScope-Wait-Timeout: 30` header | 10min | `apps/daemon/src/media/providers/dashscope.ts` |
| 3 | Change polling interval 5s → 15s | 5min | `apps/daemon/src/services/task-manager.ts` |
| 4 | Add exponential backoff for 429 errors | 30min | `apps/daemon/src/media/providers/dashscope.ts` |
| 5 | Add negative prompt passthrough | 30min | `apps/daemon/src/media/providers/dashscope.ts` |

---

## 9. Sources

- [Text-to-video prompt guide](https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt)
- [Text-to-image prompt guide](https://www.alibabacloud.com/help/en/model-studio/text-to-image-prompt)
- [Rate limits](https://www.alibabacloud.com/help/en/model-studio/rate-limit)
- [Rate limiting best practices (Chinese)](https://help.aliyun.com/zh/model-studio/rate-limiting-best-practices)
- [Explicit cache best practices](https://www.alibabacloud.com/help/en/model-studio/explicit-cache-best-practice)
- [Context cache](https://www.alibabacloud.com/help/en/model-studio/context-cache)
- [Connection reuse](https://www.alibabacloud.com/help/en/model-studio/connection-multiplexing-configuration)
- [Custom plugins](https://www.alibabacloud.com/help/en/model-studio/custom-plug-ins)
- [Assistant API (tool calling)](https://www.alibabacloud.com/help/en/model-studio/function-calling)
- [Prompt engineering guide](https://www.alibabacloud.com/help/en/model-studio/prompt-engineering-guide)
- [Video generation models](https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model)
- [Batch API](https://www.alibabacloud.com/help/en/model-studio/batch-interfaces-compatible-with-openai/)
- [High concurrency scenarios](https://www.alibabacloud.com/help/en/model-studio/high-concurrency-scenarios)
- [Existing analysis](./alibaba-model-studio-analysis.md)
