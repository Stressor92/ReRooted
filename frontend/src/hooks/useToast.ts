import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => void;
  removeToast: (id: string) => void;
}

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000);
    const id = createToastId();

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));

    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
