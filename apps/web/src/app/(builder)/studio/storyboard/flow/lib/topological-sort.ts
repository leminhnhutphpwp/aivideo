import type { Node, Edge } from '@xyflow/react';

export function topologicalSort(nodes: Node[], edges: Edge[]): string[] {
  const visited = new Set<string>();
  const ordered: string[] = [];
  const queue = nodes
    .filter(n => !edges.some(e => e.target === n.id))
    .map(n => n.id);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    ordered.push(id);
    edges.filter(e => e.source === id)
      .map(e => e.target)
      .forEach(c => { if (!visited.has(c)) queue.push(c); });
  }
  nodes.forEach(n => { if (!visited.has(n.id)) ordered.push(n.id); });
  return ordered;
}
