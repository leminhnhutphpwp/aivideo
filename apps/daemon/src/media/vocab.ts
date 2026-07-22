import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The studio's controlled vocabularies (camera / lighting / mood / style values),
 * loaded from studio-vocab.json — the single source of truth. Used to constrain AI
 * skill authoring and exposed at GET /media/vocab. apps/web/src/components/studio/
 * options.ts must expose these same values (enforced by its vocab-sync test).
 */
export interface StudioVocab {
  camera: string[];
  lighting: string[];
  mood: string[];
  style: string[];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

let parsed: Record<string, unknown> = {};
try {
  const raw = readFileSync(fileURLToPath(new URL('./studio-vocab.json', import.meta.url)), 'utf8');
  const json = JSON.parse(raw);
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    parsed = json as Record<string, unknown>;
  }
} catch (err) {
  console.error('[studio-vocab] Failed to load studio-vocab.json, defaulting to empty vocab', err);
}

export const STUDIO_VOCAB: StudioVocab = {
  camera: asStringArray(parsed.camera),
  lighting: asStringArray(parsed.lighting),
  mood: asStringArray(parsed.mood),
  style: asStringArray(parsed.style),
};
