'use client';

import { useEffect, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface SyncRefsParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: any;
  sceneRefPreviews: Record<string, string>;
  deleteScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  addScene: (parentKey?: string | null) => void;
}

export function useSyncRefs({
  nodes, edges, setNodes, sceneRefPreviews, deleteScene, duplicateScene, addScene,
}: SyncRefsParams) {
  const actionsRef = useRef<{
    del: (id: string) => void;
    dup: (id: string) => void;
    add: (id: string | null) => void;
  }>({ del: () => {}, dup: () => {}, add: () => {} });

  // Sync callbacks to ref so node data always has latest
  useEffect(() => {
    actionsRef.current = { del: deleteScene, dup: duplicateScene, add: addScene };
  });

  // Sync sceneRefPreviews to node data
  useEffect(() => {
    if (Object.keys(sceneRefPreviews).length === 0) return;
    setNodes((nds: Node[]) =>
      nds.map((n) =>
        sceneRefPreviews[n.id]
          ? { ...n, data: { ...n.data, refPreview: sceneRefPreviews[n.id] } }
          : n,
      ),
    );
  }, [sceneRefPreviews, setNodes]);

  // Patch node data with callbacks on mount
  useEffect(() => {
    setNodes((nds: Node[]) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: actionsRef.current.del,
          onDuplicate: actionsRef.current.dup,
          onAddChild: actionsRef.current.add,
        },
      })),
    );
  }, []);

  return { actionsRef };
}
