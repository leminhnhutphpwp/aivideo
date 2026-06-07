> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Explicit Cache Best Practices

> Explicit cache guarantees deterministic cache hits for identical input content by adding cache markers to your requests, significantly reducing cost and latency.

This topic describes how to use explicit cache and its best practices. By adding cache markers to your requests, explicit cache guarantees deterministic cache hits for identical input content, significantly reducing cost and latency.

## When to use explicit cache

- **You need guaranteed cache hits**: Explicit cache delivers 100% deterministic hits regardless of backend resource scheduling. If your application requires stable content reuse, explicit cache is the right choice.

- **You frequently reuse the same prompt**: When identical or highly consistent prompts are submitted repeatedly, explicit cache significantly reduces costs. Creating the cache incurs only a 25% surcharge over the standard input price, while each subsequent hit saves 90%. A single hit is enough to break even.

- **You manage long contexts in production Agents**: In Agent applications, common mechanisms like compression, recap, and system reminders cause the context to change continuously. Explicit cache lets you pin and reuse key context segments so they remain cached even as the surrounding context evolves.

## Agent and coding tools

The following Agent and coding tools connect to Qwen Cloud through the Anthropic protocol and natively support explicit cache. Configure them following their respective documentation, and they will automatically leverage explicit cache to optimize context management.

<Tabs>
  <Tab title="Claude Code">
    Claude Code v2.x and later automatically includes `cache_control` markers in requests (system, env, and most recent user message). No additional configuration is needed after connecting to Qwen Cloud's Anthropic-compatible endpoint.

    **Configuration**

    Create or edit `~/.claude/settings.json` (Windows: `C:\Users\<username>\.claude\settings.json`) with the appropriate plan settings. Alternatively, connect via environment variables:

    ```bash
    export ANTHROPIC_BASE_URL="https://dashscope-intl.aliyuncs.com/apps/anthropic"
    export ANTHROPIC_AUTH_TOKEN="${DASHSCOPE_API_KEY}"
    export ANTHROPIC_MODEL="qwen3.7-max"
    claude
    ```

    Set the Anthropic protocol endpoint:

    - Token Plan (Team): `https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic`
    - Coding Plan: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
    - Pay-as-you-go: `https://dashscope-intl.aliyuncs.com/apps/anthropic`

    For details, see [Claude Code](/developer-guides/clients-and-developer-tools/claude-code).

    **Optional: Improve cross-session hit rate**

    By default, Claude Code includes dynamic information in the system prompt (current directory, date, git status), which may reduce cross-session cache hit rates. Add the following flag at startup to move dynamic sections to user messages:

    ```bash
    claude --exclude-dynamic-system-prompt-sections
    ```
  </Tab>

  <Tab title="Open Code">
    When OpenCode connects to Qwen Cloud's Anthropic-compatible endpoint via `@ai-sdk/anthropic`, it automatically injects `cache_control` on the system message and the most recent non-system message.

    **Installation**

    ```bash
    npm install -g opencode-ai
    ```

    **Configuration**

    Create the configuration file `~/.config/opencode/opencode.json` (Windows: `C:\Users\<username>\.config\opencode\opencode.json`):

    ```json
    {
      "$schema": "https://opencode.ai/config.json",
      "provider": {
        "bailian": {
          "npm": "@ai-sdk/anthropic",
          "name": "Alibaba Cloud Model Studio",
          "options": {
            "baseURL": "https://dashscope-intl.aliyuncs.com/apps/anthropic/v1",
            "apiKey": "{env:DASHSCOPE_API_KEY}"
          },
          "models": {
            "qwen3.7-max": { "name": "qwen3.7-max" }
          }
        }
      }
    }
    ```

    <Note>
      The `baseURL` must end with `/v1`.
    </Note>

    ```bash
    export DASHSCOPE_API_KEY=sk-xxxxx
    opencode run -m "bailian/qwen3.7-max" "..."
    ```

    Other plan base URLs:

    - Token Plan (Team): `https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1`
    - Coding Plan: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1`

    For details, see [OpenCode](/developer-guides/clients-and-developer-tools/opencode).
  </Tab>

  <Tab title="OpenClaw">
    When using the Anthropic-compatible endpoint, OpenClaw automatically injects `cache_control` markers on the system prompt and the most recent user message. No additional configuration is needed — as long as the provider's Base URL points to `/apps/anthropic`, explicit cache is automatically enabled.

    **Installation**

    ```bash
    npm install -g openclaw
    # or
    curl -fsSL https://openclaw.ai/install.sh | bash
    ```

    **Configuration**

    Edit the configuration file `~/.openclaw/openclaw.json`. Set `"api"` to `"anthropic-messages"` and set the base URL:

    - Token Plan (Team): `https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1`
    - Coding Plan: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1`
    - Pay-as-you-go: `https://dashscope-intl.aliyuncs.com/apps/anthropic/v1`

    For details, see [OpenClaw](/developer-guides/clients-and-developer-tools/openclaw).

    **Optional: Custom cache boundary**

    If your system prompt contains both stable template content and dynamic content (timestamps, CWD, etc.), insert `<!-- OPENCLAW_CACHE_BOUNDARY -->` between them. OpenClaw will apply `cache_control` only to the stable prefix before the boundary, improving cross-session hit rates:

    ```plaintext
    You are a Python engineer following these conventions:
    - type hints required
    - docstrings in Google format
    <!-- OPENCLAW_CACHE_BOUNDARY -->
    Current time: 2026-05-25 18:42
    Working directory: /Users/.../project
    ```

    Without this boundary, OpenClaw applies `cache_control` to the entire system prompt using its built-in strategy, still benefiting from explicit cache.
  </Tab>

  <Tab title="Hermes">
    Configure using the `hermes config set` command. Set the base URL:

    - Token Plan (Team): `https://token-plan.ap-southeast-1.maas.aliyuncs.com/apps/anthropic/v1`
    - Coding Plan: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1`
    - Pay-as-you-go: `https://dashscope-intl.aliyuncs.com/apps/anthropic/v1`

    For details, see [Hermes Agent](/developer-guides/clients-and-developer-tools/hermes-agent).
  </Tab>
