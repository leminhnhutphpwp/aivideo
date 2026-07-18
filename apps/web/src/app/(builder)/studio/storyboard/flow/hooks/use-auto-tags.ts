'use client';

import { useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';

export function useAutoTags(nodes: Node[], edges: Edge[], setNodes: any) {
  useEffect(() => {
    if (nodes.length === 0) return;
    const hasIncoming = new Set(edges.map((e) => e.target));
    const hasOutgoing = new Set(edges.map((e) => e.source));

    setNodes((nds: Node[]) =>
      nds.map((n) => {
        const isIntro = !hasIncoming.has(n.id);
        const isOutro = !hasOutgoing.has(n.id);
        const tag =
          nodes.length === 1 ? null : isIntro ? 'intro' : isOutro ? 'outro' : 'transition';
        return n.data.tag === tag ? n : { ...n, data: { ...n.data, tag } };
      }),
    );
  }, [edges, nodes.length, setNodes]);
}
