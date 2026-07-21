import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { generateMedia } from '../media/index.js';
import { mergeAudioVideo, checkFfmpeg } from '../voiceover/index.js';
import { generateVoiceoverScript } from '../voiceover/index.js';
import { getDefaultProvider, getVoiceListForProvider } from '../voice/index.js';
import {
  MEDIA_PROVIDERS, IMAGE_MODELS, VIDEO_MODELS, AUDIO_MODELS_BY_KIND,
  MEDIA_ASPECTS, VIDEO_LENGTHS_SEC, AUDIO_DURATIONS_SEC,
} from '../media/models.js';
import type { AudioKind } from '../media/models.js';
import { compose } from '../prompts/compose.js';
import { composeImage } from '../prompts/image-compose.js';
import { loadSkills, loadVideoDirections, loadVideoMarketingPsychology, loadVideoContract, loadVideoDiscovery, loadVideoCompose, loadVideoStoryboard, loadStoryboardTypes, loadImageDirections, type LoadedSkill } from '../skills/index.js';
import { readMaskedConfig, writeConfig, resolveProviderConfig } from '../media/config.js';
import { getMediaTask, listMediaTasksByProject } from '../media/tasks.js';
import { listElevenLabsVoiceOptions, resolveTtsModelForVoice } from '../voice/index.js';
import { resolveRequestLlm, resolveImageModerationConfig } from '../media/providers.js';
import type { ImageModerationConfig } from '../media/providers.js';
import { webSearch } from '../media/search.js';
import { STUDIO_VOCAB } from '../media/vocab.js';
import {
  createMediaTask, createPersistMediaTask, appendTaskProgress, notifyTaskWaiters,
  getLiveMediaTask, mediaTaskSnapshot, fireWebhook, fireProgressWebhook,
} from '../services/task-manager.js';
import { isSimulationEnabled, getSimulationConfig, setSimulationConfig } from '../media/simulation/index.js';
import type { SimulationConfig } from '../media/simulation/index.js';
import { logger } from '../utils/index.js';
import { isShuttingDown, trackMediaTask } from '../server.js';
import type { LiveMediaTask } from '../services/task-manager.js';
import type DatabaseType from 'better-sqlite3';

function extractProviderErrorCode(message: string): string | undefined {
  // Try to extract error_code from JSON embedded in provider error messages
  // e.g., volcengine: {'..."error_code":"AllocationQuota.FreeTierOnly"...'}
  const jsonMatch = message.match(/\{[^}]*"error_code"\s*:\s*"([^"]+)"/);
  if (jsonMatch) return jsonMatch[1];
  // Also try errorCode (camelCase variant)
  const camelMatch = message.match(/\{[^}]*"errorCode"\s*:\s*"([^"]+)"/);
  if (camelMatch) return camelMatch[1];
  return undefined;
}

/**
 * Parse JSON from an LLM reply, tolerating reasoning models (`<think>…</think>`),
 * markdown code fences, and surrounding prose by extracting the outermost JSON
 * value (first `{`/`[` … last `}`/`]`).
 */
function extractJsonFromLlm(text: string): any {
  let t = text.trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
  const starts = [t.indexOf('{'), t.indexOf('[')].filter((i) => i >= 0);
  if (starts.length) {
    const start = Math.min(...starts);
    const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
    t = end > start ? t.slice(start, end + 1) : t.slice(start);
  }
  try {
    return JSON.parse(t);
  } catch (e) {
    // Salvage a truncated JSON array — a reasoning model can run past max_tokens
    // mid-array, leaving an unterminated "[{...},{...". Keep everything up to the
    // last complete object and close the bracket, dropping the partial tail item.
    if (t[0] === '[') {
      const lastObjEnd = t.lastIndexOf('}');
      if (lastObjEnd > 0) {
        return JSON.parse(t.slice(0, lastObjEnd + 1) + ']');
      }
    }
    throw e;
  }
}

/**
 * Moderate a single image via a vision model (OpenAI-compatible chat/completions
 * with an image_url part). Returns `{ safe, reason? }`. FAILS OPEN — any missing
 * config, upstream error, or unparseable reply resolves to
 * `{ safe: true, degraded: true }` so publishing is never wrongly blocked. The
 * backend layers its own final policy on top of this signal.
 *
 * Contract:
 *   POST /api/media/moderate-image
 *   body: { imageUrl: string }   // http(s) URL or data:image/... URI
 *   200:  { safe: boolean, reason?: string, model?: string,
 *           degraded?: true, simulated?: true }
 *   400:  { error }              // missing/invalid imageUrl
 */
export async function handleModerateImage(req: any, res: any): Promise<any> {
  const imageUrl = String(req.body?.imageUrl || req.body?.image_url || '').trim();
  if (!imageUrl || !/^(https?:|data:image\/)/i.test(imageUrl)) {
    return res.status(400).json({ error: 'imageUrl (http(s) hoặc data:image/...) là bắt buộc' });
  }

  // Simulation short-circuit — exercise the flow without a real vision key.
  if (await isSimulationEnabled()) {
    return res.json({ safe: true, reason: 'simulation mode: moderation skipped', simulated: true });
  }

  const cfg = resolveImageModerationConfig();
  if (!cfg) {
    // Disabled or unconfigured → fail open (do not block publishing).
    return res.json({ safe: true, degraded: true, reason: 'image moderation disabled/unconfigured' });
  }

  const result = await moderateImageOnce(imageUrl, cfg);

  // Degraded = the provider never produced a usable verdict (upstream error,
  // refusal-prose from every model, or invalid format). We STILL fail open so a
  // provider outage can't block publishing — but we log LOUDLY (error, not warn)
  // and surface degraded:true so the backend can route the asset to manual
  // review instead of silently trusting safe:true. A silent no-op is the bug we
  // are fixing here.
  if (result.degraded) {
    logger.error('MEDIA', 'Image moderation DEGRADED — verdict untrusted, route to manual review', {
      reason: result.reason,
      modelsTried: [cfg.model, ...cfg.fallbackModels],
      sample: result.sample?.slice(0, 200),
    });
  }
  return res.json(result.body);
}

/** Hardened instruction: force a bare JSON object, forbid prose/markdown/refusal. */
const IMAGE_MODERATION_INSTRUCTION =
  'You are an image moderation filter for a community feed. Look carefully at the ATTACHED IMAGE and classify its content. '
  + 'Return ONLY a single valid JSON object. ABSOLUTELY NO preamble, NO markdown, NO ```, '
  + 'NO apology, NO refusal, NO explanation outside the JSON. '
  + 'You ARE able to see images — always evaluate the image; never claim you cannot see it. '
  + 'Exact format: {"safe":true|false,"reason":"short reason in Vietnamese"}. '
  + 'Set safe=false if the image contains: pornography/nudity/sexually suggestive content, graphic/bloody violence, gore, '
  + 'child abuse, or hateful/extremist content. Otherwise safe=true.';

type ModerationOutcome = {
  /** JSON body to return to the caller (always safe on degrade — fail open). */
  body: { safe: boolean; reason?: string; model?: string; degraded?: true };
  /** True when no model produced a trustworthy verdict. */
  degraded: boolean;
  reason?: string;
  /** Last raw reply sample, for degraded logging. */
  sample?: string;
};

/**
 * Ask the vision provider whether `imageUrl` is safe, trying the primary model
 * then each fallback in order. A model "counts" only if it returns a JSON object
 * with a boolean `safe`; prose/refusal (the `claude-haiku-4.5` "Kiro" failure)
 * moves on to the next model. If every model fails → degraded fail-open.
 *
 * FAILS OPEN in every branch (never blocks publishing), but marks `degraded` so
 * the caller/backend can distinguish a real "safe" verdict from an untrusted one.
 */
