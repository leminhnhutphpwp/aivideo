'use client';

import { useState, useCallback } from 'react';
import { MarkerType } from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import { genId } from './use-canvas-state';
import { initForm } from './use-scene-form';
import type { SceneFormData } from '@/lib/api/storyboard-types';

export function useCanvasActions(
  nodes: Node[],
  edges: Edge[],
  setNodes: any,
  setEdges: any,
  sceneFormData: Record<string, SceneFormData>,
  setSceneFormData: any,
  selectedNodeId: string | null,
  setSelectedNodeId: any,
) {
  const addScene = useCallback(
    (parentKey?: string | null) => {
      const key = genId();
      const pNode = parentKey ? nodes.find((n) => n.id === parentKey) : null;
      const x = pNode ? pNode.position.x + 280 : 80 + Math.random() * 200;
      const siblings = parentKey
        ? edges.filter((e) => e.source === parentKey).length
        : nodes.filter((n) => !edges.some((e) => e.target === n.id)).length;
      const y = pNode ? pNode.position.y + siblings * 180 : 80 + nodes.length * 60;

      const newNode: Node = {
        id: key,
        type: 'sceneNode',
        position: { x, y },
        data: {
          nodeId: key,
          sceneNumber: nodes.length + 1,
          duration: 5,
          prompt: '',
          aspect_ratio: '16:9',
          camera_movement: '',
          style: '',
          has_reference: false,
          has_narration: false,
          refPreview: null,
        },
      };

      setNodes((nds: Node[]) => [...nds, newNode]);
      setSceneFormData((prev: any) => ({ ...prev, [key]: initForm(key) }));
      setSelectedNodeId(key);

      if (parentKey) {
        const edgeId = `e-${parentKey}-${key}`;
        const newEdge: Edge = {
          id: edgeId,
          source: parentKey,
          target: key,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#ffffff14', strokeWidth: 1.5 },
        };
        setEdges((eds: Edge[]) => [...eds, newEdge]);
        setSceneFormData((prev: any) => ({
          ...prev,
          [key]: { ...prev[key], parent_key: parentKey },
        }));
      }
    },
    [nodes, edges, setNodes, setEdges, sceneFormData, setSceneFormData, selectedNodeId, setSelectedNodeId],
  );

  const deleteScene = useCallback(
    (nodeId: string) => {
      // Recursively delete children
      edges
        .filter((e) => e.source === nodeId)
        .forEach((e) => deleteScene(e.target));

      setNodes((nds: Node[]) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds: Edge[]) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSceneFormData((prev: any) => {
        const n = { ...prev };
        delete n[nodeId];
        return n;
      });
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [edges, setNodes, setEdges, setSceneFormData, selectedNodeId, setSelectedNodeId],
  );

  const duplicateScene = useCallback(
    (nodeId: string) => {
      const src = nodes.find((n) => n.id === nodeId);
      const f = sceneFormData[nodeId];
      if (!src || !f) return;

      const key = genId();
      const newNode: Node = {
        id: key,
        type: 'sceneNode',
        position: { x: src.position.x + 40, y: src.position.y + 60 },
        data: { ...src.data, nodeId: key, sceneNumber: nodes.length + 1 },
      };
      setNodes((nds: Node[]) => [...nds, newNode]);
      setSceneFormData((prev: any) => ({
        ...prev,
        [key]: { ...f, _key: key, parent_key: null },
      }));
      setSelectedNodeId(key);
    },
    [nodes, sceneFormData, setNodes, setSceneFormData, setSelectedNodeId],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      // Remove any existing incoming connection to this target
      setEdges((eds: Edge[]) => eds.filter((e) => e.target !== c.target));
      setEdges((eds: Edge[]) => [
        ...eds,
        {
          id: `e-${c.source}-${c.target}`,
          source: c.source!,
          target: c.target!,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#ffffff30' },
          style: { stroke: '#ffffff14', strokeWidth: 1.5 },
        },
      ]);
      setSceneFormData((prev: any) => ({
        ...prev,
        [c.target!]: { ...prev[c.target!], parent_key: c.source! },
      }));
    },
    [setEdges, setSceneFormData],
  );

  return { addScene, deleteScene, duplicateScene, onConnect };
}