</Tabs>

## API integration

### Key points

- Add `"cache_control": {"type": "ephemeral"}` to the message content you want to cache. All content from the beginning of the messages array up to that marker will be cached as a block.
- Cached content must be at least **1024 tokens**.
- A single request supports up to **4** cache markers.
- Cache TTL is **5 minutes**, automatically renewed on each hit.
- Tool definitions are part of the system prompt for caching purposes. If the tools change, the cache will not hit.

### Quick start

The following example demonstrates the basic workflow: the first request creates a cache, and the second request hits it.

<Tabs>
  <Tab title="OpenAI compatible">
    ```python
    from openai import OpenAI
    import os
    client = OpenAI(
      api_key=os.getenv("DASHSCOPE_API_KEY"),
      base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )
    # Long text to cache (must exceed 1024 tokens)
    long_text_content = "<Your Long Text Here>" * 400
    def get_completion(user_input):
      messages = [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": long_text_content,
              # Cache marker: content from the start of messages to this point will be cached
              "cache_control": {"type": "ephemeral"},
            }
          ],
        },
        {"role": "user", "content": user_input},
      ]
      completion = client.chat.completions.create(
        model="qwen3.7-max",
        messages=messages,
        extra_body={"enable_thinking": False},
      )
      return completion
    # First request: creates cache
    first = get_completion("Summarize the key points of this document")
    print(f"Cache created: {first.usage.prompt_tokens_details.cache_creation_input_tokens}")
    print(f"Cache hit: {first.usage.prompt_tokens_details.cached_tokens}")
    # Second request: same system content, different question — hits cache
    second = get_completion("What precautions are mentioned in the document?")
    print(f"Cache created: {second.usage.prompt_tokens_details.cache_creation_input_tokens}")
    print(f"Cache hit: {second.usage.prompt_tokens_details.cached_tokens}")
    ```
  </Tab>

  <Tab title="Anthropic compatible">
    ```python
    import anthropic
    import os
    client = anthropic.Anthropic(
      api_key=os.getenv("DASHSCOPE_API_KEY"),
      base_url="https://dashscope-intl.aliyuncs.com/apps/anthropic",
    )
    # Long text to cache (must exceed 1024 tokens)
    long_text_content = "<Your Long Text Here>" * 400
    def get_completion(user_input):
      response = client.messages.create(
        model="qwen3.7-max",
        max_tokens=1024,
        system=[
          {
            "type": "text",
            "text": long_text_content,
            # Cache marker
            "cache_control": {"type": "ephemeral"},
          }
        ],
        messages=[
          {"role": "user", "content": user_input},
        ],
      )
      return response
    # First request: creates cache
    first = get_completion("Summarize the key points of this document")
    print(f"Cache created: {first.usage.cache_creation_input_tokens}")
    print(f"Cache hit: {first.usage.cache_read_input_tokens}")
    # Second request: hits cache
    second = get_completion("What precautions are mentioned in the document?")
    print(f"Cache created: {second.usage.cache_creation_input_tokens}")
    print(f"Cache hit: {second.usage.cache_read_input_tokens}")
    ```
  </Tab>
