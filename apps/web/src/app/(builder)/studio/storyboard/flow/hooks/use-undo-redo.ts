'use client';

import { useRef, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

export function useUndoRedo(setNodes: any, setEdges: any) {
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback((nodes: Node[], edges: Edge[]) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const snap = { nodes: nodes.map((n) => ({ ...n })), edges: edges.map((e) => ({ ...e })) };
    historyRef.current = [...historyRef.current.slice(0, historyIdxRef.current + 1), snap];
    historyIdxRef.current = Math.min(historyIdxRef.current + 1, 50);
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current < 0) return;
    skipHistoryRef.current = true;
    const snap = historyRef.current[historyIdxRef.current];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    historyIdxRef.current -= 1;
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIdxRef.current + 2 > historyRef.current.length - 1) return;
    skipHistoryRef.current = true;
    const snap = historyRef.current[historyIdxRef.current + 2];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    historyIdxRef.current += 1;
  }, [setNodes, setEdges]);

  return { pushHistory, undo, redo, skipHistoryRef };
}
