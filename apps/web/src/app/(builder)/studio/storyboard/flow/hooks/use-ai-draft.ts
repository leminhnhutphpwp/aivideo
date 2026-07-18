'use client';

import { useState, useCallback } from 'react';
import { MarkerType, type Node } from '@xyflow/react';
import { laravel } from '@/lib/api/client';
import { genId } from './use-canvas-state';
import { initForm } from './use-scene-form';
import type { SceneFormData } from '@/lib/api/storyboard-types';

interface AiDraftParams {
  setNodes: any;
  setEdges: any;
  setSceneFormData: any;
  addToast: any;
  markStale?: () => void;
  renderMode?: 'multi_scene' | 'single_flow' | 'storyboard_image';
}

export function useAiDraft({ setNodes, setEdges, setSceneFormData, addToast, markStale, renderMode }: AiDraftParams) {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiConcept, setAiConcept] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiDraft = useCallback(async (videoType: string, currentNodes: Node[]) => {
    if (!aiConcept.trim() || aiConcept.trim().length < 10) {
      addToast('Vui lòng nhập ít nhất 10 ký tự', 'warning');
      return;
    }
    // Keep the modal OPEN during the wait so its loading state is visible — a draft can
    // take tens of seconds. It closes on success; on error it stays open (concept intact)
    // so the user can retry without retyping.
    setAiLoading(true);
    try {
      const result = await laravel.aiStoryboardDraft(aiConcept.trim(), videoType);
      const scenes = result.scenes || [];
      if (scenes.length < 2) { addToast('AI không tạo đủ cảnh', 'error'); return; }

      const newNodes: Node[] = [];
      const newFormData: Record<string, SceneFormData> = {};
      scenes.forEach((s: any, i: number) => {
        const key = genId();
        newNodes.push({
          id: key, type: 'sceneNode',
          position: { x: 80 + (i % 3) * 280, y: 80 + Math.floor(i / 3) * 200 },
          data: {
            nodeId: key, sceneNumber: currentNodes.length + i + 1, duration: s.duration_seconds, prompt: s.prompt,
            aspect_ratio: s.aspect_ratio || '16:9', camera_movement: s.camera_movement, style: s.style,
            has_reference: false, has_narration: !!s.narration, refPreview: null,
          },
        });
        newFormData[key] = {
          _key: key, parent_key: null, prompt: s.prompt, duration_seconds: s.duration_seconds,
          camera_movement: s.camera_movement || '', lighting: '', style: s.style || '', mood: s.mood || '',
          negative_prompt: '', reference_image: '', last_frame_image: '', narration: s.narration || '',
          aspect_ratio: s.aspect_ratio || '16:9', resolution: s.resolution || '720p',
          edge_label: null, position_x: 100, position_y: 200,
        };
      });

      for (let i = 1; i < newNodes.length; i++) {
        const isLast = i === newNodes.length - 1;
        const label = renderMode === 'single_flow'
          ? (isLast ? 'Kết thúc' : 'Chuyển tiếp')
          : undefined;
        setEdges((eds: any[]) => [...eds, {
          id: `e-${newNodes[i - 1].id}-${newNodes[i].id}`,
          source: newNodes[i - 1].id, target: newNodes[i].id, type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff30' },
          style: { stroke: '#ffffff14', strokeWidth: 1.5 },
          label,
        }]);
        newFormData[newNodes[i].id].parent_key = newNodes[i - 1].id;
        newFormData[newNodes[i].id].edge_label = label || null;
      }

      setNodes((nds: Node[]) => [...nds, ...newNodes]);
      setSceneFormData((prev: any) => ({ ...prev, ...newFormData }));
      if (renderMode === 'single_flow') markStale?.();
      addToast(`AI đã tạo ${scenes.length} cảnh`, 'success');
      setAiModalOpen(false);
      setAiConcept('');
    } catch (e: any) {
      // Leave the modal open + concept intact so the user can retry.
      addToast(e?.message || 'AI không khả dụng', 'error');
    } finally {
      setAiLoading(false);
    }
  }, [aiConcept, setNodes, setEdges, setSceneFormData, addToast, markStale, renderMode]);

  return { aiModalOpen, setAiModalOpen, aiConcept, setAiConcept, aiLoading, handleAiDraft };
}