</Tabs>

Expected output:

```plaintext
Cache created: 2005
Cache hit: 0
Cache created: 0
Cache hit: 2005
```

The first request creates a cache block. The second request hits the cache because the system prompt content is identical. Cached tokens are billed at only 10% of the standard input price.

### Verify cache status

Check the `usage` field in the response to confirm cache behavior:

- `cache_creation_input_tokens`: Number of tokens for which a new cache was created. A value greater than 0 means a new cache block was created.
- `cached_tokens` (OpenAI compatible) or `cache_read_input_tokens` (Anthropic compatible): Number of tokens that hit cache. A value greater than 0 means the cache was successfully hit.

## Best practices by scenario

### Multi-turn conversations

**Characteristics:**

- Users interact with the model over multiple turns, each request carrying the full conversation history
- Typical use cases: customer service, knowledge Q\&A, code assistants

**Best practice:** Add a `cache_control` marker to the last message in each request. Each turn hits the cache created by the previous turn (the conversation history), while creating a new cache that includes the current turn for the next round.

**Example:**

```python
from openai import OpenAI
import os
client = OpenAI(
  api_key=os.getenv("DASHSCOPE_API_KEY"),
  base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)
# System prompt: product manual (must exceed 1024 tokens)
product_manual = """You are the support assistant for "BaiLian SmartHome" smart home controller. Here is the complete product manual:
## Product Overview
BaiLian SmartHome is a whole-home smart controller supporting voice control, scene automation, and energy management...
## Installation Guide
1. Install at a central location with good WiFi coverage...
2. Connect the power adapter (5V/2A)...
## FAQ
Q: Cannot connect to WiFi? A: Make sure your router supports 2.4GHz...
""" * 80  # Repeat to exceed 1024 tokens
messages = [{"role": "system", "content": product_manual}]
def chat(user_input):
  # Key: add cache_control to the last user message
  messages.append({
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": user_input,
        "cache_control": {"type": "ephemeral"},
      }
    ],
  })
  completion = client.chat.completions.create(
    model="qwen3.7-max",
    messages=messages,
    extra_body={"enable_thinking": False},
  )
  assistant_msg = completion.choices[0].message.content
  messages.append({"role": "assistant", "content": assistant_msg})
  usage = completion.usage
  created = usage.prompt_tokens_details.cache_creation_input_tokens
  cached = usage.prompt_tokens_details.cached_tokens
  print(f"  [Cache] Created: {created} tokens, Hit: {cached} tokens")
  return assistant_msg
# Simulate multi-turn conversation
print("User: What voice assistants does BaiLian SmartHome support?")
print(f"Agent: {chat('What voice assistants does BaiLian SmartHome support?')[:80]}...\n")
print("User: What if I cannot connect to WiFi?")
print(f"Agent: {chat('What if I cannot connect to WiFi?')[:80]}...\n")
print("User: How many devices can it control simultaneously?")
print(f"Agent: {chat('How many devices can it control simultaneously?')[:80]}...")
```

