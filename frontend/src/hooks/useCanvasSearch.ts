import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import type { PersonNodeData } from '../api/tree';

function getSearchText(node: Node<PersonNodeData, 'person'>): string {
  return [
    node.data.first_name,
    node.data.last_name,
    node.data.birth_year,
    node.data.death_year,
    node.data.description_excerpt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function useCanvasSearch(nodes: Node<PersonNodeData, 'person'>[]) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { setCenter } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const matchedNodes = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [] as Node<PersonNodeData, 'person'>[];
    }

    return [...nodes]
      .filter((node) => getSearchText(node).includes(normalizedQuery))
      .sort((left, right) => {
        const leftName = `${left.data.first_name} ${left.data.last_name}`.toLowerCase();
        const rightName = `${right.data.first_name} ${right.data.last_name}`.toLowerCase();
        const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1;
        const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1;
        return leftStarts - rightStarts || leftName.localeCompare(rightName);
      });
  }, [debouncedQuery, nodes]);

  const matchedIds = useMemo(
    () => (matchedNodes.length ? new Set(matchedNodes.map((node) => node.id)) : null),
    [matchedNodes],
  );

  const focusNodeAtIndex = useCallback(
    (index: number) => {
      const node = matchedNodes[index];
      if (!node) {
        return;
      }

      void setCenter(node.position.x + 80, node.position.y + 100, {
        zoom: 1,
        duration: 500,
      });
    },
    [matchedNodes, setCenter],
  );

  useEffect(() => {
    setActiveIndex(0);
    if (matchedNodes.length > 0) {
      focusNodeAtIndex(0);
    }
  }, [focusNodeAtIndex, matchedNodes]);

  const focusMatch = useCallback(() => {
    if (!matchedNodes.length) {
      return;
    }

    setActiveIndex((current) => {
      const next = current >= matchedNodes.length - 1 ? 0 : current + 1;
      focusNodeAtIndex(next);
      return next;
    });
  }, [focusNodeAtIndex, matchedNodes.length]);

  return {
    query,
    setQuery,
    matchedIds,
    activeMatchId: matchedNodes[activeIndex]?.id ?? null,
    focusMatch,
    resultCount: matchedNodes.length,
  };
}
