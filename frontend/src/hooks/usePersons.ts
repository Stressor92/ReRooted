import { apiRequest } from "../api/client";

export function usePersons() {
  return {
    queryKey: ["persons"] as const,
    queryFn: () => apiRequest<Array<Record<string, unknown>>>("/persons"),
  };
}
