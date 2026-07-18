#!/usr/bin/env node
/**
 * verify-media-models.mjs
 *
 * Checks daemon providers.ts ↔ Laravel ModelSelector.php for drift.
 * Dynamic — auto-discovers providers & models from source code.
 * Exit 0 = OK, Exit 1 = error.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DAEMON_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DAEMON_ROOT, '..', '..');

function read(file) {
  try { return readFileSync(file, 'utf-8'); }
  catch (e) { console.error(`  ✗ Cannot read: ${file}`); return ''; }
}

let errors = 0;

// ─── 1. Parse daemon providers.ts ───
console.log('▶ Daemon providers.ts...');
const src = read(path.join(DAEMON_ROOT, 'src', 'media', 'providers.ts'));

const allMatch = src.match(/ALL_PROVIDERS.*?=\s*\[([\s\S]*?)\n\];/);
if (!allMatch) { console.error('  ✗ Cannot find ALL_PROVIDERS'); process.exit(1); }

const block = allMatch[1];

// All `id:` entries
const allIdMatches = [...block.matchAll(/\{\s*id:\s*'([^']+)'/g)].map(m => m[1]);

// Extract provider IDs — they appear at depth 1 (top-level of ALL_PROVIDERS array)
// Key heuristic: provider entries start with `{` then `id:` on the very next line
const providerIds = [...block.matchAll(/\{\s*\n\s*id:\s*'([^']+)'/g)].map(m => m[1]);

// All model IDs = all IDs minus provider IDs
const allModelIds = allIdMatches.filter(id => !providerIds.includes(id));
const modelToProvider = {};
const modelCaps = {};

// Map each model to its provider by looking at lines between provider boundaries
const lines = block.split('\n');
let currentProv = null;

// Find all caps assignments and map them to model IDs
const capsRegex = /caps:\s*\[([^\]]*)\]/;
const modelLineRegex = /id:\s*'([^']+)'/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Detect provider start
  const pMatch = line.match(/^\s*id:\s*'([^']+)'/);
  if (pMatch && providerIds.includes(pMatch[1])) {
    currentProv = pMatch[1];
    // Check if this provider ID wasn't matched by the provider regex
    if (!modelToProvider[pMatch[1]]) continue;
  }

  // Assign provider to model
  const idMatch = line.match(modelLineRegex);
  const capsMatch = line.match(capsRegex);
  if (idMatch && currentProv && providerIds.includes(currentProv)) {
    const modelId = idMatch[1];
    if (!providerIds.includes(modelId)) {
      if (modelToProvider[modelId] && modelToProvider[modelId] !== currentProv) {
        console.error(`  ✗ DUPLICATE MODEL: "${modelId}" (${modelToProvider[modelId]}, ${currentProv})`);
        errors++;
      }
      modelToProvider[modelId] = currentProv;
      if (capsMatch) {
        modelCaps[modelId] = capsMatch[1].split(',').map(c => c.trim().replace(/'/g, ''));
      }
    }
  }
}

const videoIds = allModelIds.filter(id => (modelCaps[id] || []).some(c => ['t2v', 'i2v', 'r2v', 'video-edit', 'character-anim'].includes(c)));
const imageIds = allModelIds.filter(id => (modelCaps[id] || []).some(c => ['t2i', 'i2i', 'inpaint'].includes(c)));
const audioIds = allModelIds.filter(id => (modelCaps[id] || []).includes('tts'));

console.log(`  ✓ Providers: ${providerIds.length} (${providerIds.join(', ')})`);
console.log(`  ✓ Total models: ${allModelIds.length}`);
console.log(`  ✓ VIDEO models: ${videoIds.length}`);
console.log(`  ✓ IMAGE models: ${imageIds.length}`);
console.log(`  ✓ AUDIO models: ${audioIds.length}`);

// ─── 2. Cross-check with Laravel media_providers config ───
console.log('\n▶ Laravel media_providers.php...');
const confFile = path.join(PROJECT_ROOT, 'backend', 'config', 'media_providers.php');
const confSrc = read(confFile);

if (confSrc) {
  // default_models
  const defaultBlock = confSrc.match(/'default_models'\s*=>\s*\[([^\]]+)\]/s);
  if (defaultBlock) {
    const defaultModels = [...defaultBlock[1].matchAll(/=>\s*'([^']+)'/g)].map(m => m[1]);
    console.log(`  ✓ default_models: ${defaultModels.length} entries`);
    for (const mid of defaultModels) {
      if (!allModelIds.includes(mid)) {
        console.error(`  ✗ media_providers.php default_models has "${mid}" — NOT in daemon providers.ts`);
        errors++;
      }
    }
  }

  // available models
  const availModelIds = [...confSrc.matchAll(/'([a-zA-Z0-9.\/-]+)'\s*=>\s*\[\s*(?:'capabilities'|'cost_hint')/g)].map(m => m[1]);
  console.log(`  ✓ config models: ${availModelIds.length} model entries`);

  for (const mid of availModelIds) {
    if (!allModelIds.includes(mid) && !mid.startsWith('stub-')) {
      console.error(`  ✗ media_providers.php has "${mid}" — NOT in daemon providers.ts`);
      errors++;
    }
  }

  for (const mid of allModelIds) {
    if (!availModelIds.includes(mid) && modelToProvider[mid] !== 'stub') {
      console.error(`  ✗ daemon has "${mid}" (${modelToProvider[mid]}) — NOT in media_providers.php`);
      errors++;
    }
  }
}

// ─── 3. Check PlanSeeder model_mapping ───
console.log('\n▶ Laravel PlanSeeder.php...');
const seedFile = path.join(PROJECT_ROOT, 'backend', 'database', 'seeders', 'PlanSeeder.php');
const seedSrc = read(seedFile);

if (seedSrc) {
  const mappingBlocks = [...seedSrc.matchAll(/'model_mapping'\s*=>\s*\[([\s\S]*?)\]/g)];
  console.log(`  ✓ Found ${mappingBlocks.length} plan model mappings`);

  let hasDefault = true;
  for (const blockMatch of mappingBlocks) {
    const blockText = blockMatch[1];
    const modelValues = [...blockText.matchAll(/'[a-zA-Z0-9_.-]+'\s*=>\s*'([^']+)'/g)].map(m => m[1]);
    
    for (const modelId of modelValues) {
      if (!allModelIds.includes(modelId)) {
        console.error(`  ✗ PlanSeeder references "${modelId}" — NOT in daemon providers.ts`);
        errors++;
      }
    }

    if (!blockText.includes("'default' =>") && !blockText.includes('"default" =>')) {
      hasDefault = false;
    }
  }

  if (!hasDefault) {
    console.error(`  ✗ Plan model_mapping missing 'default' key — needed for fallback model resolution`);
    errors++;
  } else {
    console.log(`  ✓ 'default' key present in all model_mappings`);
  }
}

console.log(`\n${errors === 0 ? '✓ PASS — models in sync' : `✗ FAIL — ${errors} drift(s)`}`);
process.exit(errors > 0 ? 1 : 0);
