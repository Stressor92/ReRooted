import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      const keyName = event.key.toLowerCase();
      const includeShift = event.shiftKey && !['?', '+'].includes(keyName);
      const key = [event.ctrlKey || event.metaKey ? 'ctrl' : '', includeShift ? 'shift' : '', keyName]
        .filter(Boolean)
        .join('+');

      const handler = handlers[key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers]);
}
