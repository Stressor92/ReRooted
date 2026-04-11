import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

export const NODE_W = 160;
export const NODE_H = 200;
const PARTNER_GAP = 48;
const SIBLING_GAP = 56;
const GENERATION_GAP = 120;
const MIN_NODE_GAP = 36;

type NodeId = string;
type GroupId = string;

type GroupRelations = {
  childrenByGroup: Map<GroupId, Set<GroupId>>;
  parentsByGroup: Map<GroupId, Set<GroupId>>;
};

function sortIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function computeGenerations(nodes: Node[], edges: Edge[]): Map<NodeId, number> {
  const nodeIds = nodes.map((node) => node.id);
  const parentsOf = new Map<NodeId, NodeId[]>(nodeIds.map((id) => [id, []]));
  const childrenOf = new Map<NodeId, NodeId[]>(nodeIds.map((id) => [id, []]));
  const childEdges = edges.filter((edge) => edge.type === 'child');

  for (const edge of childEdges) {
    if (!parentsOf.has(edge.source) || !parentsOf.has(edge.target)) {
      continue;
    }

    const childParents = parentsOf.get(edge.target)!;
    if (!childParents.includes(edge.source)) {
      childParents.push(edge.source);
    }

    const parentChildren = childrenOf.get(edge.source)!;
    if (!parentChildren.includes(edge.target)) {
      parentChildren.push(edge.target);
    }
  }

  const generations = new Map<NodeId, number>(nodeIds.map((id) => [id, 0]));
  const indegree = new Map<NodeId, number>(nodeIds.map((id) => [id, parentsOf.get(id)?.length ?? 0]));
  const queue = nodeIds.filter((id) => (indegree.get(id) ?? 0) === 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentGeneration = generations.get(current) ?? 0;

    for (const childId of childrenOf.get(current) ?? []) {
      generations.set(childId, Math.max(generations.get(childId) ?? 0, currentGeneration + 1));
      indegree.set(childId, (indegree.get(childId) ?? 1) - 1);
      if ((indegree.get(childId) ?? 0) === 0) {
        queue.push(childId);
      }
    }
  }

  const partnerEdges = edges.filter((edge) => edge.type === 'partner');
  const maxIterations = Math.max(1, nodeIds.length * (childEdges.length + partnerEdges.length + 1));

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (const edge of partnerEdges) {
      const sourceGeneration = generations.get(edge.source) ?? 0;
      const targetGeneration = generations.get(edge.target) ?? 0;
      const nextGeneration = Math.max(sourceGeneration, targetGeneration);

      if (sourceGeneration !== nextGeneration) {
        generations.set(edge.source, nextGeneration);
        changed = true;
      }

      if (targetGeneration !== nextGeneration) {
        generations.set(edge.target, nextGeneration);
        changed = true;
      }
    }

    for (const parentIds of parentsOf.values()) {
      if (parentIds.length < 2) {
        continue;
      }

      const nextGeneration = Math.max(...parentIds.map((parentId) => generations.get(parentId) ?? 0));
      for (const parentId of parentIds) {
        if ((generations.get(parentId) ?? 0) !== nextGeneration) {
          generations.set(parentId, nextGeneration);
          changed = true;
        }
      }
    }

    for (const edge of childEdges) {
      const parentGeneration = generations.get(edge.source) ?? 0;
      const childGeneration = generations.get(edge.target) ?? 0;
      const requiredGeneration = parentGeneration + 1;

      if (childGeneration < requiredGeneration) {
        generations.set(edge.target, requiredGeneration);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  const minGeneration = Math.min(...generations.values());
  if (Number.isFinite(minGeneration) && minGeneration !== 0) {
    for (const nodeId of nodeIds) {
      generations.set(nodeId, (generations.get(nodeId) ?? 0) - minGeneration);
    }
  }

  return generations;
}

export function getGenerationMap(nodes: Node[], edges: Edge[]): Map<NodeId, number> {
  return computeGenerations(nodes, edges);
}

function buildPartnerGroups(nodes: Node[], edges: Edge[]): Map<NodeId, GroupId> {
  const parent = new Map<NodeId, GroupId>(nodes.map((node) => [node.id, node.id]));

  const find = (id: NodeId): GroupId => {
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
    if (leftRoot === rightRoot) {
      return;
    }

    if (leftRoot.localeCompare(rightRoot) <= 0) {
      parent.set(rightRoot, leftRoot);
    } else {
      parent.set(leftRoot, rightRoot);
    }
  };

  for (const edge of edges) {
    if (edge.type === 'partner' && parent.has(edge.source) && parent.has(edge.target)) {
      union(edge.source, edge.target);
    }
  }

  return new Map(nodes.map((node) => [node.id, find(node.id)]));
}

function getGroupLeader(groupId: GroupId, groups: Map<NodeId, GroupId>): string {
  const members = [...groups.entries()]
    .filter(([, currentGroupId]) => currentGroupId === groupId)
    .map(([nodeId]) => nodeId)
    .sort((left, right) => left.localeCompare(right));

  return members[0] ?? groupId;
}

function buildGroupMembers(nodes: Node[], partnerGroups: Map<NodeId, GroupId>): Map<GroupId, NodeId[]> {
  const groupMembers = new Map<GroupId, NodeId[]>();

  for (const node of nodes) {
    const groupId = partnerGroups.get(node.id) ?? node.id;
    const members = groupMembers.get(groupId) ?? [];
    members.push(node.id);
    groupMembers.set(groupId, members);
  }

  for (const [groupId, members] of groupMembers.entries()) {
    groupMembers.set(groupId, sortIds(members));
  }

  return groupMembers;
}

function buildGroupRelations(edges: Edge[], partnerGroups: Map<NodeId, GroupId>): GroupRelations {
  const childrenByGroup = new Map<GroupId, Set<GroupId>>();
  const parentsByGroup = new Map<GroupId, Set<GroupId>>();

  for (const edge of edges) {
    if (edge.type !== 'child') {
      continue;
    }

    const parentGroup = partnerGroups.get(edge.source) ?? edge.source;
    const childGroup = partnerGroups.get(edge.target) ?? edge.target;

    if (parentGroup === childGroup) {
      continue;
    }

    const childGroups = childrenByGroup.get(parentGroup) ?? new Set<GroupId>();
    childGroups.add(childGroup);
    childrenByGroup.set(parentGroup, childGroups);

    const parentGroups = parentsByGroup.get(childGroup) ?? new Set<GroupId>();
    parentGroups.add(parentGroup);
    parentsByGroup.set(childGroup, parentGroups);
  }

  return { childrenByGroup, parentsByGroup };
}

function getOwnWidth(groupId: GroupId, groupMembers: Map<GroupId, NodeId[]>): number {
  const memberCount = groupMembers.get(groupId)?.length ?? 1;
  return memberCount * NODE_W + Math.max(0, memberCount - 1) * PARTNER_GAP;
}

function orderGroupMembers(groupId: GroupId, groupMembers: Map<GroupId, NodeId[]>, edges: Edge[]): NodeId[] {
  const members = sortIds(groupMembers.get(groupId) ?? []);
  if (members.length <= 2) {
    return members;
  }

  const memberSet = new Set(members);
  const partnerDegree = new Map<NodeId, number>(members.map((memberId) => [memberId, 0]));
  const familyDegree = new Map<NodeId, number>(members.map((memberId) => [memberId, 0]));
  const adjacency = new Map<NodeId, NodeId[]>(members.map((memberId) => [memberId, []]));

  for (const edge of edges) {
    if (edge.type === 'partner' && memberSet.has(edge.source) && memberSet.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      adjacency.get(edge.target)?.push(edge.source);
      partnerDegree.set(edge.source, (partnerDegree.get(edge.source) ?? 0) + 1);
      partnerDegree.set(edge.target, (partnerDegree.get(edge.target) ?? 0) + 1);
    }

    if (edge.type === 'child') {
      if (memberSet.has(edge.source)) {
        familyDegree.set(edge.source, (familyDegree.get(edge.source) ?? 0) + 1);
      }
      if (memberSet.has(edge.target)) {
        familyDegree.set(edge.target, (familyDegree.get(edge.target) ?? 0) + 1);
      }
    }
  }

  const anchor = [...members].sort((left, right) => {
    const partnerDelta = (partnerDegree.get(right) ?? 0) - (partnerDegree.get(left) ?? 0);
    if (partnerDelta !== 0) {
      return partnerDelta;
    }

    const familyDelta = (familyDegree.get(right) ?? 0) - (familyDegree.get(left) ?? 0);
    if (familyDelta !== 0) {
      return familyDelta;
    }

    return left.localeCompare(right);
  })[0];

  const distance = new Map<NodeId, number>([[anchor, 0]]);
  const queue: NodeId[] = [anchor];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of sortIds(adjacency.get(current) ?? [])) {
      if (distance.has(next)) {
        continue;
      }
      distance.set(next, (distance.get(current) ?? 0) + 1);
      queue.push(next);
    }
  }

  const others = members
    .filter((memberId) => memberId !== anchor)
    .sort((left, right) => {
      const distanceDelta = (distance.get(left) ?? Number.MAX_SAFE_INTEGER) - (distance.get(right) ?? Number.MAX_SAFE_INTEGER);
      if (distanceDelta !== 0) {
        return distanceDelta;
      }

      const partnerDelta = (partnerDegree.get(right) ?? 0) - (partnerDegree.get(left) ?? 0);
      if (partnerDelta !== 0) {
        return partnerDelta;
      }

      const familyDelta = (familyDegree.get(right) ?? 0) - (familyDegree.get(left) ?? 0);
      if (familyDelta !== 0) {
        return familyDelta;
      }

      return left.localeCompare(right);
    });

  const leftSide: NodeId[] = [];
  const rightSide: NodeId[] = [];

  others.forEach((memberId, index) => {
    if (index % 2 === 0) {
      leftSide.unshift(memberId);
    } else {
      rightSide.push(memberId);
    }
  });

  return [...leftSide, anchor, ...rightSide];
}

