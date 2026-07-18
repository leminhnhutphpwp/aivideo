'use client';

import { useState, useCallback } from 'react';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import { genId } from './use-canvas-state';
import type { SceneFormData } from '@/lib/api/storyboard-types';

interface TemplateImportParams {
  setNodes: any;
  setEdges: any;
  setSceneFormData: any;
  addToast: any;
  rfInstance: React.MutableRefObject<any>;
  markStale?: () => void;
  renderMode?: 'multi_scene' | 'single_flow' | 'storyboard_image';
}

export function useTemplateImport({
  setNodes, setEdges, setSceneFormData, addToast, rfInstance, markStale, renderMode,
}: TemplateImportParams) {
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);

  const importTemplate = useCallback((template: any, startIndex: number = 0) => {
    if (!template.scenes?.length) return;
    const newNodes: Node[] = [];
    const newFormData: Record<string, any> = {};
    const newEdges: Edge[] = [];

    template.scenes.forEach((s: any, i: number) => {
      const key = genId();
      const posX = s.position_x ?? 100 + (i % 2) * 280;
      const posY = s.position_y ?? 100 + Math.floor(i / 2) * 200;
      newNodes.push({
        id: key, type: 'sceneNode',
        position: { x: posX, y: posY },
        data: {
          nodeId: key, sceneNumber: startIndex + i + 1,
          duration: s.duration_seconds || 5, prompt: s.prompt || '',
          aspect_ratio: s.aspect_ratio || '16:9', camera_movement: s.camera || '',
          style: s.style || '', has_reference: false, has_narration: !!s.narration,
          refPreview: null, lastFramePreview: null,
        },
      });
      newFormData[key] = {
        _key: key, parent_key: null,
        prompt: s.prompt || '', duration_seconds: s.duration_seconds || 5,
        camera_movement: s.camera || '', lighting: s.lighting || '',
        style: s.style || '', mood: s.mood || '',
        negative_prompt: '', reference_image: '', last_frame_image: '',
        narration: s.narration || '', aspect_ratio: s.aspect_ratio || '16:9',
        resolution: '720p', edge_label: null,
        position_x: posX, position_y: posY,
      };
    });

    const lastNodeIdx = newNodes.length - 1;

    (template.edges || []).forEach((e: any) => {
      if (!e.from || !e.to || e.from < 1 || e.to < 1) return;
      const fromIdx = e.from - 1;
      const toIdx = e.to - 1;
      if (fromIdx >= 0 && fromIdx < newNodes.length && toIdx >= 0 && toIdx < newNodes.length) {
        const isLast = toIdx === lastNodeIdx;
        const edgeLabel = e.label
          || (renderMode === 'single_flow'
            ? (isLast ? 'Kết thúc' : 'Chuyển tiếp')
            : (isLast ? 'Kết thúc' : toIdx === 1 ? 'Mở đầu' : 'Chuyển tiếp'));
        newEdges.push({
          id: `e-${newNodes[fromIdx].id}-${newNodes[toIdx].id}`,
          source: newNodes[fromIdx].id, target: newNodes[toIdx].id,
          type: 'smoothstep', animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff30' },
          style: { stroke: '#ffffff14', strokeWidth: 1.5 },
          label: edgeLabel,
        });
        newFormData[newNodes[toIdx].id].parent_key = newNodes[fromIdx].id;
        newFormData[newNodes[toIdx].id].edge_label = edgeLabel || null;
      }
    });

    setNodes((nds: Node[]) => [...nds, ...newNodes]);
    setEdges((eds: Edge[]) => [...eds, ...newEdges]);
    setSceneFormData((prev: any) => ({ ...prev, ...newFormData }));
    setTemplateOpen(false);
    if (renderMode === 'single_flow') markStale?.();
    addToast(`Đã thêm mẫu "${template.name}" (${newNodes.length} cảnh)`, 'success');
    setTimeout(() => rfInstance.current?.fitView({ padding: 0.3, duration: 400 }), 100);
  }, [setNodes, setEdges, setSceneFormData, addToast, rfInstance, markStale, renderMode]);

  return { templateOpen, setTemplateOpen, pendingTemplate, setPendingTemplate, importTemplate };
}
