# AI System — LLM config, skill authoring, prompt enhancement

How the LLM-backed features work. Read this before touching anything that calls an LLM,
manages local skills, or shows AI errors to users.

## Config flow (admin-managed, like plan config)

There is ONE config source: **`App\Settings\AiSettings`** (spatie settings, edited at
`/admin/manage-ai-settings`). It holds the LLM provider (`env`/`ckey`/`openai`/`gemini`/
`custom` + base_url/api_key/model) and the web-search provider (`env`/`none`/`tavily` + key).

`App\Support\LlmConfigResolver::resolve()` / `resolveSearch()` turn `AiSettings` into the
override payload **passed to the daemon per request** (mirrors how `Plan::provider_config`
flows). `provider = 'env'` ⇒ returns `null` ⇒ the daemon falls back to its own `.env`
(`resolveLlmProvider()` / `resolveSearchProvider()` in `apps/daemon/src/media/providers.ts`).
`'custom'` ⇒ any OpenAI-compatible endpoint via `base_url`.

> Rule: **never** read AI config in the daemon from a DB. Laravel (control plane) owns it
> and passes it. The daemon stays stateless; `.env` is only a fallback.

## Daemon LLM endpoints (`apps/daemon/src/routes/media.ts`)

All follow the same shape (clone `/ai-draft` when adding a new one):
1. validate input → 2. `isSimulationEnabled()` short-circuit (mock) → 3. resolve LLM
(request `llm` override, else `resolveLlmProvider()`) → 4. build instruction → 5. call LLM
(`providerId === 'gemini'` branch, else OpenAI-compatible `{base}/v1/chat/completions`) →
6. **`extractJsonFromLlm(text)`** → validate.

- `POST /media/skills/author` — generate a new skill (grounded on an example skill in the category).
- `POST /media/enhance-prompt` — rewrite a draft prompt (grounded on the selected skill's
  `prompt_template`/`anti_patterns` + options). **Auto-matches the draft's language** unless `locale` is passed.
- `POST /media/skills/reload` — clear the in-memory `skillsCache`.

> 🔴 **`extractJsonFromLlm` is mandatory** for parsing LLM JSON. Reasoning models
> (e.g. MiniMax) emit `<think>…</think>` before the JSON — a plain `JSON.parse` throws
> ("Unexpected token '<'"). The helper strips reasoning + fences + prose. This was a real bug.

Laravel fronts these via `SkillAuthoringService` / `PromptEnhancementService` (inject the
`llm`/`search` override) → `SkillAuthoringController` (admin) / `PromptEnhancementController`
(`POST /api/ai/enhance-prompt`, any auth user, throttled).

## Local skills (`App\Services\SkillService`)

Skills are files: `apps/skills/<category>/[<name>/]SKILL.md` (frontmatter YAML + body),
mounted into the Laravel + daemon containers at `/skills`. SkillService does file CRUD;
the daemon `loader.ts` reads them for generation.

- **Categories are classified** (mirror `loader.ts`): `multi` (image-direction,
  video-direction, video-storyboard/types — accept new skills), `single` (one SKILL.md,
  edit-only), `unloaded` (on disk but not loaded). Only **multi** accept new skills.
- **`status: draft|published`** frontmatter (absent ⇒ published). The daemon `/media/skills`
  hides drafts (studio); `?include_draft=1` shows them (admin). Admin: `/admin/skill-manager`.
- After any write, SkillService calls daemon `/media/skills/reload` so changes are live.

## Showing AI/provider errors → `App\Support\ErrorSanitizer`

🔴 Provider/model/credential details must **never** reach users (project rule). Wrap any
error that may carry them with `ErrorSanitizer::publicMessage()` (and metadata with
`publicMetadata()`). Already applied at: `DaemonProxyController::sanitizeForUser`,
`RenderJobController`/`RenderJobResource` (`error_message`/`error_metadata`), the AI services.
The real error is logged; the user sees a generic VN message.

## Reusable frontend enhancer

`useEnhancePrompt()` (hook) + `<EnhancePromptButton prompt context onApply />`
(`apps/web/src/components/studio/enhance-prompt-button.tsx`). Drop it next to any prompt
input with that site's `context` (`surface`, `skill_id`, style/mood/camera/lighting). No
backend change needed to add a new call site.

## When to use this skill
- Adding/changing an LLM-backed endpoint or the AI config.
- Working on local skills (CRUD, draft/publish, authoring).
- Surfacing daemon/provider errors to users.
- Adding the "AI gợi ý" enhancer to a new prompt input.