function isIsolatedNode(nodeId: NodeId, edges: Edge[]): boolean {
  return !edges.some((edge) => edge.source === nodeId || edge.target === nodeId);
}

function isIsolatedGroup(groupId: GroupId, groupMembers: Map<GroupId, NodeId[]>, relations: GroupRelations, edges: Edge[]): boolean {
  const members = groupMembers.get(groupId) ?? [];
  return members.every((memberId) => isIsolatedNode(memberId, edges))
    && !(relations.childrenByGroup.get(groupId)?.size)
    && !(relations.parentsByGroup.get(groupId)?.size);
}

function assignXPositions(
  nodes: Node[],
  edges: Edge[],
  generations: Map<NodeId, number>,
  partnerGroups: Map<NodeId, GroupId>,
): Map<NodeId, number> {
  const groupMembers = buildGroupMembers(nodes, partnerGroups);
  const relations = buildGroupRelations(edges, partnerGroups);
  const groupIds = sortIds(groupMembers.keys());
  const groupGenerations = new Map<GroupId, number>();

  for (const groupId of groupIds) {
    const generation = Math.max(...(groupMembers.get(groupId) ?? []).map((memberId) => generations.get(memberId) ?? 0), 0);
    groupGenerations.set(groupId, generation);
  }

  const primaryParentByGroup = new Map<GroupId, GroupId | null>();
  for (const groupId of groupIds) {
    const parents = sortIds(relations.parentsByGroup.get(groupId) ?? []);
    if (parents.length === 0) {
      primaryParentByGroup.set(groupId, null);
      continue;
    }

    parents.sort((left, right) => {
      const generationDelta = (groupGenerations.get(left) ?? 0) - (groupGenerations.get(right) ?? 0);
      if (generationDelta !== 0) {
        return generationDelta;
      }
      return getGroupLeader(left, partnerGroups).localeCompare(getGroupLeader(right, partnerGroups));
    });

    primaryParentByGroup.set(groupId, parents[0]);
  }

  const primaryChildrenByGroup = new Map<GroupId, GroupId[]>(groupIds.map((groupId) => [groupId, []]));
  for (const groupId of groupIds) {
    const parentGroup = primaryParentByGroup.get(groupId);
    if (!parentGroup) {
      continue;
    }

    const childGroups = primaryChildrenByGroup.get(parentGroup) ?? [];
    childGroups.push(groupId);
    primaryChildrenByGroup.set(parentGroup, childGroups);
  }

  for (const [groupId, childGroups] of primaryChildrenByGroup.entries()) {
    childGroups.sort((left, right) => {
      const generationDelta = (groupGenerations.get(left) ?? 0) - (groupGenerations.get(right) ?? 0);
      if (generationDelta !== 0) {
        return generationDelta;
      }
      return getGroupLeader(left, partnerGroups).localeCompare(getGroupLeader(right, partnerGroups));
    });
    primaryChildrenByGroup.set(groupId, childGroups);
  }

  const widthCache = new Map<GroupId, number>();
  const computeWidth = (groupId: GroupId): number => {
    const cached = widthCache.get(groupId);
    if (cached !== undefined) {
      return cached;
    }

    const ownWidth = getOwnWidth(groupId, groupMembers);
    const childGroups = primaryChildrenByGroup.get(groupId) ?? [];
    const childWidth = childGroups.length === 0
      ? 0
      : childGroups.reduce((sum, childGroup) => sum + computeWidth(childGroup), 0) + SIBLING_GAP * (childGroups.length - 1);

    const width = Math.max(ownWidth, childWidth);
    widthCache.set(groupId, width);
    return width;
  };

  const groupCenters = new Map<GroupId, number>();

  const assignGroup = (groupId: GroupId, centerX: number): void => {
    if (groupCenters.has(groupId)) {
      groupCenters.set(groupId, Math.round((groupCenters.get(groupId)! + centerX) / 2));
    } else {
      groupCenters.set(groupId, Math.round(centerX));
    }

    const childGroups = primaryChildrenByGroup.get(groupId) ?? [];
    if (childGroups.length === 0) {
      return;
    }

    const totalChildWidth = childGroups.reduce((sum, childGroup) => sum + computeWidth(childGroup), 0)
      + SIBLING_GAP * Math.max(0, childGroups.length - 1);
    let nextLeft = centerX - totalChildWidth / 2;

    for (const childGroup of childGroups) {
      const childWidth = computeWidth(childGroup);
      assignGroup(childGroup, nextLeft + childWidth / 2);
      nextLeft += childWidth + SIBLING_GAP;
    }
  };

  const rootGroups = groupIds
    .filter((groupId) => !primaryParentByGroup.get(groupId) && !isIsolatedGroup(groupId, groupMembers, relations, edges))
    .sort((left, right) => {
      const generationDelta = (groupGenerations.get(left) ?? 0) - (groupGenerations.get(right) ?? 0);
      if (generationDelta !== 0) {
        return generationDelta;
      }
      return getGroupLeader(left, partnerGroups).localeCompare(getGroupLeader(right, partnerGroups));
    });

  const effectiveRoots = rootGroups.length > 0
    ? rootGroups
    : groupIds.filter((groupId) => !isIsolatedGroup(groupId, groupMembers, relations, edges));

  let cursorX = 0;
  for (const groupId of effectiveRoots) {
    const width = computeWidth(groupId);
    assignGroup(groupId, cursorX + width / 2);
    cursorX += width + SIBLING_GAP * 2;
  }

  const unassignedGroups = groupIds.filter((groupId) => !groupCenters.has(groupId) && !isIsolatedGroup(groupId, groupMembers, relations, edges));
  for (const groupId of unassignedGroups) {
    const parentCenters = sortIds(relations.parentsByGroup.get(groupId) ?? [])
      .map((parentGroup) => groupCenters.get(parentGroup))
      .filter((center): center is number => typeof center === 'number');

    if (parentCenters.length > 0) {
      assignGroup(groupId, parentCenters.reduce((sum, center) => sum + center, 0) / parentCenters.length);
      continue;
    }

    const width = computeWidth(groupId);
    assignGroup(groupId, cursorX + width / 2);
    cursorX += width + SIBLING_GAP * 2;
  }

  const sortedByGeneration = [...groupIds].sort(
    (left, right) => (groupGenerations.get(left) ?? 0) - (groupGenerations.get(right) ?? 0),
  );

  for (const groupId of sortedByGeneration) {
    const parentGroups = sortIds(relations.parentsByGroup.get(groupId) ?? []);
    if (parentGroups.length === 0) {
      continue;
    }

    const parentCenters = parentGroups
      .map((parentGroup) => groupCenters.get(parentGroup))
      .filter((center): center is number => typeof center === 'number');

    if (parentCenters.length > 0) {
      groupCenters.set(groupId, Math.round(parentCenters.reduce((sum, center) => sum + center, 0) / parentCenters.length));
    }
  }

  const xPositions = new Map<NodeId, number>();
  for (const groupId of groupIds) {
    const members = orderGroupMembers(groupId, groupMembers, edges);
    const centerX = groupCenters.get(groupId) ?? 0;
    const totalWidth = getOwnWidth(groupId, groupMembers);
    const startX = centerX - totalWidth / 2;

    members.forEach((memberId, index) => {
      xPositions.set(memberId, Math.round(startX + index * (NODE_W + PARTNER_GAP)));
    });
  }

  return xPositions;
}

