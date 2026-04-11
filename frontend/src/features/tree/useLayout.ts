import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_W = 160;
const NODE_H = 164;
const PARTNER_GAP = 88;
const ROW_GAP = 72;
const TB_RANK_GAP = 92;

type NodeId = string;

function buildPartnerGroupMap(nodes: Node[], edges: Edge[]): Map<NodeId, NodeId> {
  const parent = new Map<NodeId, NodeId>(nodes.map((node) => [node.id, node.id]));

  const find = (id: NodeId): NodeId => {
    const current = parent.get(id) ?? id;
    if (current === id) {
      return current;
    }

    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (left: NodeId, right: NodeId): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      parent.set(rightRoot, leftRoot);
    }
  };

  for (const edge of edges) {
    if (edge.type === 'partner') {
      union(edge.source, edge.target);
    }
  }

  return new Map(nodes.map((node) => [node.id, find(node.id)]));
}

function buildGenerationMap(nodes: Node[], edges: Edge[]): Map<NodeId, number> {
  const baseGroupMap = buildPartnerGroupMap(nodes, edges);
  const generationParent = new Map<NodeId, NodeId>([...baseGroupMap.entries()]);

  const find = (id: NodeId): NodeId => {
    const current = generationParent.get(id) ?? id;
    if (current === id) {
      return current;
    }

    const root = find(current);
    generationParent.set(id, root);
    return root;
  };

  const union = (left: NodeId, right: NodeId): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) {
      generationParent.set(rightRoot, leftRoot);
    }
  };

  const parentsByChild = new Map<NodeId, NodeId[]>();
  for (const edge of edges) {
    if (edge.type !== 'child') {
      continue;
    }

    const parentGroup = baseGroupMap.get(edge.source) ?? edge.source;
    const childParents = parentsByChild.get(edge.target) ?? [];
    childParents.push(parentGroup);
    parentsByChild.set(edge.target, childParents);
  }

  for (const parentGroups of parentsByChild.values()) {
    if (parentGroups.length < 2) {
      continue;
    }

    const [first, ...rest] = parentGroups;
    for (const next of rest) {
      union(first, next);
    }
  }

  const generationGroupMap = new Map(nodes.map((node) => [node.id, find(baseGroupMap.get(node.id) ?? node.id)]));
  const groups = new Set(generationGroupMap.values());
  const adjacency = new Map<NodeId, Set<NodeId>>([...groups].map((group) => [group, new Set<NodeId>()]));
  const indegree = new Map<NodeId, number>([...groups].map((group) => [group, 0]));
  const levels = new Map<NodeId, number>([...groups].map((group) => [group, 0]));

  for (const edge of edges) {
    if (edge.type !== 'child') {
      continue;
    }

    const sourceGroup = generationGroupMap.get(edge.source) ?? edge.source;
    const targetGroup = generationGroupMap.get(edge.target) ?? edge.target;
    if (sourceGroup === targetGroup) {
      continue;
    }

    const targets = adjacency.get(sourceGroup);
    if (!targets?.has(targetGroup)) {
      targets?.add(targetGroup);
      indegree.set(targetGroup, (indegree.get(targetGroup) ?? 0) + 1);
    }
  }

  const queue: NodeId[] = [...groups].filter((group) => (indegree.get(group) ?? 0) === 0);
  while (queue.length > 0) {
    const group = queue.shift()!;
    const groupLevel = levels.get(group) ?? 0;

    for (const target of adjacency.get(group) ?? []) {
      levels.set(target, Math.max(levels.get(target) ?? 0, groupLevel + 1));
      indegree.set(target, (indegree.get(target) ?? 0) - 1);
      if ((indegree.get(target) ?? 0) === 0) {
        queue.push(target);
      }
    }
  }

  return new Map(nodes.map((node) => [node.id, levels.get(generationGroupMap.get(node.id) ?? node.id) ?? 0]));
}

function enforceGenerationBands(nodes: Node[], edges: Edge[]): Node[] {
  const generationMap = buildGenerationMap(nodes, edges);
  const minY = Math.min(...nodes.map((node) => node.position.y));

  return nodes.map((node) => ({
    ...node,
    position: {
      ...node.position,
      y: minY + (generationMap.get(node.id) ?? 0) * (NODE_H + TB_RANK_GAP),
    },
  }));
}

function alignPartnersForTopBottom(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));

  for (const edge of edges) {
    if (edge.type !== 'partner') {
      continue;
    }

    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) {
      continue;
    }

    const leftNode = source.position.x <= target.position.x ? source : target;
    const rightNode = leftNode.id === source.id ? target : source;
    const minDistance = NODE_W + PARTNER_GAP;
    const currentDistance = rightNode.position.x - leftNode.position.x;

    if (currentDistance < minDistance) {
      const centerX = (leftNode.position.x + rightNode.position.x) / 2;
      leftNode.position.x = Math.round(centerX - minDistance / 2);
      rightNode.position.x = Math.round(centerX + minDistance / 2);
    }
  }

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}

