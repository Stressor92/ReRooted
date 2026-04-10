import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Node } from '@xyflow/react';

type ContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
} | null;

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>(null);

  const onNodeContextMenu = useCallback((event: ReactMouseEvent, node: Node) => {
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return {
    menu,
    onNodeContextMenu,
    closeMenu: () => setMenu(null),
  };
}

export type { ContextMenuState };