function centerFamiliesOverChildren(
  nodes: Node[],
  edges: Edge[],
  partnerGroups: Map<NodeId, GroupId>,
  generations: Map<NodeId, number>,
): Node[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));
  const groupMembers = buildGroupMembers(nodes, partnerGroups);
  const relations = buildGroupRelations(edges, partnerGroups);
  const groupIds = sortIds(groupMembers.keys());
  const groupGeneration = new Map<GroupId, number>(
    groupIds.map((groupId) => [
      groupId,
      Math.max(...(groupMembers.get(groupId) ?? []).map((memberId) => generations.get(memberId) ?? 0), 0),
    ]),
  );

  const getGroupCenter = (groupId: GroupId): number => {
    const members = groupMembers.get(groupId) ?? [];
    const positions = members.map((memberId) => nodeMap.get(memberId)?.position.x ?? 0);
    const minX = Math.min(...positions);
    const maxX = Math.max(...members.map((memberId) => (nodeMap.get(memberId)?.position.x ?? 0) + NODE_W));
    return (minX + maxX) / 2;
  };

  const collectDescendants = (groupId: GroupId, result: Set<GroupId>): void => {
    if (result.has(groupId)) {
      return;
    }

    result.add(groupId);
    for (const childGroup of relations.childrenByGroup.get(groupId) ?? []) {
      collectDescendants(childGroup, result);
    }
  };

  const shiftGroups = (groupIdsToShift: Iterable<GroupId>, delta: number): void => {
    for (const groupId of groupIdsToShift) {
      for (const memberId of groupMembers.get(groupId) ?? []) {
        const node = nodeMap.get(memberId);
        if (node) {
          node.position.x += delta;
        }
      }
    }
  };

  const orderedGroups = [...groupIds].sort(
    (left, right) => (groupGeneration.get(left) ?? 0) - (groupGeneration.get(right) ?? 0),
  );

  for (const groupId of orderedGroups) {
    const childGroups = sortIds(relations.childrenByGroup.get(groupId) ?? []);
    if (childGroups.length === 0) {
      continue;
    }

    const parentCenter = getGroupCenter(groupId);
    const childrenCenter = childGroups.reduce((sum, childGroup) => sum + getGroupCenter(childGroup), 0) / childGroups.length;
    const delta = Math.round(parentCenter - childrenCenter);

    if (delta === 0) {
      continue;
    }

    const descendantGroups = new Set<GroupId>();
    for (const childGroup of childGroups) {
      collectDescendants(childGroup, descendantGroups);
    }
    shiftGroups(descendantGroups, delta);
  }

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}

