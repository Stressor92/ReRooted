import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_W = 160;
const NODE_H = 164;

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  dir: 'TB' | 'LR' = 'TB',
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: dir,
    ranksep: dir === 'TB' ? 56 : 88,
    nodesep: dir === 'TB' ? 36 : 52,
    edgesep: 24,
    marginx: 28,
    marginy: 28,
  });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });
}
