'use client';

import { useState, useCallback } from 'react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import { topologicalSort } from '../lib/topological-sort';

export function usePlayback() {
  const [playbackActive, setPlaybackActive] = useState(false);

  const handlePlayback = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    rfInstance: ReactFlowInstance | null,
    setSelectedNodeId: (id: string) => void,
  ) => {
    if (playbackActive || nodes.length === 0) return;
    setPlaybackActive(true);
    const ordered = topologicalSort(nodes, edges);
    for (const nodeId of ordered) {
      setSelectedNodeId(nodeId);
      rfInstance?.fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 0.5 });
      await new Promise(r => setTimeout(r, 1200));
    }
    rfInstance?.fitView({ padding: 0.3, duration: 500 });
    setPlaybackActive(false);
  }, [playbackActive]);

  return { playbackActive, handlePlayback };
}
