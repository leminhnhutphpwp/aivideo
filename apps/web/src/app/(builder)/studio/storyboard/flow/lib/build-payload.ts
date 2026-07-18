import type { Node, Edge } from '@xyflow/react';
import { initForm } from '../hooks/use-scene-form';

export function buildBasePayload(params: {
  title: string;
  videoType: string;
  planTier: string;
  voiceMood?: string;
  voiceId?: string;
  renderMode: 'multi_scene' | 'single_flow' | 'storyboard_image';
  nodes: Node[];
  edges: Edge[];
  sceneFormData: Record<string, any>;
}) {
  const { title, videoType, planTier, voiceMood, voiceId, renderMode, nodes, edges, sceneFormData } =
    params;

  return {
    title,
    description: '',
    video_type: videoType,
    quality_tier: planTier,
    voice_mood: voiceMood || undefined,
    voice: voiceId || undefined,
    render_mode: renderMode,
    scenes: nodes.map((node) => {
      const f = sceneFormData[node.id] || initForm(node.id);
      const parentEdge = edges.find((e) => e.target === node.id);
      return {
        ...f,
        _key: node.id,
        parent_key: parentEdge?.source || null,
        position_x: node.position.x,
        position_y: node.position.y,
      };
    }),
  };
}
