import { apiRequest } from "../api/client";

export function useTree() {
  return {
    queryKey: ["tree"] as const,
    queryFn: () => apiRequest<{ nodes: unknown[]; edges: unknown[] }>("/tree"),
  };
}