function packGenerationRows(
  nodes: Node[],
  generations: Map<NodeId, number>,
  partnerGroups: Map<NodeId, GroupId>,
): Node[] {
  const result = nodes.map((node) => ({ ...node, position: { ...node.position } }));
  const nodeMap = new Map(result.map((node) => [node.id, node]));
  const groupMembers = buildGroupMembers(result, partnerGroups);
  const blocksByGeneration = new Map<number, Array<{ groupId: GroupId; minX: number; maxX: number }>>();

  for (const [groupId, memberIds] of groupMembers.entries()) {
    const generation = Math.max(...memberIds.map((memberId) => generations.get(memberId) ?? 0), 0);
    const minX = Math.min(...memberIds.map((memberId) => nodeMap.get(memberId)?.position.x ?? 0));
    const maxX = Math.max(...memberIds.map((memberId) => (nodeMap.get(memberId)?.position.x ?? 0) + NODE_W));
    const blocks = blocksByGeneration.get(generation) ?? [];
    blocks.push({ groupId, minX, maxX });
    blocksByGeneration.set(generation, blocks);
  }

  for (const blocks of blocksByGeneration.values()) {
    blocks.sort((left, right) => left.minX - right.minX);
    if (blocks.length === 0) {
      continue;
    }

    const originalCenter = (blocks[0].minX + blocks[blocks.length - 1].maxX) / 2;
    let nextAllowedX = blocks[0].minX;

    for (const block of blocks) {
      const delta = nextAllowedX - block.minX;
      if (delta !== 0) {
        for (const memberId of groupMembers.get(block.groupId) ?? []) {
          const node = nodeMap.get(memberId);
          if (node) {
            node.position.x += delta;
          }
        }
        block.minX += delta;
        block.maxX += delta;
      }

      nextAllowedX = block.maxX + MIN_NODE_GAP;
    }

    const packedCenter = (blocks[0].minX + blocks[blocks.length - 1].maxX) / 2;
    const recenterDelta = Math.round(originalCenter - packedCenter);
    if (recenterDelta !== 0) {
      for (const block of blocks) {
        for (const memberId of groupMembers.get(block.groupId) ?? []) {
          const node = nodeMap.get(memberId);
          if (node) {
            node.position.x += recenterDelta;
          }
        }
      }
    }
  }

  return [...nodeMap.values()];
}

