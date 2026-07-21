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

  // Patch node data with callbacks whenever the node set changes. Nodes hydrated async
  // (e.g. loading an existing storyboard) are created WITHOUT onDelete/onDuplicate/onAddChild,
  // so their Xóa / Nhân bản / Thêm con buttons would be dead. We only patch nodes that are
  // missing the callbacks — so this re-runs safely on `nodes` changes without an update loop
  // (already-patched runs return the same reference and React bails out). The callbacks are
  // stable wrappers that read the latest handlers from actionsRef.
  useEffect(() => {
    setNodes((nds: Node[]) => {
      if (nds.length === 0) return nds;
      let changed = false;
      const next = nds.map((n) => {
        if (n.data?.onDelete && n.data?.onDuplicate && n.data?.onAddChild) return n;
        changed = true;
        return {
          ...n,
          data: {
            ...n.data,
            onDelete: (id: string) => actionsRef.current.del(id),
            onDuplicate: (id: string) => actionsRef.current.dup(id),
            onAddChild: (id: string | null) => actionsRef.current.add(id),
          },
        };
      });
      return changed ? next : nds;
    });
  }, [nodes, setNodes]);

  return { actionsRef };
}
