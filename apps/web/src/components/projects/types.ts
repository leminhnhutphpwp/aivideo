import type { ComponentType } from 'react';

export type MediaSurface = 'image' | 'video' | 'audio';

export interface TaskFile {
  name?: string;
  mime?: string;
  size?: number;
  providerId?: string;
  providerNote?: string;
  providerError?: string;
  usedStubFallback?: boolean;
}

export interface TaskError {
  message?: string;
  code?: string;
}

export interface TaskRecord {
  taskId: string;
  id?: string;
  status?: string;
  surface?: string;
  model?: string;
  file?: TaskFile;
  error?: TaskError;
  progress?: string[];
  startedAt?: number;
  endedAt?: number | null;
  metadata?: Record<string, any>;
}

export interface ProjectRecord {
  uuid: string;
  name?: string;
  surface?: string;
  skillId?: string;
  createdAt?: number;
  resolvedDir?: string;
  metadata?: Record<string, unknown>;
}

export interface RenderJobRecord {
  id: number;
  uuid: string;
  status: string;
  prompt: string;
  model?: string;
  capability?: string;
  video_type?: string;
  duration_seconds: number;
  aspect_ratio: string;
  resolution: string;
  error_message?: string;
  error_metadata?: { raw_error?: string; error_code?: string; provider?: string } | null;
  created_at: string;
  updated_at: string;
  parameters?: Record<string, any>;
  output_url?: string | null;
  mime_type?: string | null;
  assets?: { uuid: string; type: string; mime_type: string; url: string; size_bytes?: number }[];
  visibility?: 'private' | 'sharing' | 'public';
  published_at?: string | null;
  tags?: string[];
  credits_cost?: number;
}

export interface SurfaceMeta {
  icon: ComponentType<{ className?: string }>;
  label: string;
  fields: { label: string; value: string | number | null | undefined; icon?: ComponentType<{ className?: string }> }[];
}