function centerParentGroupsOverChildren(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));
  const partnerGroupMap = buildPartnerGroupMap(nodes, edges);
  const generationMap = buildGenerationMap(nodes, edges);
  const groupNodes = new Map<NodeId, Node[]>();
  const childGroupsByParent = new Map<NodeId, Set<NodeId>>();

  for (const node of nodes) {
    const groupId = partnerGroupMap.get(node.id) ?? node.id;
    const members = groupNodes.get(groupId) ?? [];
    members.push(nodeMap.get(node.id) ?? node);
    groupNodes.set(groupId, members);
  }

  for (const edge of edges) {
    if (edge.type !== 'child') {
      continue;
    }

    const parentGroup = partnerGroupMap.get(edge.source) ?? edge.source;
    const childGroup = partnerGroupMap.get(edge.target) ?? edge.target;
    if (parentGroup === childGroup) {
      continue;
    }

    const childGroups = childGroupsByParent.get(parentGroup) ?? new Set<NodeId>();
    childGroups.add(childGroup);
    childGroupsByParent.set(parentGroup, childGroups);
  }

  const getGroupCenter = (groupId: NodeId): number => {
    const members = groupNodes.get(groupId) ?? [];
    const minX = Math.min(...members.map((node) => node.position.x));
    const maxX = Math.max(...members.map((node) => node.position.x + NODE_W));
    return (minX + maxX) / 2;
  };

  const collectBranchGroups = (groupId: NodeId, result: Set<NodeId>): void => {
    if (result.has(groupId)) {
      return;
    }

    result.add(groupId);
    for (const childGroup of childGroupsByParent.get(groupId) ?? []) {
      collectBranchGroups(childGroup, result);
    }
  };

  const shiftGroups = (groups: Iterable<NodeId>, delta: number): void => {
    for (const groupId of groups) {
      for (const member of groupNodes.get(groupId) ?? []) {
        member.position.x += delta;
      }
    }
  };

  const groupOrder = [...childGroupsByParent.keys()].sort(
    (left, right) => (generationMap.get(left) ?? 0) - (generationMap.get(right) ?? 0),
  );

  for (const groupId of groupOrder) {
    const childGroups = [...(childGroupsByParent.get(groupId) ?? [])];
    if (childGroups.length === 0) {
      continue;
    }

    const parentCenter = getGroupCenter(groupId);
    const childrenCenter = childGroups.reduce((sum, childGroup) => sum + getGroupCenter(childGroup), 0) / childGroups.length;
    const delta = Math.round(parentCenter - childrenCenter);

    if (delta === 0) {
      continue;
    }

    if (childGroups.length > 1) {
      const branchGroups = new Set<NodeId>();
      for (const childGroup of childGroups) {
        collectBranchGroups(childGroup, branchGroups);
      }
      shiftGroups(branchGroups, delta);
      continue;
    }

    shiftGroups([groupId], delta);
  }

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}

function spreadGenerationRows(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));
  const partnerGroupMap = buildPartnerGroupMap(nodes, edges);
  const rows = new Map<number, Map<NodeId, Node[]>>();

  for (const node of nodes) {
    const rowKey = Math.round(node.position.y);
    const groupKey = partnerGroupMap.get(node.id) ?? node.id;
    const rowGroups = rows.get(rowKey) ?? new Map<NodeId, Node[]>();
    const groupNodes = rowGroups.get(groupKey) ?? [];
    groupNodes.push(nodeMap.get(node.id) ?? node);
    rowGroups.set(groupKey, groupNodes);
    rows.set(rowKey, rowGroups);
  }

  for (const rowGroups of rows.values()) {
    const blocks = [...rowGroups.values()]
      .map((groupNodes) => {
        const minX = Math.min(...groupNodes.map((node) => node.position.x));
        const maxX = Math.max(...groupNodes.map((node) => node.position.x + NODE_W));
        return { groupNodes, minX, maxX };
      })
      .sort((left, right) => left.minX - right.minX);

    let nextMinX = Number.NEGATIVE_INFINITY;
    for (const block of blocks) {
      if (block.minX < nextMinX) {
        const delta = nextMinX - block.minX;
        for (const node of block.groupNodes) {
          node.position.x += delta;
        }
        block.minX += delta;
        block.maxX += delta;
      }

      nextMinX = block.maxX + ROW_GAP;
    }
  }

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  dir: 'TB' | 'LR' = 'TB',
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: dir,
    ranksep: dir === 'TB' ? TB_RANK_GAP : 88,
    nodesep: dir === 'TB' ? 84 : 52,
    edgesep: 24,
    marginx: 28,
    marginy: 28,
  });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => g.setNode(node.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((edge) => {
    const edgeConfig = dir === 'TB' && edge.type === 'partner' ? { weight: 3 } : {};
    g.setEdge(edge.source, edge.target, edgeConfig);
  });

  dagre.layout(g);

  const layouted = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    return { ...node, position: { x: x - NODE_W / 2, y: y - NODE_H / 2 } };
  });

  if (dir !== 'TB') {
    return layouted;
  }

  const banded = enforceGenerationBands(layouted, edges);
  const aligned = alignPartnersForTopBottom(banded, edges);
  const centered = centerParentGroupsOverChildren(aligned, edges);
  const spread = spreadGenerationRows(centered, edges);
  return spreadGenerationRows(centerParentGroupsOverChildren(spread, edges), edges);
}
