> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Cost optimization

> Spend less on text, image, video, and speech API calls while maintaining output quality

Qwen Cloud models use different billing models depending on the modality: text models charge per token, image generation charges per image, video generation charges per second of output, TTS charges per character, and ASR charges per audio duration. This guide covers practical strategies for reducing costs across all modalities while maintaining output quality. Each strategy can be used independently or combined for greater savings.

## Optimize your API usage

The most direct way to cut costs is to use fewer resources per task:

- **Consolidate API calls**: If you're making multiple small requests, consider merging them into a single call. For example, classify ten items in one prompt instead of sending ten separate requests.
- **Keep prompts lean**: Remove redundant instructions from system prompts, limit conversation history to recent turns, and set `max_tokens` to prevent unnecessarily long outputs.
- **Match model to task complexity**: Reserve high-capability models (qwen3.7-max) for tasks that genuinely need advanced reasoning. For straightforward jobs like classification, extraction, or summarization, lighter models such as qwen3.5-flash deliver good results at a fraction of the price. See [Model overview](/developer-guides/getting-started/model-selection) for model comparisons.

These practices also tend to improve response speed. For more latency-focused techniques, see [Latency optimization](/developer-guides/run-and-scale/latency-optimization).

### Optimize non-text API usage

**Image generation**

- Image generation is billed per image regardless of resolution, so resolution does not affect cost. However, lower resolutions reduce generation time.
- Minimize `n` (number of images per request), since each generated image is billed separately.
- Disable prompt rewriting (`prompt_extend`) in production when you already have well-crafted prompts to avoid unnecessary processing costs.

**Video generation**

- During iteration, use short preview durations and lower resolutions (480P/720P). Most models require 5+ seconds; wan2.6 models support 2+ seconds. Render at high resolution (e.g., 15 seconds) only for final output.
- 480P or 720P is often sufficient for previews and social media content -- skip 1080P unless necessary.
- Reuse reference images and videos across multiple generations to avoid redundant uploads.

**Speech**

- Choose the right TTS model for your scenario: `flash` variants are the most cost-effective for simple narration. Reserve `instruct` models for scenarios requiring emotional expression or fine control. See [Speech synthesis](/developer-guides/speech/tts).
- Batch short text segments into a single TTS call rather than making many small requests.
- For ASR, compress audio files before submission to reduce upload time. Note that ASR is billed by audio duration, so compression does not affect cost.

## Batch calling

Batch calling applies to text generation models only. If your workload doesn't require real-time responses, batch calling cuts token costs by **50%**. You package requests into a JSONL file, submit them as a single job, and download the results once processing finishes — usually within 24 hours.

Common use cases:

- Offline evaluation and benchmarking
- Bulk classification or data labeling
- Large-scale embedding generation

Supported models: qwen-max, qwen-plus, qwen-flash, qwen-turbo.

[Get started with batch calling](/developer-guides/text-generation/batch)

## Context cache

Context cache applies to text and vision models only. Reduce input token costs when your requests share common prefixes — such as long system prompts, reference documents, or conversation history. Context cache avoids redundant computation on repeated content, improving both speed and cost.

Qwen Cloud offers three cache modes:

| Mode               | How it works                                                            | Cache hit cost              |
| ------------------ | ----------------------------------------------------------------------- | --------------------------- |
| **Explicit cache** | Manually mark content to cache. Guaranteed hit for 5 minutes.           | 10% of standard input price |
| **Implicit cache** | Automatic — no configuration needed. System identifies common prefixes. | 20% of standard input price |
| **Session cache**  | Designed for multi-turn conversations with the Responses API.           | 10% of standard input price |

[Get started with context cache](/developer-guides/text-generation/context-cache)

<Note>
  Batch calling and context cache discounts cannot be combined on the same request.
</Note>

## Cost comparison

Here's how these strategies stack up for a hypothetical workload of 10 million input tokens + 5 million output tokens using qwen-plus:

| Strategy                                    | Input cost                      | Output cost    | Total      |
| ------------------------------------------- | ------------------------------- | -------------- | ---------- |
| **Standard**                                | 10M x $0.4 = $4                 | 5M x $1.2 = $6 | **\$10**   |
| **Batch calling** (50% off)                 | 10M x $0.2 = $2                 | 5M x $0.6 = $3 | **\$5**    |
| **Context cache** (80% cache hit, implicit) | 2M x $0.4 + 8M x $0.08 = \$1.44 | 5M x $1.2 = $6 | **\$7.44** |

<Note>
  Actual savings depend on your cache hit rate, prompt structure, and model choice. See [Pricing](/developer-guides/getting-started/pricing) for full rate tables.
</Note>

### Non-text cost optimization examples

The table below illustrates how parameter choices affect cost for non-text modalities:

| Modality             | Baseline scenario                                | Optimized scenario                                            | Savings approach                                            |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Image generation** | 100 images with n=4 per call (400 billed images) | 100 images with n=1 per call (100 billed images)              | Generate only the images you need; disable prompt rewriting |
| **Video generation** | 10 videos at 1080P, 15s each                     | 10 videos at 720P, 5s during iteration + 2 final at 1080P 15s | Low-res previews; full render only for finals               |
| **TTS**              | 10,000 characters via instruct model             | 10,000 characters via flash model                             | Use cheapest model that meets quality needs                 |

See [Pricing](/developer-guides/getting-started/pricing) for current per-unit rates for each modality and model.

## Next steps

- [Pricing](/developer-guides/getting-started/pricing) — Understand billing modes and model rates
- [Batch calling](/developer-guides/text-generation/batch) — Step-by-step batch API guide
- [Context cache](/developer-guides/text-generation/context-cache) — Cache modes and usage details
- [Image models](/developer-guides/getting-started/image-models) — Image generation model options and pricing
- [Video models](/developer-guides/getting-started/video-models) — Video generation model options and pricing
- [Speech synthesis](/developer-guides/speech/tts) — TTS model selection and cost considerations
- [Latency optimization](/developer-guides/run-and-scale/latency-optimization) — Strategies that also reduce costs
