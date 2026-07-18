'use client';

import { useMemo, useCallback } from 'react';
import { useNodesState, useEdgesState, type Node, type Edge, type Connection, MarkerType } from '@xyflow/react';

let idCounter = 0;
export const genId = () => `n_${++idCounter}_${Date.now()}`;
export const resetIdCounter = () => { idCounter = 0; };

export function useCanvasState(initialNodes?: Node[], initialEdges?: Edge[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges ?? []);

  return { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange, genId };
}