async function moderateImageOnce(imageUrl: string, cfg: ImageModerationConfig): Promise<ModerationOutcome> {
  const models = [cfg.model, ...cfg.fallbackModels];
  let lastReason = 'vision returned invalid format';
  let lastSample = '';

  for (const model of models) {
    try {
      const r = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: IMAGE_MODERATION_INSTRUCTION },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          }],
          temperature: 0,
          max_tokens: 300,
          // Nudge OpenAI-compatible providers to emit a bare JSON object. Harmless
          // if the provider ignores it; parsing still tolerates prose as fallback.
          response_format: { type: 'json_object' },
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        lastReason = `vision upstream ${r.status}`;
        lastSample = body.slice(0, 200);
        logger.warn('MEDIA', 'Image moderation upstream error', { status: r.status, model, body: body.slice(0, 200) });
        continue; // try next model
      }
      const d: any = await r.json();
      const text: string = d?.choices?.[0]?.message?.content || '';
      lastSample = text;
      let parsed: any = null;
      try { parsed = text ? extractJsonFromLlm(text) : null; } catch { parsed = null; }
      if (!parsed || typeof parsed.safe !== 'boolean') {
        lastReason = 'vision returned invalid format';
        logger.warn('MEDIA', 'Image moderation unparseable response (trying fallback)', { model, sample: String(text).slice(0, 200) });
        continue; // prose/refusal — try next model
      }
      // Trustworthy verdict.
      return {
        degraded: false,
        body: {
          safe: parsed.safe,
          reason: parsed.reason ? String(parsed.reason).slice(0, 500) : undefined,
          model,
        },
      };
    } catch (e: any) {
      lastReason = 'moderation error: ' + (e?.message || 'unknown');
      lastSample = String(e?.message || '');
      logger.warn('MEDIA', 'Image moderation request failed (trying fallback)', { error: e?.message, model });
      continue; // network error — try next model
    }
  }

  // Every model failed → fail open, but flag degraded.
  return {
    degraded: true,
    reason: lastReason,
    sample: lastSample,
    body: { safe: true, degraded: true, reason: lastReason },
  };
}

// --- Skill-author AUTO-VERIFY -----------------------------------------------
// After the LLM authors a new style skill, we close the "does this skill really
// produce the intended look?" loop automatically: render ONE sample image with
// the skill's own prompt_template (fixed neutral subject), then ask the same
// vision model used for moderation whether the image matches the skill's style.
// FAIL-OPEN in every branch — a verify failure NEVER blocks returning the draft.

/** Fixed neutral subject used to render a skill's sample image for style verification. */
const SKILL_VERIFY_SUBJECT = 'a lone fox standing in a forest clearing';
/** Dedicated project bucket for authored sample renders (served via /raw/:file). */
const SKILL_VERIFY_PROJECT = '__skill_verify__';

export interface SkillStyleVerifyResult {
  /** Daemon-relative URL to the rendered sample image (served via /api/projects/:id/raw/:file). */
  imageUrl?: string;
  /** Vision verdict on whether the sample image matches the authored skill's style. */
  styleMatch?: { match: boolean; score: number; notes: string };
  /** Set when image gen or the vision check could not run — the skill draft is STILL returned. */
  degraded?: boolean;
  error?: string;
  /** Set in simulation mode (no real gen/vision performed). */
  simulated?: boolean;
  /** Image model actually used for the sample render. */
  model?: string;
}

/**
 * Whether skill-author auto-verify runs. Explicit env wins; otherwise ON when an
 * image-provider key exists (so it silently no-ops on dev boxes without keys).
 * Env: `SKILL_AUTHOR_AUTOVERIFY_ENABLED` = 1/true/on | 0/false/off.
 */
export function isSkillAutoVerifyEnabled(): boolean {
  const raw = (process.env['SKILL_AUTHOR_AUTOVERIFY_ENABLED'] || '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return !!(process.env['QWENCLOUD_API_KEY'] || process.env['OPENAI_API_KEY']);
}

/** Fill a style skill's prompt_template placeholders with a fixed subject + the skill's own vocab. */
function fillSkillTemplate(skill: any, subject: string): string {
  const kw = Array.isArray(skill?.style_keywords) ? skill.style_keywords.filter(Boolean) : [];
  const style = kw.join(', ') || String(skill?.label || '').trim();
  const mood = Array.isArray(skill?.mood_tones) ? String(skill.mood_tones[0] || '') : String(skill?.mood_tones || '');
  const tmpl = String(skill?.prompt_template || '').trim();
  if (tmpl) {
    return tmpl
      .replace(/\{subject\}/gi, subject)
      .replace(/\{style\}/gi, style)
      .replace(/\{mood\}/gi, mood)
      .replace(/\{negative\}/gi, '')
      .replace(/\{[a-z0-9_]+\}/gi, '')      // drop any remaining unknown placeholders
      .replace(/\s+,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  // No template — compose a reasonable prompt from the skill's own descriptors.
  return [subject, style, mood].filter(Boolean).join(', ');
}

type GenerateMediaFn = typeof generateMedia;

/**
 * Render a sample image for `skill` and vision-check its style match. Fail-open:
 * any gen/vision problem resolves to `{ degraded: true, error }` (never throws for
 * an operational failure). `deps` allows injecting fakes in tests.
 */
export async function verifySkillStyle(
  skill: any,
  ctx: { projectRoot: string; projectsRoot: string; subject?: string },
  deps: { generate?: GenerateMediaFn; fetchFn?: typeof fetch; visionCfg?: ImageModerationConfig | null } = {},
): Promise<SkillStyleVerifyResult> {
  // Simulation short-circuit — exercise the flow without real gen/vision keys.
  if (await isSimulationEnabled()) {
    return { simulated: true, styleMatch: { match: true, score: 1, notes: 'simulation mode: style verify skipped' } };
  }

  const generate = deps.generate ?? generateMedia;
  const fetchFn = deps.fetchFn ?? fetch;
  const subject = (ctx.subject || SKILL_VERIFY_SUBJECT).trim();

  // 1) Render ONE sample image with the authored skill's prompt template.
  const imgModelId = process.env['SKILL_AUTHOR_VERIFY_MODEL']
    || (IMAGE_MODELS.find((m: any) => m.default) || IMAGE_MODELS[0])?.id;
  if (!imgModelId) return { degraded: true, error: 'no image model registered' };

  const prompt = fillSkillTemplate(skill, subject);
  const negative = String(skill?.default_negative || '').trim() || undefined;

  let gen: Awaited<ReturnType<GenerateMediaFn>>;
  try {
    gen = await generate({
      projectRoot: ctx.projectRoot, projectsRoot: ctx.projectsRoot, projectId: SKILL_VERIFY_PROJECT,
      surface: 'image', model: imgModelId, prompt, negativePrompt: negative, aspect: '1:1',
    });
  } catch (e: any) {
    return { degraded: true, error: 'image gen failed: ' + (e?.message || 'unknown'), model: imgModelId };
  }
  if (gen.usedStubFallback || gen.intentionalStub) {
    return { degraded: true, model: imgModelId, error: 'image gen degraded (stub/no real provider): ' + (gen.providerError || gen.providerNote || '') };
  }

  const imageUrl = `/api/projects/${SKILL_VERIFY_PROJECT}/raw/${gen.name}`;

  // 2) Ask the (moderation) vision model whether the image matches the skill's style.
  const cfg = deps.visionCfg !== undefined ? deps.visionCfg : resolveImageModerationConfig();
  if (!cfg) return { imageUrl, degraded: true, error: 'vision model unconfigured', model: imgModelId };

  // Read bytes off disk → data URI so the vision call needs no public URL.
  let dataUri: string;
  try {
    const filePath = path.join(ctx.projectsRoot, SKILL_VERIFY_PROJECT, gen.name);
    const b64 = fs.readFileSync(filePath).toString('base64');
    dataUri = `data:${gen.mime || 'image/png'};base64,${b64}`;
  } catch (e: any) {
    return { imageUrl, degraded: true, error: 'could not read sample image: ' + (e?.message || 'unknown'), model: imgModelId };
  }

  const kw = Array.isArray(skill?.style_keywords) ? skill.style_keywords.join(', ') : '';
  const instruction = 'You are a strict visual-style critic for an AI image platform. '
    + `Target style — label: "${String(skill?.label || '').slice(0, 120)}"; `
    + `description: "${String(skill?.description || '').slice(0, 300)}"; `
    + `keywords: ${(kw || '(none)').slice(0, 300)}. `
    + 'Look at the image and judge how well it matches THIS style (not generic quality). '
    + 'Return ONLY JSON, no markdown: {"match": true/false, "score": 0.0-1.0, "notes": "short reason"}.';

  try {
    const r = await fetchFn(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        }],
        temperature: 0,
        max_tokens: 300,
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      logger.warn('MEDIA', 'Skill style verify upstream error', { status: r.status, model: cfg.model, body: body.slice(0, 200) });
      return { imageUrl, degraded: true, error: `vision upstream ${r.status}`, model: imgModelId };
    }
    const d: any = await r.json();
    const text: string = d?.choices?.[0]?.message?.content || '';
    const parsed = text ? extractJsonFromLlm(text) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { imageUrl, degraded: true, error: 'vision returned invalid format', model: imgModelId };
    }
    const scoreNum = Number(parsed.score);
    const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(1, scoreNum)) : 0;
    const match = typeof parsed.match === 'boolean' ? parsed.match : score >= 0.5;
    return {
      imageUrl, model: imgModelId,
      styleMatch: { match, score, notes: parsed.notes ? String(parsed.notes).slice(0, 500) : '' },
    };
  } catch (e: any) {
    logger.warn('MEDIA', 'Skill style verify failed (fail-open)', { error: e?.message, model: cfg.model });
    return { imageUrl, degraded: true, error: 'vision error: ' + (e?.message || 'unknown'), model: imgModelId };
  }
}

