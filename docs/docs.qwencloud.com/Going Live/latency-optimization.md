> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Latency optimization

> Faster response times across text, image, video, and speech models on Qwen Cloud

Latency comes from different sources depending on the modality: for text generation, it is driven by token count and model size; for image and video generation, by rendering time and task queue depth; and for speech, by synthesis startup time and streaming buffer size. This guide covers optimization strategies for each modality, then dives deeper into Qwen Cloud features like context cache and streaming that deliver the most immediate gains for text workloads.

## Text generation: seven areas to optimize

### 1. Choose the right model

Model size is the primary driver of inference speed. A smaller model responds faster and costs less per token.

| Use case                                  | Recommended model | Why                     |
| ----------------------------------------- | ----------------- | ----------------------- |
| Complex reasoning, open-ended generation  | qwen3.7-max       | Highest quality, slower |
| General tasks, balanced speed/quality     | qwen3.6-plus      | Good tradeoff           |
| Classification, extraction, summarization | qwen3.5-flash     | Fast, cost-effective    |

When moving to a smaller model, compensate with more detailed prompts or few-shot examples to maintain quality. A well-prompted qwen3.5-flash can match a loosely-prompted qwen3.7-max for many production tasks.

### 2. Reduce output length

Output generation is the slowest phase of an LLM call — halving output tokens roughly halves total latency. Strategies:

- **Constrain natural language output**: Add explicit length instructions ("respond in one sentence", "under 50 words") or use few-shot examples to demonstrate the desired brevity.
- **Compact structured output**: If your model returns JSON, use short field names (`s` instead of `sentiment_analysis_result`) and omit optional fields.
- **Set hard limits**: Use `max_tokens` to cap output length, or `stop` sequences to terminate generation at a known delimiter.

### 3. Trim input tokens

Input tokens have a smaller impact on latency than output tokens (roughly 1-5% improvement per 50% reduction), but they matter at scale:

- **Prune retrieval results**: In RAG pipelines, rank and filter chunks by relevance before sending them to the model. Strip HTML tags, boilerplate, and navigation elements from web content.
- **Keep conversation history short**: Only include the most recent turns, or summarize older history into a condensed system message.
- **Use few-shot examples to absorb instructions**: Including representative examples in your prompt teaches the model your formatting rules and domain constraints without lengthy written instructions.

### 4. Consolidate requests

Every API call adds network round-trip time. If your workflow chains multiple LLM steps sequentially, consider merging them:

- Ask the model to perform all steps in a single call and return results as a JSON object with named fields for each step.
- For multi-item processing, batch items into one prompt (such as "classify these 10 support tickets") instead of issuing 10 separate calls.

### 5. Run steps in parallel

When your pipeline has independent branches, execute them concurrently. For example, if you need both a summary and a translation, fire both requests at the same time rather than waiting for one to finish.

For sequential steps where one branch is highly predictable (such as content moderation that passes 95% of the time), consider **speculative execution**: start the next step before the check finishes, and discard the result only if the check fails.

### 6. Improve perceived speed

Even when actual latency stays the same, perceived speed makes a real difference to users:

- **Stream responses** so users see tokens as they arrive, rather than waiting for the full response. Monitor **time to first token (TTFT)** as the key streaming performance metric. See [Streaming](/developer-guides/text-generation/streaming).
- **Process output in chunks**: If you need to post-process model output (such as translate or moderate it), stream the output to your backend and forward processed segments to the frontend incrementally.
- **Show progress indicators**: Display which step is running ("Searching knowledge base...", "Generating response...") to keep users engaged during multi-step workflows.

<Note>
  Streaming and chunking reduce the time before the user starts reading, which genuinely shortens the end-to-end experience. Progress indicators are purely psychological but equally important for user satisfaction.
</Note>

### 7. Skip the LLM when you can

Not every part of an AI application needs a model call:

- **Static responses**: Confirmation messages, error text, and standard disclaimers can be hard-coded.
- **Pre-generated content**: For constrained input spaces (such as a dropdown of categories), generate responses offline and serve them instantly.
- **Traditional code**: Formatting, filtering, sorting, and aggregation are faster and more reliable with regular code than with an LLM.

