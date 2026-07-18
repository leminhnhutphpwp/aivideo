import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type SimulationLatency = {
  image: number;
  video: number;
  audio: number;
  jitter: number;
};

export type SimulationConfig = {
  enabled: boolean;
  latency: SimulationLatency;
};

const DEFAULT_LATENCY: SimulationLatency = {
  image: 1000,
  video: 2000,
  audio: 1000,
  jitter: 0.3,
};

const MIN_LATENCY_MS = 100;

function clampLatency(v: number): number {
  return Math.max(MIN_LATENCY_MS, Math.round(v));
}

function clampJitter(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function configFilePath(projectRoot: string): string {
  return path.join(projectRoot, 'media-simulation.json');
}

function envLatency(key: string): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export async function isSimulationEnabled(): Promise<boolean> {
  const envVal = process.env['SIMULATION_MODE'];
  if (envVal === '1' || envVal === 'true') return true;
  if (envVal === '0' || envVal === 'false') return false;

  const cfg = await getSimulationConfig();
  return cfg.enabled;
}

export async function getSimulationConfig(): Promise<SimulationConfig> {
  const filePath = configFilePath(process.env['PROJECT_ROOT'] || process.cwd());
  let fileCfg: Partial<SimulationConfig> = {};
  try {
    const raw = await readFile(filePath, 'utf8');
    fileCfg = JSON.parse(raw);
    if (typeof fileCfg !== 'object' || fileCfg === null) {
      fileCfg = {};
    }
  } catch {
    fileCfg = {};
  }

  const latency: SimulationLatency = {
    image: clampLatency(envLatency('SIMULATION_LATENCY_IMAGE') ?? fileCfg.latency?.image ?? DEFAULT_LATENCY.image),
    video: clampLatency(envLatency('SIMULATION_LATENCY_VIDEO') ?? fileCfg.latency?.video ?? DEFAULT_LATENCY.video),
    audio: clampLatency(envLatency('SIMULATION_LATENCY_AUDIO') ?? fileCfg.latency?.audio ?? DEFAULT_LATENCY.audio),
    jitter: clampJitter(envLatency('SIMULATION_LATENCY_JITTER') ?? fileCfg.latency?.jitter ?? DEFAULT_LATENCY.jitter),
  };

  return { enabled: fileCfg.enabled ?? false, latency };
}

export async function setSimulationConfig(cfg: SimulationConfig): Promise<SimulationConfig> {
  const filePath = configFilePath(process.env['PROJECT_ROOT'] || process.cwd());
  const current = await getSimulationConfig();
  const merged: SimulationConfig = {
    enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : current.enabled,
    latency: {
      image: clampLatency(cfg.latency?.image ?? current.latency.image),
      video: clampLatency(cfg.latency?.video ?? current.latency.video),
      audio: clampLatency(cfg.latency?.audio ?? current.latency.audio),
      jitter: clampJitter(cfg.latency?.jitter ?? current.latency.jitter),
    },
  };
  await writeFile(filePath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}