/** Resolve `p` normally, but if it hasn't settled within `ms`, resolve to `onTimeout()`. Never rejects. */
function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(onTimeout()), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve(onTimeout()); },
    );
  });
}

export function createMediaRoutes(db: DatabaseType.Database, PROJECT_ROOT: string, PROJECTS_DIR: string, persistMediaTask: (task: LiveMediaTask) => void): Router {
  const router = Router();

  // --- Skills (cached in memory, reloaded on daemon restart) ---
  let skillsCache: any = null;
  router.get('/skills', (req, res) => {
    const includeDraft = req.query['include_draft'] === '1' || req.query['include_draft'] === 'true';
    if (!includeDraft && skillsCache) return res.json(skillsCache);
    try {
      // A skill is hidden from the studio while status: draft. Admin previews
      // drafts via ?include_draft=1 (uncached). Absent status ⇒ published.
      const isVisible = (s: LoadedSkill) => includeDraft || (s.raw.status ?? 'published') !== 'draft';
      function extractDesc(s: LoadedSkill): string {
        const firstLine = s.body.split('\n').find((l: string) => l.match(/^[A-ZÀ-Ỹ].+/));
        if (!firstLine) return s.label;
        if (firstLine.length <= 120) return firstLine;
        const cut = firstLine.slice(0, 120);
        const last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
        return (last > 60 ? cut.slice(0, last + 1) : cut) + '...';
      }
      function buildMeta(s: LoadedSkill) {
        return {
          id: s.id, label: s.label, desc: s.raw.description || extractDesc(s), featured: s.raw.featured ?? false,
          status: s.raw.status ?? 'published',
          styleKeywords: s.raw.style_keywords ?? [], moodTones: s.raw.mood_tones ?? [],
          cameraPresets: s.raw.camera_presets ?? [], lightingPresets: s.raw.lighting_presets ?? [],
          aspectHints: s.raw.aspect_hints ?? [],
          // No style skill defines `when_to_use`; fall back to `best_for` so this
          // stays populated instead of always empty (shape unchanged: string[]).
          whenToUse: s.raw.when_to_use ?? s.raw.best_for ?? [],
          colorPalette: s.raw.color_palette ?? [],
          visualElements: s.raw.visual_elements ?? [],
          styleRulesDo: s.raw.style_rules_do ?? [],
          styleRulesDont: s.raw.style_rules_dont ?? [],
          bestFor: s.raw.best_for ?? [],
          defaultNegative: s.raw.default_negative ?? '',
          examplePrompt: s.raw.example_prompt ?? '',
          examplePromptVi: s.raw.example_prompt_vi ?? '',
        };
      }

      const videoDirections = loadVideoDirections().filter(isVisible).map(buildMeta);
      const contract = loadVideoContract();
      const discovery = loadVideoDiscovery();
      const composeSkill = loadVideoCompose();
      const marketingPsychology = loadVideoMarketingPsychology();
      const storyboard = loadVideoStoryboard();

      function buildStoryboardMeta(s: LoadedSkill) {
        const qualityLabels: Record<string, string> = { standard: 'Standard', premium: 'Premium', ultra: 'Ultra' };
        const moodLabels: Record<string, string> = { energetic: 'Energetic', calm: 'Calm', professional: 'Professional', friendly: 'Friendly', dramatic: 'Dramatic' };
        return {
          id: s.id, label: s.label, desc: extractDesc(s), status: s.raw.status ?? 'published',
          qualityTiers: (s.raw.quality_tiers ?? []).map((id: string) => ({ id, label: qualityLabels[id] ?? id })),
          voiceMoods: (s.raw.voice_moods ?? []).map((id: string) => ({ id, label: moodLabels[id] ?? id })),
          aspectRatios: (s.raw.aspect_ratios ?? []).map((id: string) => ({ id, label: id })),
          resolutions: (s.raw.resolutions ?? []).map((id: string) => ({ id, label: id })),
          durations: (s.raw.durations ?? []).map((d: string) => Number(d)),
        };
      }

      function buildTypeMeta(s: LoadedSkill) {
        return {
          id: s.id, label: s.label, desc: extractDesc(s), featured: s.raw.featured ?? false,
          status: s.raw.status ?? 'published',
          directionHints: s.raw.direction_hints ?? [], moodHints: s.raw.mood_hints ?? [],
          cameraHints: s.raw.camera_hints ?? [], lightingHints: s.raw.lighting_hints ?? [],
          aspectHints: s.raw.aspect_hints ?? [], durationHint: s.raw.duration_hint ?? '',
          styleKeywords: s.raw.style_keywords ?? [],
          promptTemplate: s.raw.prompt_template ?? '',
          antiPatterns: s.raw.anti_patterns ?? [],
          defaultNegative: s.raw.default_negative ?? '',
          examplePrompt: s.raw.example_prompt ?? '',
          examplePromptVi: s.raw.example_prompt_vi ?? '',
          bestFor: s.raw.best_for ?? [],
          whenToUse: s.raw.when_to_use ?? s.raw.best_for ?? [],
          templateFlows: s.raw.template_flows ?? [],
        };
      }

      const storyboardTypes = loadStoryboardTypes().filter(isVisible).map(buildTypeMeta);
      const imageDirections = loadImageDirections().filter(isVisible).map(buildMeta);
      const result = {
        video_directions: videoDirections,
        image_directions: imageDirections,
        contract: (contract && isVisible(contract)) ? buildMeta(contract) : null,
        discovery: (discovery && isVisible(discovery)) ? buildMeta(discovery) : null,
        compose: (composeSkill && isVisible(composeSkill)) ? buildMeta(composeSkill) : null,
        marketing_psychology: (marketingPsychology && isVisible(marketingPsychology)) ? buildMeta(marketingPsychology) : null,
        storyboard: (storyboard && isVisible(storyboard)) ? { ...buildStoryboardMeta(storyboard), types: storyboardTypes } : null,
      };
      if (!includeDraft) skillsCache = result;
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Invalidate the in-memory skills cache so the next /skills read re-parses the
  // SKILL.md files from disk. Called by Laravel after editing skills locally so
  // changes take effect without a daemon restart.
  router.post('/skills/reload', (_req, res) => {
    skillsCache = null;
    res.json({ ok: true });
  });

  // AI-author a new skill for a category. Uses an existing skill in the category
  // as the structural example, asks the LLM to produce a NEW skill (same keys,
  // fresh on-trend content) for `brief`. Returns a validated skill object;
  // Laravel turns it into a draft SKILL.md. `trendContext` (Phase 3 web search)
  // is optional extra grounding folded into the prompt.
  router.post('/skills/author', async (req, res) => {
    try {
      const category = String(req.body?.category || '').trim();
      const brief = String(req.body?.brief || '').trim();
      const trendContext = String(req.body?.trendContext || '').trim();
      if (!category || brief.length < 5) {
        return res.status(400).json({ error: 'category and brief (>= 5 chars) are required' });
      }

      // Admin override from Laravel AiSettings wins; else fall back to .env.
      // Admin override from Laravel AiSettings wins; else fall back to .env.
      // resolveRequestLlm validates any client-supplied baseUrl against a host
      // allowlist (SSRF guard) and returns an error message on rejection.
      const { llm, error: llmError } = resolveRequestLlm(req.body?.llm);
      if (llmError) {
        return res.status(400).json({ error: llmError });
      }
      if (!llm) {
        return res.status(500).json({ error: 'LLM provider not configured. Set LLM_PROVIDER in .env hoặc Cấu hình AI trong admin.' });
      }

      const samples = loadSkills(category);
      if (!samples.length) {
        return res.status(400).json({ error: `No example skill found in category "${category}"` });
      }
      // Pick the STRUCTURAL example the AI inherits shape from. Priority:
      //   1. explicit `exampleId` from the backend (admin-chosen best skill),
      //   2. the category's `featured: true` skill (curated quality),
      //   3. fallback: first skill alphabetically (samples[0], previous behavior).
      // Goal: the authored skill inherits the shape of a QUALITY skill, not a random one.
      const exampleId = String(req.body?.exampleId || '').trim();
      const exampleSkill =
        (exampleId ? samples.find((s) => s.id === exampleId) : undefined)
        || samples.find((s) => s.raw.featured === true)
        || samples[0];
      const exampleJson = JSON.stringify({ ...exampleSkill.raw, body: exampleSkill.body }, null, 2);

      // Fold live web trends into the prompt (Tavily). Degrades to LLM-only when
      // no search provider is configured or the search returns nothing.
      let trends = trendContext;
      if (!trends) {
        const found = await webSearch(`${brief} ${category.replace(/[-/]/g, ' ')} video trends 2026`, 5, req.body?.search);
        if (found.length) {
          trends = found.map((r) => `- ${r.title}: ${r.snippet}`).join('\n').slice(0, 2000);
        }
      }

      // Controlled vocabularies for video-direction: camera_presets / lighting_presets /
      // mood_tones feed fixed studio dropdowns, so the LLM MUST pick from these exact
      // values (not invent its own) or the dropdowns filter to empty. Single source:
      // studio-vocab.json (STUDIO_VOCAB), mirrored by apps/web options.ts.
      const vocabConstraint = category === 'video-direction'
        ? `\nCONTROLLED VOCABULARY — for these fields pick ONLY from the exact values below (3-5 that fit the brief, verbatim, no new values):
- camera_presets: ${STUDIO_VOCAB.camera.join(', ')}
- lighting_presets: ${STUDIO_VOCAB.lighting.join(', ')}
- mood_tones: ${STUDIO_VOCAB.mood.join(', ')}
(All OTHER fields — style_keywords, example_prompt, color_palette, body, etc. — stay fresh and original.)\n`
        : category === 'video-storyboard/types'
        ? `\nCONTROLLED VOCABULARY — for these hint fields pick ONLY from the exact values below (verbatim, no new values), so they map to the studio dropdowns:
- camera_hints: ${STUDIO_VOCAB.camera.join(', ')}
- lighting_hints: ${STUDIO_VOCAB.lighting.join(', ')}
- mood_hints: ${STUDIO_VOCAB.mood.join(', ')}
(All OTHER fields — style_keywords, prompt_template, template_flows, body, etc. — stay fresh and original.)\n`
        : '';

      const prompt = `You are an expert creative director for an AI video/image generation platform. You write "skill" presets that steer generation toward a specific look. Create ONE new skill for category "${category}".

Brief: ${brief}
${trends ? `\nCurrent trends / reference (use to make it on-trend):\n${trends}\n` : ''}
Here is an EXISTING skill in this category — copy its exact JSON keys and value types, but invent fresh, original, high-quality content for the brief (do NOT reuse its creative values):
${exampleJson}
${vocabConstraint}
Rules:
- Return ONE JSON object with the SAME keys as the example, plus a "body" key (concise markdown documentation, 2-4 sentences).
- "id": short kebab-case slug. "label": short title. "description": one vivid sentence.
- "status": always "draft".
- Keep array fields as arrays, string fields as strings.
- Respond with ONLY the JSON object. No markdown, no code fences.`;

      let text: string;
      if (llm.providerId === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${llm.apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.85, maxOutputTokens: 8192 } }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'Skill author LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        const r = await fetch(`${llm.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: llm.model, messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 8192 }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'Skill author LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.choices?.[0]?.message?.content;
      }

      if (!text) return res.status(500).json({ error: 'AI returned empty response' });

      const skill = extractJsonFromLlm(text);
      if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
        return res.status(500).json({ error: 'AI returned invalid format' });
      }
      if (!skill.id || !skill.label) {
        return res.status(500).json({ error: 'AI output missing required id/label' });
      }

      // AUTO-VERIFY (fail-open): render a sample image with the new skill's own
      // template + vision-check its style match. Never blocks the draft; on any
      // failure/timeout the `sample` field just carries `{ degraded, error }`.
      // The `skill` contract is unchanged — `sample` is a NEW optional field.
      let sample: SkillStyleVerifyResult | undefined;
      if (isSkillAutoVerifyEnabled()) {
        sample = await withTimeout(
          verifySkillStyle(skill, { projectRoot: PROJECT_ROOT, projectsRoot: PROJECTS_DIR }),
          60000,
          () => ({ degraded: true, error: 'auto-verify timed out (60s)' }),
        );
      }

      res.json(sample ? { skill, sample } : { skill });
    } catch (e: any) {
      logger.error('MEDIA', 'Skill author failed', { error: e.message });
      res.status(500).json({ error: 'Skill author failed: ' + e.message });
    }
  });

  // Rewrite a user's draft prompt into a stronger one, grounded in the selected
  // skill (loaded by id) + chosen options. Reusable across all studio inputs.
  router.post('/enhance-prompt', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      const surface = req.body?.surface === 'image' ? 'image' : 'video';
      const skillId = String(req.body?.skill_id || '').trim();
      const style = String(req.body?.style || '').trim();
      const mood = String(req.body?.mood || '').trim();
      const camera = String(req.body?.camera || '').trim();
      const lighting = String(req.body?.lighting || '').trim();
      // Explicit 'en'/'vi' forces a language; otherwise keep the draft's language.
      const localeRaw = req.body?.locale;
      if (!prompt || prompt.length < 5) {
        return res.status(400).json({ error: 'Prompt must be at least 5 characters' });
      }

      // Simulation short-circuit — exercise the feature without a real LLM key.
      if (await isSimulationEnabled()) {
        const tags = [style, mood, camera, lighting].filter(Boolean).join(', ');
        return res.json({
          enhanced_prompt: `${prompt}${tags ? ` — ${tags}` : ''} (mô phỏng: ánh sáng điện ảnh, chi tiết rõ nét, bố cục cân đối).`,
          suggestions: ['Thêm chi tiết chủ thể & bối cảnh', 'Nêu rõ chuyển động máy quay', 'Tránh tính từ chung chung'],
        });
      }

      // Admin override from Laravel AiSettings wins; else fall back to .env.
      // resolveRequestLlm validates any client-supplied baseUrl against a host
      // allowlist (SSRF guard) and returns an error message on rejection.
      const { llm, error: llmError } = resolveRequestLlm(req.body?.llm);
      if (llmError) {
        return res.status(400).json({ error: llmError });
      }
      if (!llm) {
        return res.status(500).json({ error: 'LLM provider not configured. Set LLM_PROVIDER in .env hoặc Cấu hình AI trong admin.' });
      }

      // Ground with the selected skill's rules (authoritative in SKILL.md).
      let skillContext = '';
      if (skillId && skillId !== 'none') {
        const skill = loadSkills(surface === 'image' ? 'image-direction' : 'video-direction').find((s) => s.id === skillId);
        if (skill) {
          const anti = Array.isArray(skill.raw.anti_patterns) ? skill.raw.anti_patterns.join('; ') : '';
          const tmpl = String(skill.raw.prompt_template || '');
          skillContext = `\nSkill "${skill.label}":${tmpl ? `\n- Template: ${tmpl}` : ''}${anti ? `\n- Avoid: ${anti}` : ''}${skill.raw.default_negative ? `\n- Negative: ${skill.raw.default_negative}` : ''}`;
        }
      }

      const opts = [
        style && `style: ${style}`,
        mood && `mood: ${mood}`,
        camera && `camera: ${camera}`,
        lighting && `lighting: ${lighting}`,
      ].filter(Boolean).join(', ');
      const langInstruction = localeRaw === 'en' ? 'in English'
        : localeRaw === 'vi' ? 'in Vietnamese'
        : 'in the SAME language as the draft (match the user\'s language exactly)';
      const instruction = `You are an expert prompt engineer for AI ${surface} generation. Rewrite the user's draft into ONE stronger prompt: keep the intent, add concrete visual detail (subject, action, setting, framing, lighting), weave in the chosen options, and avoid generic adjectives. Write the rewritten prompt ${langInstruction}.

Draft: "${prompt}"
${opts ? `Options: ${opts}` : ''}${skillContext}

Respond with ONLY this JSON, no markdown:
{"enhanced_prompt":"<rewritten prompt>","suggestions":["<short tip>","<short tip>","<short tip>"]}`;

      let text: string;
      if (llm.providerId === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${llm.apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'Enhance prompt LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        const r = await fetch(`${llm.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: llm.model, messages: [{ role: 'user', content: instruction }], temperature: 0.7, max_tokens: 4096 }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'Enhance prompt LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.choices?.[0]?.message?.content;
      }

      if (!text) return res.status(500).json({ error: 'AI returned empty response' });
      const result = extractJsonFromLlm(text);
      if (!result || typeof result !== 'object' || !result.enhanced_prompt) {
        return res.status(500).json({ error: 'AI returned invalid format' });
      }

      res.json({
        enhanced_prompt: String(result.enhanced_prompt).trim(),
        suggestions: Array.isArray(result.suggestions) ? result.suggestions.map((x: any) => String(x)).slice(0, 5) : [],
      });
    } catch (e: any) {
      logger.error('MEDIA', 'Enhance prompt failed', { error: e.message });
      res.status(500).json({ error: 'Enhance prompt failed: ' + e.message });
    }
  });

  // --- Image moderation (NSFW / violence / gore gate for the community feed) ---
  // Backend calls this at publish time. Fails OPEN: any vision error / missing
  // config → { safe: true, degraded: true } so we never block a user unfairly.
  // The backend applies its own final policy on top of this signal.
  router.post('/moderate-image', handleModerateImage);

  // Controlled vocabularies (camera/lighting/mood/style) — single source for the
  // studio dropdowns + AI skill authoring. See media/studio-vocab.json.
  router.get('/vocab', (_req, res) => {
    res.json(STUDIO_VOCAB);
  });

  // --- Media Config (Deprecated: Config is now managed by Laravel backend) ---
  router.get('/config', (_req, res) => {
    res.status(410).json({ error: 'Config is deprecated. Use Laravel backend to manage models and provider configurations.' });
  });

  router.put('/config', (req, res) => {
    res.status(410).json({ error: 'Config is deprecated. Use Laravel backend to manage models and provider configurations.' });
  });

  // --- Models (cached, static data) ---
  let modelsCache: any = null;
  router.get('/models', (_req, res) => {
    if (modelsCache) return res.json(modelsCache);
    const videoFeatures = new Set<string>();
    for (const m of VIDEO_MODELS) for (const c of m.caps) videoFeatures.add(c);
    const imageFeatures = new Set<string>();
    for (const m of IMAGE_MODELS) for (const c of m.caps) imageFeatures.add(c);
    const audioFeatures: Record<string, string[]> = {};
    for (const kind of ['music', 'speech', 'sfx'] as AudioKind[]) {
      const features = new Set<string>();
      for (const m of (AUDIO_MODELS_BY_KIND[kind as AudioKind] || [])) {
        for (const c of m.caps) features.add(c);
      }
      audioFeatures[kind] = [...features];
    }
    const result = {
      surfaces: { video: [...videoFeatures], image: [...imageFeatures], audio: audioFeatures },
      aspects: MEDIA_ASPECTS, videoLengthsSec: VIDEO_LENGTHS_SEC, audioDurationsSec: AUDIO_DURATIONS_SEC,
    };
    modelsCache = result;
    res.json(result);
  });

  // --- Voices ---
  router.get('/providers/elevenlabs/voices', async (_req, res) => {
    try {
      const voices = await listElevenLabsVoiceOptions(PROJECT_ROOT).catch(() => []);
      res.json({ voices });
    } catch { res.json({ voices: [] }); }
  });

  router.get('/providers/:providerId/voices', async (_req, res) => {
    try {
      const providerId = _req.params.providerId;
      
      // Check if provider has API key configured
      const providerConfig = await resolveProviderConfig(PROJECT_ROOT, providerId);
      if (!providerConfig.apiKey) {
        return res.status(400).json({ 
          error: `No API key configured for provider '${providerId}'` 
        });
      }

      // For ElevenLabs, use existing function
      if (providerId === 'elevenlabs') {
        const voices = await listElevenLabsVoiceOptions(PROJECT_ROOT).catch(() => []);
        return res.json({ voices });
      }

      // For other providers, we would implement specific fetchers here
      // For now, return empty array - this can be extended per provider
      res.json({ voices: [] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/voices', async (_req, res) => {
    const provider = getDefaultProvider();
    const elevenlabs = provider === 'elevenlabs'
      ? await listElevenLabsVoiceOptions(PROJECT_ROOT).catch(() => [])
      : [];
    const voices = getVoiceListForProvider(provider, elevenlabs.map((v: any) => ({ ...v, provider: 'elevenlabs' })));
    // `available` = at least one underlying voice provider actually has credentials configured.
    // Lets the UI warn early (and block submit) instead of failing only at generate time when
    // no TTS provider/key is set up in admin.
    const providerIds = [...new Set(voices.map((v: any) => v.provider).filter(Boolean))] as string[];
    let available = false;
    for (const pid of providerIds) {
      try {
        const cfg = await resolveProviderConfig(PROJECT_ROOT, pid);
        if (cfg.apiKey) { available = true; break; }
      } catch { /* unknown provider id — treat as unavailable */ }
    }
    res.json({ voices, provider, available });
  });

  // --- TTS Preview ---
  router.post('/tts-preview', async (req, res) => {
    try {
      const voiceId = req.body?.voice || 'alloy';
      const text = req.body?.text || 'Xin chào';
      
      // If modelId is provided, use it directly; otherwise fall back to provider-based selection
      let ttsModel;
      if (req.body?.modelId) {
        // Find the model by ID in all speech models
        const speechModels = AUDIO_MODELS_BY_KIND.speech || [];
        ttsModel = speechModels.find(m => m.id === req.body.modelId);
        if (!ttsModel) {
          return res.status(400).json({ 
            error: `Invalid modelId: ${req.body.modelId}. Not found in available TTS models.` 
          });
        }
      } else {
        // Original logic: determine model based on provider and voiceId
        const provider = getDefaultProvider();
        const speechModels = AUDIO_MODELS_BY_KIND.speech || [];
        ttsModel = resolveTtsModelForVoice(voiceId, speechModels);
        if (!ttsModel) return res.status(400).json({ error: 'No TTS model available' });
      }
      
      const safeName = voiceId.replace(/[^a-zA-Z0-9_-]/g, '_');
      // Check ALL provider voice directories, not just the resolved model's provider
      const voicesDir = path.join(PROJECT_ROOT, 'public', 'voices');
      if (fs.existsSync(voicesDir)) {
        const providers = fs.readdirSync(voicesDir);
        for (const provider of providers) {
          const staticFile = path.join(voicesDir, provider, `${safeName}.mp3`);
          if (fs.existsSync(staticFile)) {
            return res.type('audio/mpeg').sendFile(staticFile);
          }
        }
      }
      try {
        const result = await generateMedia({
          projectRoot: PROJECT_ROOT, projectsRoot: PROJECTS_DIR, projectId: '__preview__',
          surface: 'audio', model: ttsModel.id, prompt: text, voice: voiceId, audioKind: 'speech',
          providerId: ttsModel.provider,
        });
        const genFile = path.join(PROJECTS_DIR, '__preview__', result.name);
        if (fs.existsSync(genFile)) {
          return res.type('audio/mpeg').sendFile(genFile);
        }
      } catch {}
      res.status(502).json({ error: 'Không thể tạo giọng đọc thử' });
    } catch {
      res.status(500).json({ error: 'Không thể tạo giọng đọc thử' });
    }
  });

  // --- Generate Media ---
  router.post('/projects/:id/media/generate', async (req, res) => {
    try {
      if (isShuttingDown()) {
        return res.status(503).json({ error: 'Server is shutting down, please retry later' });
      }

      const projectId = req.params.id;
      const surface = req.body?.surface;
      let modelId = req.body?.model;
      const rawPrompt = req.body?.prompt?.trim() ?? '';

      if (!modelId && surface) {
        const capability = req.body?.capability;
        let candidates: any[] = [];
        if (surface === 'image') {
          candidates = IMAGE_MODELS.filter((m: any) => !capability || m.caps.includes(capability));
          modelId = (candidates.find((m: any) => m.default) || candidates[0])?.id;
        } else if (surface === 'video') {
          candidates = VIDEO_MODELS.filter((m: any) => !capability || m.caps.includes(capability));
          modelId = (candidates.find((m: any) => m.default) || candidates[0])?.id;
        } else if (surface === 'audio') {
          const audioKind = req.body?.audioKind || 'speech';
          candidates = (AUDIO_MODELS_BY_KIND[audioKind as AudioKind] || []).filter((m: any) => !capability || m.caps.includes(capability));
          modelId = (candidates.find((m: any) => m.default) || candidates[0])?.id;
        }
      }
      if (!modelId) {
        return res.status(400).json({ error: 'No model available for this surface/feature combination' });
      }

      if (surface) {
        db.prepare('UPDATE projects SET surface = ?, updated_at = ? WHERE id = ?').run(surface, Date.now(), projectId);
      }

      const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS_BY_KIND.music, ...AUDIO_MODELS_BY_KIND.speech, ...AUDIO_MODELS_BY_KIND.sfx];
      const modelDef = allModels.find((m: any) => m.id === modelId);
      const provider = modelDef?.provider ?? '';

      let finalPrompt = rawPrompt;
      let enrichmentMetadata: any = {};
      let enrichedAspect: string | undefined;
      let enrichedLength: number | undefined;
      let enrichedNegative: string | undefined;

      // Enrich image prompt with selected skill/direction
      if (surface === 'image' && rawPrompt) {
        const enrichment = composeImage({
          prompt: rawPrompt, model: modelId, provider,
          aspect: req.body?.aspect,
          style: req.body?.style,
          negativePrompt: req.body?.negative_prompt,
        });
        finalPrompt = enrichment.params.prompt;
        enrichmentMetadata = enrichment.params.metadata;
        // Skill's default_negative + anti-patterns → real negative_prompt field.
        enrichedNegative = enrichment.params.negativePrompt;
      }

      if (surface === 'video' && rawPrompt) {
        const enrichment = compose({
          prompt: rawPrompt, model: modelId, provider, surface,
          aspect: req.body?.aspect, length: typeof req.body?.length === 'number' ? req.body.length : undefined,
          style: req.body?.style, mood: req.body?.mood, camera: req.body?.camera, lighting: req.body?.lighting,
          negativePrompt: req.body?.negative_prompt, direction: req.body?.direction, image: req.body?.image,
          supportsI2v: modelDef?.caps?.includes('i2v') ?? false,
        });
        finalPrompt = enrichment.params.prompt;
        enrichmentMetadata = enrichment.params.metadata;
        enrichedAspect = enrichment.params.aspect;
        enrichedLength = enrichment.params.length;
      }

      const taskId = randomUUID();
      const taskMeta: Record<string, any> = { ...(req.body?.metadata || {}) };
      if (req.body?.image) {
        taskMeta.inputImage = typeof req.body.image === 'string' ? req.body.image : (req.body.image.name || req.body.image);
      }
      if (req.body?.images) {
        taskMeta.inputImages = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        if (!taskMeta.inputImage && taskMeta.inputImages.length > 0) {
          taskMeta.inputImage = taskMeta.inputImages[0];
        }
      }
      if (req.body?.last_frame) {
        taskMeta.lastFrameImage = typeof req.body.last_frame === 'string' ? req.body.last_frame : (req.body.last_frame.name || req.body.last_frame);
      }
      const task = createMediaTask(taskId, projectId, { surface, model: modelId, metadata: taskMeta });
      task.status = 'running';
      persistMediaTask(task);

      const genPromise = generateMedia({
        projectRoot: PROJECT_ROOT, projectsRoot: PROJECTS_DIR, projectId,
        surface: req.body?.surface, model: modelId, prompt: finalPrompt,
        negativePrompt: enrichedNegative ?? req.body?.negative_prompt, output: req.body?.output,
        aspect: enrichedAspect ?? req.body?.aspect,
        length: enrichedLength ?? (typeof req.body?.length === 'number' ? req.body.length : undefined),
        duration: typeof req.body?.duration === 'number' ? req.body.duration : undefined,
        voice: req.body?.voice, audioKind: req.body?.audioKind, language: req.body?.language,
        loop: req.body?.loop, promptInfluence: req.body?.promptInfluence,
        compositionDir: req.body?.compositionDir, image: req.body?.image, images: req.body?.images, voices: req.body?.voices, lastFrame: req.body?.last_frame,
        videoRef: req.body?.videoRef, referenceImages: req.body?.referenceImages, audioSetting: req.body?.audioSetting, mode: req.body?.mode, watermark: req.body?.watermark,
        thinkingMode: req.body?.thinking_mode,
        seed: typeof req.body?.seed === 'number' ? req.body.seed : undefined,
        shotType: req.body?.shotType, multiPanelImage: req.body?.multiPanelImage,
        providerId: req.body?.provider_id,
        protocol: req.body?.protocol,
        credentials: req.body?.credentials,
        onProgress: (line: string) => { appendTaskProgress(task, line); fireProgressWebhook(task); },
      })
        .then(async (meta: any) => {
          // Cancel race: if the task was already moved to a terminal state (e.g. cancelled
          // → 'interrupted') while generateMedia was still in flight, do NOT overwrite it,
          // persist, or fire a second terminal webhook.
          if (task.status === 'done' || task.status === 'failed' || task.status === 'interrupted') return;
          // Voiceover is best-effort — failure should not mark the main task as failed
          try {
            let voiceoverText = req.body?.voiceover ? String(req.body.voiceover).trim() : '';
            if (!voiceoverText && req.body?.autoVoiceover && surface === 'video') {
              appendTaskProgress(task, 'Đang viết kịch bản thuyết minh...');
              const llmKey = process.env['LLM_API_KEY'] || process.env['TTS_API_KEY'] || process.env['OPENAI_API_KEY'];
              const llmBase = process.env['LLM_BASE_URL'] || process.env['TTS_BASE_URL'] || process.env['OPENAI_BASE_URL'];
              const llmModel = process.env['LLM_MODEL'] || 'gpt-4o-mini';
              if (llmKey) {
                try {
                  voiceoverText = await generateVoiceoverScript(finalPrompt, { apiKey: llmKey, baseUrl: llmBase, model: llmModel });
                  appendTaskProgress(task, `Đã viết xong: "${voiceoverText.slice(0, 60)}..."`);
                } catch (llmErr: any) {
                  appendTaskProgress(task, `Lỗi viết kịch bản: ${llmErr.message}`);
                }
              } else {
                appendTaskProgress(task, 'Chưa cấu hình LLM — đặt LLM_API_KEY hoặc TTS_API_KEY');
              }
            }
            if (voiceoverText && surface === 'video') {
              const voiceId = req.body?.voice
                || (getDefaultProvider() === 'elevenlabs' ? '21m00Tcm4TlvDq8ikWAM' : 'vi-VN-NamMinhNeural');
              let ttsModel;
              if (req.body?.voiceModelId) {
                const speechModels = AUDIO_MODELS_BY_KIND.speech || [];
                ttsModel = speechModels.find(m => m.id === req.body.voiceModelId);
                if (!ttsModel) {
                  appendTaskProgress(task, `Invalid voiceModelId: ${req.body.voiceModelId}. Falling back to default TTS model.`);
                  const speechModels = AUDIO_MODELS_BY_KIND.speech || [];
                  ttsModel = resolveTtsModelForVoice(voiceId, speechModels);
                }
              } else {
                const speechModels = AUDIO_MODELS_BY_KIND.speech || [];
                ttsModel = resolveTtsModelForVoice(voiceId, speechModels);
              }
              appendTaskProgress(task, 'Đang tạo giọng đọc...');
              if (ttsModel && checkFfmpeg()) {
                const audioMeta = await generateMedia({
                  projectRoot: PROJECT_ROOT, projectsRoot: PROJECTS_DIR, projectId,
                  surface: 'audio', model: ttsModel.id, prompt: voiceoverText, voice: voiceId, audioKind: 'speech',
                });
                appendTaskProgress(task, 'Đang ghép giọng đọc vào video...');
                const videoFile = path.join(PROJECTS_DIR, projectId, meta.name);
                const audioFile = path.join(PROJECTS_DIR, projectId, audioMeta.name);
                const mergedName = `voiceover-${meta.name}`;
                const mergedPath = path.join(PROJECTS_DIR, projectId, mergedName);
                const merged = await mergeAudioVideo(videoFile, audioFile, mergedPath);
                meta = { ...merged };
              } else if (!checkFfmpeg()) {
                appendTaskProgress(task, 'FFmpeg không khả dụng — bỏ qua voiceover');
              } else if (!ttsModel) {
                appendTaskProgress(task, 'Không tìm thấy TTS model hợp lệ — bỏ qua voiceover');
              }
            }
          } catch (voiceErr: any) {
            appendTaskProgress(task, `Lỗi voiceover: ${voiceErr.message}`);
            logger.error('VOICEOVER', 'Voiceover failed, completing with raw video', { error: voiceErr.message, taskId: task.id });
          }
          // Stub fallback means provider failed — report as failed, not done
          if (meta?.usedStubFallback) {
            task.status = 'failed';
            task.error = { message: meta.providerError || 'Provider failed', status: 502, code: 'PROVIDER_ERROR' };
            task.file = meta;
            task.endedAt = Date.now();
          } else {
            // Always complete the task with whatever file we have (raw video or merged)
            task.status = 'done';
            task.file = meta;
            task.endedAt = Date.now();
          }
          if (enrichmentMetadata && Object.keys(enrichmentMetadata).length) {
            task.metadata = { ...(task.metadata ?? {}), promptEnrichment: enrichmentMetadata };
          }
          persistMediaTask(task);
          fireWebhook(task);
          notifyTaskWaiters(task);
        })
        .catch((err: any) => {
          // Cancel race: same guard as the success path — a task cancelled mid-flight is
          // already terminal, so don't overwrite it or fire a duplicate terminal webhook.
          if (task.status === 'done' || task.status === 'failed' || task.status === 'interrupted') return;
          task.status = 'failed';
          const errorCode = err.code || extractProviderErrorCode(err.message);
          // Log the RAW provider error — it is stored on the task but sanitized before it reaches
          // the frontend, so without this line quota/billing/provider failures are undiagnosable
          // from `docker logs` (e.g. DashScope 403 AllocationQuota.FreeTierOnly).
          logger.error('MEDIA', 'Render task failed', {
            taskId,
            model: (task as any).model,
            status: err.status,
            code: errorCode,
            message: String(err?.message ?? err).slice(0, 500),
          });
          task.error = { message: err.message, status: err.status || 400, ...(errorCode ? { code: errorCode } : {}) };
          task.endedAt = Date.now();
          persistMediaTask(task);
          fireWebhook(task);
          notifyTaskWaiters(task);
        });

      trackMediaTask(genPromise.catch(() => {/* already handled above */}));

      res.status(202).json({ taskId, status: task.status, startedAt: task.startedAt });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Wait for task ---
  router.post('/tasks/:id/wait', async (req, res) => {
    const taskId = req.params.id;
    const task = getLiveMediaTask(taskId);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const since = Number.isFinite(req.body?.since) ? Number(req.body.since) : 0;
    const timeoutMs = Math.min(Math.max(Number(req.body?.timeoutMs) || 25000, 0), 25000);

    const respond = () => {
      if (res.writableEnded) return;
      res.json(mediaTaskSnapshot(task, since));
    };

    if (task.status === 'done' || task.status === 'failed' || task.status === 'interrupted' || task.progress.length > since) {
      return respond();
    }

    let resolved = false;
    const wake = () => {
      if (resolved) return;
      resolved = true;
      task.waiters.delete(wake);
      clearTimeout(timer);
      respond();
    };
    task.waiters.add(wake);
    const timer = setTimeout(wake, timeoutMs);
    res.on('close', wake);
  });

  // --- Get single task ---
  router.get('/tasks/:id', (req, res) => {
    const persisted = getMediaTask(db, req.params.id);
    if (persisted) return res.json(persisted);
    const live = getLiveMediaTask(req.params.id);
    if (!live) return res.status(404).json({ error: 'task not found' });
    res.json({
      id: live.id, projectId: live.projectId, status: live.status,
      surface: live.surface ?? null, model: live.model ?? null,
      progress: live.progress, file: live.file ?? null, error: live.error ?? null,
      startedAt: live.startedAt, endedAt: live.endedAt,
      createdAt: live.createdAt ?? live.startedAt, updatedAt: live.updatedAt ?? live.startedAt,
    });
  });

  // --- Cancel task ---
  router.post('/tasks/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const task = getLiveMediaTask(id);
      if (!task) {
        return res.status(404).json({ error: 'task not found' });
      }
      if (task.status !== 'running') {
        return res.status(422).json({ error: 'Only running tasks can be cancelled' });
      }
      // Try to cancel on DashScope if we have a provider task ID in progress
      const providerTaskId = (task as any).metadata?.providerTaskId;
      if (providerTaskId) {
        try {
          const cfg = await resolveProviderConfig(PROJECT_ROOT, 'qwencloud');
          if (cfg.apiKey) {
            const baseUrl = (cfg.baseUrl || 'https://dashscope-intl.aliyuncs.com/api/v1').replace(/\/$/, '');
            await fetch(`${baseUrl}/tasks/${providerTaskId}/cancel`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${cfg.apiKey}` },
            });
          }
        } catch (err: any) {
          logger.warn('MEDIA', `daemon cancel provider task failed: ${err.message}`);
        }
      }
      task.status = 'interrupted';
      task.error = { message: 'Cancelled by user', status: 499 };
      task.endedAt = Date.now();
      persistMediaTask(task);
      fireWebhook(task);
      notifyTaskWaiters(task);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- List tasks ---
  router.get('/projects/:id/media/tasks', (req, res) => {
    const projectId = req.params.id;
    const includeTerminal = req.query.includeDone === '1' || req.query.includeDone === 'true';
    const rows = listMediaTasksByProject(db, projectId, { includeTerminal });
    const tasks = rows.map((t: any) => ({
      taskId: t.id, status: t.status, startedAt: t.startedAt,
      endedAt: t.endedAt, elapsed: Math.round(((t.endedAt ?? Date.now()) - t.startedAt) / 1000),
      surface: t.surface, model: t.model, progress: t.progress.slice(-3),
      progressCount: t.progress.length,
      metadata: t.metadata,
      ...(t.status === 'done' ? { file: t.file } : {}),
      ...(t.status === 'failed' || t.status === 'interrupted' ? { error: t.error } : {}),
    }));
    res.json({ tasks });
  });

  // --- AI Storyboard Draft ---
  router.post('/ai-draft', async (req, res) => {
    try {
      const concept = req.body?.concept?.trim();
      if (!concept || concept.length < 10) {
        return res.status(400).json({ error: 'Concept must be at least 10 characters' });
      }

      // Same resolution as /enhance-prompt: prefer the admin override passed by Laravel
      // (AiSettings → LlmConfigResolver), else fall back to the daemon's own .env.
      // Admin override from Laravel AiSettings wins; else fall back to .env.
      // resolveRequestLlm validates any client-supplied baseUrl against a host
      // allowlist (SSRF guard) and returns an error message on rejection.
      const { llm, error: llmError } = resolveRequestLlm(req.body?.llm);
      if (llmError) {
        return res.status(400).json({ error: llmError });
      }
      if (!llm) {
        return res.status(500).json({ error: 'LLM provider not configured. Set LLM_PROVIDER in .env hoặc Cấu hình AI trong admin.' });
      }

      const model = llm.model;
      const videoType = req.body?.video_type || 'ugc_review';

      const typeHint: Record<string, string> = {
        brand_tvc: 'a 30-second brand commercial', product_ads: 'a product advertisement',
        campaign: 'a marketing campaign video',
      };

      const prompt = `You are a professional video storyboard creator. Create a storyboard for ${typeHint[videoType] || 'a short video clip'} based on this concept: "${concept}".

Decide how many scenes to generate from the concept's own complexity and any explicit requirement stated in it (e.g. a target duration, a number of beats/shots, or a phrase like "N cảnh"). Use only as many scenes as the story genuinely needs — a simple idea may need just 2-3, a richer or longer one up to 8. Do NOT pad with filler scenes or force a fixed count. Each scene should have:
- prompt: A detailed visual description in Vietnamese (40-100 words)
- duration_seconds: 5, 8, or 10
- camera_movement: "Bird Eye","Dolly In","Dolly Out","Close-up","Wide Shot","Tracking Shot","Pan Left","Pan Right","Tilt Up","Tilt Down","Orbit","Handheld","Static","Zoom In","Zoom Out"
- style: "Cinematic","Anime","Realistic","Minimalist","3D Render","Oil Painting","Watercolor","Sketch","Vintage","Cyberpunk"
- mood: "Dramatic","Happy","Mysterious","Energetic","Calm","Dark","Romantic","Suspenseful","Inspiring","Nostalgic"
- narration: A short voiceover line in Vietnamese (10-25 words)

Respond ONLY with valid JSON array. No markdown:
[{"prompt":"...","duration_seconds":5,"camera_movement":"...","style":"...","mood":"...","narration":"..."}]`;

      let text: string;
      if (llm.providerId === 'gemini') {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${llm.apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'AI draft LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        const r = await fetch(`${llm.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 8192 }),
        });
        if (!r.ok) {
          logger.error('MEDIA', 'AI draft LLM upstream error', { provider: llm.providerId, status: r.status });
          return res.status(502).json({ error: 'AI provider unavailable' });
        }
        const d: any = await r.json();
        text = d?.choices?.[0]?.message?.content;
      }

      if (!text) return res.status(500).json({ error: 'AI returned empty response' });

      const scenes = extractJsonFromLlm(text);
      if (!Array.isArray(scenes)) return res.status(500).json({ error: 'AI returned invalid format' });

      const validCameras = ['Bird Eye','Dolly In','Dolly Out','Close-up','Wide Shot','Tracking Shot','Pan Left','Pan Right','Tilt Up','Tilt Down','Orbit','Handheld','Static','Zoom In','Zoom Out'];
      const validStyles = ['Cinematic','Anime','Realistic','Minimalist','3D Render','Oil Painting','Watercolor','Sketch','Vintage','Cyberpunk'];
      const validMoods = ['Dramatic','Happy','Mysterious','Energetic','Calm','Dark','Romantic','Suspenseful','Inspiring','Nostalgic'];

      const result = scenes.map((s: any) => ({
        prompt: String(s.prompt || '').trim(),
        duration_seconds: [3,5,8,10,15].includes(s.duration_seconds) ? s.duration_seconds : 5,
        camera_movement: validCameras.includes(s.camera_movement) ? s.camera_movement : '',
        style: validStyles.includes(s.style) ? s.style : '',
        mood: validMoods.includes(s.mood) ? s.mood : '',
        narration: String(s.narration || '').trim(),
        aspect_ratio: '16:9',
        resolution: '720p',
      }));

      res.json({ scenes: result });
    } catch (e: any) {
      logger.error('MEDIA', 'AI draft failed', { error: e.message });
      res.status(500).json({ error: 'AI draft failed: ' + e.message });
    }
  });

  // --- Simulation Mode ---
  router.get('/simulation', async (_req, res) => {
    try {
      const enabled = await isSimulationEnabled();
      const cfg = await getSimulationConfig();
      res.json({ enabled, latency: cfg.latency });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/simulation', async (req, res) => {
    try {
      const body = req.body || {};
      if (typeof body.enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled (boolean) is required' });
      }
      const updated = await setSimulationConfig({
        enabled: body.enabled,
        latency: {
          image: body.latency?.image,
          video: body.latency?.video,
          audio: body.latency?.audio,
          jitter: body.latency?.jitter,
        },
      } as SimulationConfig);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}