function resolveOverlaps(
  nodes: Node[],
  edges: Edge[],
  generations: Map<NodeId, number>,
  partnerGroups: Map<NodeId, GroupId>,
): Node[] {
  let result = nodes.map((node) => ({ ...node, position: { ...node.position } }));

  for (let pass = 0; pass < 4; pass += 1) {
    result = packGenerationRows(result, generations, partnerGroups);
    result = centerFamiliesOverChildren(result, edges, partnerGroups, generations);
  }

  return packGenerationRows(result, generations, partnerGroups);
}

function placeIsolatedNodes(nodes: Node[], edges: Edge[]): Node[] {
  const relatedNodeIds = new Set<NodeId>();
  for (const edge of edges) {
    relatedNodeIds.add(edge.source);
    relatedNodeIds.add(edge.target);
  }

  const isolatedNodes = nodes.filter((node) => !relatedNodeIds.has(node.id));
  if (isolatedNodes.length === 0) {
    return nodes;
  }

  const minMainX = Math.min(...nodes.filter((node) => relatedNodeIds.has(node.id)).map((node) => node.position.x), 0);
  const startX = minMainX - NODE_W - 60;
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, position: { ...node.position } }]));

  isolatedNodes
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((node, index) => {
      const current = nodeMap.get(node.id);
      if (!current) {
        return;
      }

      current.position.x = startX - index * (NODE_W + MIN_NODE_GAP);
      current.position.y = 0;
    });

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}