Starting from the second turn, each request hits the cache from the previous turn (the conversation history), while creating a new cache that includes the current turn. The more turns in the conversation, the greater the savings.

### Production Agent (multiple cache markers)

**Characteristics:**

- Long multi-turn conversations comprising: system prompt + skills/tools definitions + project context + user messages / tool calls
- Different sections change at different frequencies
- Typical use cases: AI coding assistants (Claude Code, OpenClaw), RAG-based Q\&A systems

**Best practice:** Use multiple cache markers (up to 4) to pin content at different stability levels. Each marker must be on a separate message (different role) to serve as an independent breakpoint:

- System prompt — one marker (rarely changes)
- Skills/tools definitions — one marker (may change in combination)
- Project context — one marker (may switch or compress)
- User messages / tool calls — one marker (grows each turn)

**Example:** This example simulates a typical Agent architecture with 3 cache markers pinning the system persona and tools (marker 1), knowledge base (marker 2), and conversation history (marker 3). Note that the knowledge base is placed in a user message to ensure it has its own independent cache breakpoint — multiple system messages are merged internally and cannot serve as separate breakpoints:

```python
from openai import OpenAI
import os
client = OpenAI(
  api_key=os.getenv("DASHSCOPE_API_KEY"),
  base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
)
# Layer 1: System persona (rarely changes)
system_persona = """You are the senior AI support agent for "Model Studio Electronics". Your guidelines:
1. Answer questions based on the knowledge base
2. For information not in the knowledge base, say "Let me transfer you to a human agent"
3. Maintain a professional and friendly tone
4. If the user is unhappy, apologize first then resolve the issue
Below is your complete service specification and script guide:
""" + "Detailed service specification..." * 200  # Ensure > 1024 tokens
# Layer 2: Tools/skills definitions (changes occasionally, e.g. when new features launch)
tools_description = """### Available Tools
- search_product(query): Search product information
- check_inventory(sku, color): Check stock status
- create_ticket(type, description): Create a support ticket
- transfer_to_human(reason): Transfer to a human agent
### Tool Usage Rules
1. When user asks about product details, use search_product first
2. When user asks about stock/shipping, use check_inventory
3. When user requests return/exchange, use create_ticket
4. When a tool returns an error, apologize and transfer_to_human
""" + "Detailed tool usage examples..." * 150  # Ensure > 1024 tokens
# Layer 3: Project knowledge base (semi-stable, changes when user switches products)
knowledge_base_product_a = """### Current product: Model Studio Pro Max Wireless Earbuds
- SKU: BL-PM-2024
- Price: $89
- Colors: Night Black / Nebula White / Ice Blue
- Battery: 8 hours (ANC on), 12 hours (ANC off)
- Water resistance: IPX5
- Warranty: 1 year, 7-day no-questions-asked return
- Stock: Night Black (in stock) / Nebula White (low) / Ice Blue (out of stock)
""" * 50  # Ensure > 1024 tokens
def ask_agent(user_question, history=None):
  if history is None:
    history = []
  messages = [
    {
      "role": "system",
      "content": [
        {
          "type": "text",
          "text": system_persona + "\n\n" + tools_description,
          "cache_control": {"type": "ephemeral"},  # Marker 1: system persona + tools
        }
      ],
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": f"Here is the knowledge base for the current product:\n{knowledge_base_product_a}",
          "cache_control": {"type": "ephemeral"},  # Marker 2: knowledge base
        }
      ],
    },
    {"role": "assistant", "content": "Got it. I have the product details ready. How can I help you?"},
  ]
  messages.extend(history)
  # Add current question with marker 3
  messages.append({
    "role": "user",
    "content": [
      {
        "type": "text",
        "text": user_question,
        "cache_control": {"type": "ephemeral"},  # Marker 3: conversation history
      }
    ],
  })
  completion = client.chat.completions.create(
    model="qwen3.7-max",
    messages=messages,
    extra_body={"enable_thinking": False},
  )
  usage = completion.usage
  print(f"  Created: {usage.prompt_tokens_details.cache_creation_input_tokens}, "
        f"Hit: {usage.prompt_tokens_details.cached_tokens}")
  return completion.choices[0].message.content
# First request
print("Q1: Is the Ice Blue color available?")
a1 = ask_agent("Is the Ice Blue color available?")
print(f"A1: {a1}\n")
# Second request: same product (persona + tools + knowledge base all hit)
history = [
  {"role": "user", "content": "Is the Ice Blue color available?"},
  {"role": "assistant", "content": a1},
]
print("Q2: When will it be back in stock?")
a2 = ask_agent("When will it be back in stock?", history)
print(f"A2: {a2}")
```

