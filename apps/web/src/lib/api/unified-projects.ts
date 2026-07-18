import { daemon, laravel } from './client';
import type { UnifiedProject, UnifiedProjectType, UnifiedStatus } from './unified-project-types';
import { STATUS_CONFIG } from './unified-project-types';

function storyboardToUnified(sb: any): UnifiedProject {
  const statusMap: Record<string, UnifiedStatus> = {
    draft: 'draft', analyzing: 'analyzing', analyzed: 'analyzed',
    rendering: 'processing', rendered: 'done', completed: 'done', failed: 'failed',
  };
  const status = statusMap[sb.status] || 'draft';
  return {
    id: `storyboard-${sb.uuid}`,
    source: 'storyboard',
    type: 'storyboard',
    title: sb.title || 'Untitled',
    status,
    statusLabel: STATUS_CONFIG[status].label,
    createdAt: sb.created_at,
    updatedAt: sb.updated_at,
    href: `/studio/storyboard/flow/${sb.uuid}`,
    hasThumbnail: !!sb.output_path,
    thumbnailUrl: sb.output_path ? `${laravel.downloadStoryboard(sb.uuid)}` : null,
    storyboard: {
      uuid: sb.uuid,
      scenesCount: sb.scenes_count || 0,
      creditsCost: sb.credits_cost || 0,
      totalDuration: sb.total_duration || null,
      qualityTier: sb.quality_tier || '',
      videoType: sb.video_type || '',
      renderMode: sb.render_mode || 'multi_scene',
      outputPath: sb.output_path || null,
    },
  };
}

function daemonProjectToUnified(p: any): UnifiedProject {
  const typeMap: Record<string, UnifiedProjectType> = {
    video: 'video', image: 'image', audio: 'audio',
  };
  const surface = p.surface || 'other';
  const type = typeMap[surface] || 'other';

  const statusMap: Record<string, UnifiedStatus> = {
    done: 'done', running: 'processing', queued: 'queued', failed: 'failed',
    interrupted: 'failed',
  };
  // Default to 'draft' (not 'done') when the project has no task / unknown
  // status — a project must never falsely show as completed.
  const rawStatus = p.lastTaskStatus || 'draft';
  const status = statusMap[rawStatus] || 'draft';

  return {
    id: `daemon-${p.uuid}`,
    source: 'daemon',
    type,
    title: p.name || 'Untitled',
    status,
    statusLabel: STATUS_CONFIG[status].label,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    href: `/projects/${p.uuid}`,
    hasThumbnail: !!p.lastTaskFile,
    thumbnailUrl: null,
    daemon: {
      projectId: p.uuid,
      surface: p.surface,
      lastTaskStatus: rawStatus,
      lastTaskFile: p.lastTaskFile || null,
    },
  };
}

export async function fetchUnifiedProjects(): Promise<UnifiedProject[]> {
  const [daemonProjects, storyboardsRes] = await Promise.allSettled([
    daemon.listProjects().catch(() => [] as any[]),
    laravel.storyboards({ per_page: 100 }).catch(() => null),
  ]);

  const items: UnifiedProject[] = [];

  if (daemonProjects.status === 'fulfilled') {
    for (const p of daemonProjects.value) {
      const pid: string = p.uuid || '';
      if (pid.includes('-single-flow') || pid.includes('-scene-') || pid.startsWith('multi-panel-')) continue;
      items.push(daemonProjectToUnified(p));
    }
  }

  if (storyboardsRes.status === 'fulfilled' && storyboardsRes.value?.data) {
    for (const sb of storyboardsRes.value.data) {
      items.push(storyboardToUnified(sb));
    }
  }

  items.sort((a, b) => {
    const aTime = typeof a.updatedAt === 'number' ? a.updatedAt : new Date(a.updatedAt).getTime();
    const bTime = typeof b.updatedAt === 'number' ? b.updatedAt : new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });

  return items;
}
