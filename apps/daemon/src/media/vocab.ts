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

const raw = readFileSync(fileURLToPath(new URL('./studio-vocab.json', import.meta.url)), 'utf8');
const parsed = JSON.parse(raw) as Record<string, unknown>;

export const STUDIO_VOCAB: StudioVocab = {
  camera: parsed.camera as string[],
  lighting: parsed.lighting as string[],
  mood: parsed.mood as string[],
  style: parsed.style as string[],
};
