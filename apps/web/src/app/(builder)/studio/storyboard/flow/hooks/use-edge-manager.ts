'use client';

import { useState, useCallback } from 'react';
import type { Edge } from '@xyflow/react';

export function useEdgeManager(setEdges: any, setSceneFormData: any) {
  const [selectedEdge, setSelectedEdge] = useState<{
    id: string;
    source: string;
    target: string;
    label?: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('');

  const deleteEdge = useCallback(
    (edgeId: string) => {
      const edge = selectedEdge;
      setEdges((eds: Edge[]) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdge(null);

      if (edge) {
        setSceneFormData((prev: any) => ({
          ...prev,
          [edge.target]: { ...prev[edge.target], parent_key: null, edge_label: '' },
        }));
      }
    },
    [selectedEdge, setEdges, setSceneFormData],
  );

  const saveEdgeLabel = useCallback(() => {
    if (!selectedEdge) return;
    setEdges((eds: Edge[]) =>
      eds.map((e) =>
        e.id === selectedEdge.id ? { ...e, label: editingEdgeLabel || undefined } : e,
      ),
    );
    setSceneFormData((prev: any) => ({
      ...prev,
      [selectedEdge.target]: {
        ...prev[selectedEdge.target],
        edge_label: editingEdgeLabel || null,
      },
    }));
    setSelectedEdge(null);
  }, [selectedEdge, editingEdgeLabel, setEdges, setSceneFormData]);

  return { selectedEdge, setSelectedEdge, editingEdgeLabel, setEditingEdgeLabel, deleteEdge, saveEdgeLabel };
}
