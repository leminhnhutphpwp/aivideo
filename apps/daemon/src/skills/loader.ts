import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

export interface LoadedSkill {
  id: string;
  label: string;
  raw: Record<string, any>;
  body: string;
  path: string;
  dir: string;
}

function resolveSkillsRoot(): string {
  const envDir = process.env['SKILLS_DIR'];
  if (envDir && fs.existsSync(envDir)) {
    console.log(`[skills-loader] Using SKILLS_DIR: ${envDir}`);
    return envDir;
  }
  const here = path.dirname(new URL(import.meta.url).pathname);
  const candidates = [
    path.resolve(process.cwd(), '..', 'skills'),
    path.resolve(process.cwd(), 'apps', 'skills'),
    path.resolve(here, '..', '..', 'skills'),
    path.resolve(here, '..', '..', '..', 'skills'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      console.log(`[skills-loader] Resolved skills root: ${c}`);
      return c;
    }
  }
  console.warn(`[skills-loader] No skills directory found (tried ${candidates.join(', ')})`);
  return candidates[0];
}

const SKILLS_ROOT = resolveSkillsRoot();

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

function parseFrontmatter(raw: string): Record<string, any> {
  try {
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
  } catch {}
  return {};
}
function parseSkillFile(filePath: string): LoadedSkill | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;
  const fm = parseFrontmatter(match[1]);
  const body = match[2].trim();
  const dirName = path.basename(path.dirname(filePath));
  return { id: fm.id || dirName, label: fm.label || fm.label_en || dirName, raw: fm, body, path: filePath, dir: path.dirname(filePath) };
}

export function loadSkills(category: string, baseDir?: string): LoadedSkill[] {
  const skillsDir = baseDir ? path.join(baseDir, 'skills', category) : path.join(SKILLS_ROOT, category);
  if (!fs.existsSync(skillsDir)) {
    console.warn(`[skills-loader] Directory not found: ${skillsDir}`);
    return [];
  }
  const skills: LoadedSkill[] = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const parsed = parseSkillFile(skillFile);
    if (!parsed) { console.warn(`[skills-loader] Failed to parse: ${skillFile}`); continue; }
    skills.push(parsed);
  }
  console.log(`[skills-loader] Loaded ${skills.length} skills from ${category}`);
  return skills;
}

export function loadSingleSkill(category: string, baseDir?: string): LoadedSkill | null {
  const skillFile = baseDir ? path.join(baseDir, 'skills', category, 'SKILL.md') : path.join(SKILLS_ROOT, category, 'SKILL.md');
  if (!fs.existsSync(skillFile)) { console.warn(`[skills-loader] Not found: ${skillFile}`); return null; }
  const parsed = parseSkillFile(skillFile);
  if (!parsed) { console.warn(`[skills-loader] Failed to parse: ${skillFile}`); return null; }
  console.log(`[skills-loader] Loaded skill from ${category}`);
  return parsed;
}

/**
 * A skill is consumed at generation time only when it is published. A missing
 * `status` means published. Mirrors the draft-hiding rule of `GET /media/skills`
 * so a `status: draft` skill can never leak into the generation pipeline while it
 * is still hidden from the studio UI.
 */
export function isPublishedSkill(skill: LoadedSkill): boolean {
  return (skill.raw.status ?? 'published') !== 'draft';
}

export function loadVideoDirections(baseDir?: string): LoadedSkill[] {
  return loadSkills('video-direction', baseDir);
}

/** Single "marketing psychology" system skill (behavioral-science framing for video). */
export function loadVideoMarketingPsychology(baseDir?: string): LoadedSkill | null {
  return loadSingleSkill('video-marketing-psychology', baseDir);
}

export function loadVideoContract(baseDir?: string): LoadedSkill | null {
  return loadSingleSkill('video-contract', baseDir);
}

export function loadVideoDiscovery(baseDir?: string): LoadedSkill | null {
  return loadSingleSkill('video-discovery', baseDir);
}

export function loadVideoCompose(baseDir?: string): LoadedSkill | null {
  return loadSingleSkill('video-compose', baseDir);
}

export function loadVideoStoryboard(baseDir?: string): LoadedSkill | null {
  return loadSingleSkill('video-storyboard', baseDir);
}

export function loadImageDirections(baseDir?: string): LoadedSkill[] {
  return loadSkills('image-direction', baseDir);
}

export function loadStoryboardTypes(baseDir?: string): LoadedSkill[] {
  return loadSkills('video-storyboard/types', baseDir);
}