## Image & video generation

Image and video APIs use asynchronous task queues, so latency optimization focuses on reducing rendering time and efficient polling.

**Image generation**

- Disable prompt rewriting (`prompt_extend`) to save 3-5 seconds per request when you already have well-crafted prompts.
- Use a lower resolution (such as 1024x1024 instead of 2048x2048) during iteration. Scale up only for final assets.
- Poll for task completion with exponential backoff -- start at 3 seconds, increase gradually, and set a 2-minute timeout. See [Text-to-image -- Going live](/developer-guides/image-generation/text-to-image#going-live) for production patterns.
- Multiple images (`n=4`) are generated in parallel, so latency is roughly the same as `n=1`. Use `n=1` when you don't need multiple variants to avoid extra cost, since each image is billed separately.

**Video generation**

- Iterate with shorter durations (2-3 seconds) and lower resolutions (480P/720P) before rendering full-length, high-resolution final output.
- Disable prompt rewriting when your prompts are already detailed.
- Single-shot mode is faster than multi-shot mode for simple scenes.
- Host reference images and videos on a fast CDN to minimize upload and download time.

## Audio & speech

**Text-to-speech (TTS)**

- Use streaming output to hear audio within milliseconds of the first synthesized segment, rather than waiting for the entire file. See [Realtime streaming](/developer-guides/speech/realtime-streaming).
- Choose a `flash` model variant for the lowest latency in interactive scenarios.
- Use compressed output formats (mp3, opus) to reduce data transfer time.
- For LLM-powered voice applications, pipeline the LLM's streaming text output directly into the TTS streaming input for end-to-end low latency.

**Automatic speech recognition (ASR)**

- For real-time transcription, use the WebSocket endpoint instead of the REST API. See [ASR realtime](/developer-guides/speech/asr-realtime).
- Compress audio files before uploading to reduce transfer time.
- For large audio files, pass a URL rather than Base64-encoded data to avoid inflating the request payload.

## Context cache

Context cache is Qwen Cloud's most direct latency optimization feature for text and vision models. When consecutive requests share a common prompt prefix, the server reuses cached computation instead of re-processing those tokens, reducing time-to-first-token (TTFT) significantly. Image generation, video generation, and speech APIs use different pricing models and do not have an equivalent caching mechanism.

### How it works

The model's computation proceeds left-to-right through your prompt. If the first N tokens of a new request match a cached prefix, those N tokens are served from cache — only the remaining tokens require fresh computation.

This means **prompt structure matters**: place stable content (system instructions, reference documents, few-shot examples) at the beginning, and variable content (user messages, dynamic RAG results) at the end.

### Three modes

| Mode         | Setup                                          | Cache validity            | Hit cost           |
| ------------ | ---------------------------------------------- | ------------------------- | ------------------ |
| **Explicit** | Add `cache_control` markers to message content | 5 minutes (resets on hit) | 10% of input price |
| **Implicit** | None — active by default                       | Not guaranteed            | 20% of input price |
| **Session**  | Add HTTP header, use Responses API             | 5 minutes (resets on hit) | 10% of input price |

**Implicit cache** requires zero code changes and benefits every application automatically. Use **explicit cache** when you need guaranteed hits and lower pricing for content you control. Use **session cache** for multi-turn chatbots built on the Responses API.

### Explicit cache example

Mark the content you want cached with `cache_control`. The minimum cacheable length is 1024 tokens.

<Tabs>
  <Tab title="Python">
    ```python
    from openai import OpenAI
    import os

    client = OpenAI(
      api_key=os.getenv("DASHSCOPE_API_KEY"),
      base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )

    completion = client.chat.completions.create(
      model="qwen3-max",
      messages=[
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": "You are a helpful assistant specialized in answering questions about our product documentation. Here is the full reference manual:\n\n[... long reference document ...]",
              "cache_control": {"type": "ephemeral"}
            }
          ]
        },
        {
          "role": "user",
          "content": "How do I configure SSO?"
        }
      ]
    )

    print(completion.usage)
    # Check completion.usage.prompt_tokens_details.cached_tokens for cache hits
    ```
  </Tab>

  <Tab title="Node.js">
    ```javascript
    import OpenAI from "openai";

    const openai = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    });

    const completion = await openai.chat.completions.create({
      model: "qwen3-max",
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a helpful assistant specialized in answering questions about our product documentation. Here is the full reference manual:\n\n[... long reference document ...]",
              cache_control: { type: "ephemeral" }
            }
          ]
        },
        {
          role: "user",
          content: "How do I configure SSO?"
        }
      ]
    });

    console.log(completion.usage);
    // Check completion.usage.prompt_tokens_details.cached_tokens for cache hits
    ```
  </Tab>

  <Tab title="curl">
    ```bash
    curl -X POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions \
      -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "qwen3-max",
        "messages": [
          {
            "role": "system",
            "content": [
              {
                "type": "text",
                "text": "You are a helpful assistant specialized in answering questions about our product documentation. Here is the full reference manual:\n\n[... long reference document ...]",
                "cache_control": {"type": "ephemeral"}
              }
            ]
          },
          {
            "role": "user",
            "content": "How do I configure SSO?"
          }
        ]
      }'
    ```
  </Tab>
</Tabs>

On a cache hit, the response includes `cached_tokens` in the usage object:

```json
{
  "usage": {
    "prompt_tokens": 1520,
    "completion_tokens": 85,
    "total_tokens": 1605,
    "prompt_tokens_details": {
      "cached_tokens": 1480,
      "cache_creation_input_tokens": 0
    }
  }
}
```

### Tips for maximizing cache hits

- **Keep your system prompt stable.** Any change to the cached prefix — even a single character — invalidates the cache. Version your system prompts and update them intentionally.
- **Structure prompts as: static prefix + dynamic suffix.** System instructions and reference docs go first; user input and RAG context go last. This maximizes the overlap between requests.
- **Send requests within the 5-minute window.** Explicit and session cache entries expire after 5 minutes of inactivity. For low-traffic applications, consider periodic keep-alive requests.

For the complete guide including session cache setup, supported models, and advanced patterns, see [Context cache](/developer-guides/text-generation/context-cache).

## Putting it all together

Most real applications benefit from combining several of these strategies. Here's a decision framework for a typical RAG-based chatbot:

| Bottleneck                    | Symptoms                                          | Recommended actions                                                                                            |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Slow first token              | High TTFT, user waits before seeing any output    | Enable streaming; use context cache for system prompt; switch to a faster model for the retrieval/routing step |
| Long output generation        | Tokens stream slowly; total response time is high | Reduce output length with explicit instructions; use a faster model if quality allows                          |
| Too many sequential LLM calls | Multi-step pipeline with high end-to-end latency  | Merge steps into a single prompt; parallelize independent steps                                                |
| Large prompt size             | Latency grows with document/history length        | Prune RAG results; summarize history; use context cache to avoid re-computation                                |

### Non-text modality quick reference

| Modality             | Primary latency driver                                   | Top optimization                                                            |
| -------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Image generation** | Rendering time + queue wait                              | Lower resolution; disable prompt rewriting; exponential backoff polling     |
| **Video generation** | Rendering time (proportional to duration and resolution) | Short duration + low resolution for iteration; single-shot mode             |
| **TTS**              | Synthesis startup + data transfer                        | Streaming output; flash model; compressed format (mp3/opus)                 |
| **ASR**              | Upload size + processing time                            | WebSocket endpoint for real-time; URL input for large files; compress audio |

## Next steps

- [Streaming](/developer-guides/text-generation/streaming) — Stream tokens to reduce time-to-first-visible-output
- [Context cache](/developer-guides/text-generation/context-cache) — Detailed cache modes, supported models, and pricing
- [Choose models](/developer-guides/getting-started/model-selection) — Compare model capabilities, speed, and pricing
- [Text-to-image -- Going live](/developer-guides/image-generation/text-to-image#going-live) — Production patterns for image generation
- [Realtime streaming TTS](/developer-guides/speech/realtime-streaming) — Low-latency speech synthesis with streaming
- [ASR realtime](/developer-guides/speech/asr-realtime) — Real-time speech recognition via WebSocket
- [Cost optimization](/developer-guides/run-and-scale/cost-optimization) — Complementary strategies that also improve latency