function applyDagreLR(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 88,
    nodesep: 52,
    edgesep: 24,
    marginx: 28,
    marginy: 28,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target, edge.type === 'partner' ? { weight: 3 } : {}));

  dagre.layout(graph);

  return nodes.map((node) => {
    const layoutNode = graph.node(node.id) ?? { x: 0, y: 0 };
    return {
      ...node,
      position: {
        x: layoutNode.x - NODE_W / 2,
        y: layoutNode.y - NODE_H / 2,
      },
    };
  });
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  dir: 'TB' | 'LR' = 'TB',
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  if (dir === 'LR') {
    return applyDagreLR(nodes, edges);
  }

  const generations = computeGenerations(nodes, edges);
  const partnerGroups = buildPartnerGroups(nodes, edges);
  const xPositions = assignXPositions(nodes, edges, generations, partnerGroups);

  let result = nodes.map((node) => ({
    ...node,
    position: {
      x: Math.round(xPositions.get(node.id) ?? 0),
      y: Math.round((generations.get(node.id) ?? 0) * (NODE_H + GENERATION_GAP)),
    },
  }));

  result = centerFamiliesOverChildren(result, edges, partnerGroups, generations);
  result = resolveOverlaps(result, edges, generations, partnerGroups);
  result = placeIsolatedNodes(result, edges);

  return result;
}