**How multi-marker caching works:**

- **User continues asking about the same product**: Persona, tools, and knowledge base are all unchanged, hitting the cache at marker 2 (longest prefix match) for maximum savings.
- **More conversation turns**: Earlier content (persona + tools + knowledge base + history) hits the previous turn's cache; only the new content requires a fresh cache.

<Tip>
  Arrange content from most stable to least stable: place content that changes least at the beginning (e.g., system persona) and content that changes most at the end (e.g., current conversation) to maximize cache hit rates.
</Tip>

### Batch processing (task completion)

**Characteristics:**

- Single-turn requests, no context memory needed
- Fixed long system prompt (task instructions) + variable user input (data to process)
- Typical use cases: text classification, intent recognition, data extraction, content moderation

**Best practice:** Add the `cache_control` marker only on the system prompt. All subsequent requests hit the cache as long as the system prompt remains unchanged.

### Function Calling with cached tool definitions

**Characteristics:**

- Using Function Calling with a long list of tool definitions
- Tool definitions remain unchanged across requests

**Best practice:** The `tools` parameter content is part of the system prompt for caching. Ensure tool definitions are exactly identical across requests (same order, same field order, same structure), and add a `cache_control` marker to the message content.

<Warning>
  Keys to maximizing Function Calling cache hits:

  - **Consistent tool order**: Keep the same ordering of tools in the tools array.
  - **Consistent field order**: Keep JSON field ordering the same within each tool definition.
  - **Consistent structure**: Do not add, remove, or reorder fields between requests, even if they are optional or empty.
</Warning>

## Important notes

- **Content format requirement**: When adding `cache_control`, the content field must be in array form. String-form content does not support cache markers.

- **Cache marker granularity**: Qwen3.5 and later models only support message-level cache breakpoints. Placing multiple `cache_control` markers within a single message's content array does not create separate breakpoints — the system only stores cache at the last marker position within that message and cannot truncate-match at intermediate content blocks. Additionally, multiple system messages are merged internally into a single segment and cannot serve as separate breakpoints. To create multiple independent breakpoints, distribute `cache_control` markers across messages with different roles (e.g., one on system, one on user). Models prior to Qwen3.5 support content-level (intra-message) breakpoints.

- **Mutually exclusive with implicit cache**: A request can only use one caching mode. If the request contains a `cache_control` marker, explicit cache is used; otherwise, the system automatically uses implicit cache.

## Supported models

For the list of models that support explicit cache, see [Context cache](/developer-guides/text-generation/context-cache#explicit-cache).
