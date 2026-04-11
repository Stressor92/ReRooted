import { apiRequest } from '../api/client';
import type { PersonSummary } from '../api/persons';

export function usePersons() {
  return {
    queryKey: ['persons'] as const,
    queryFn: () => apiRequest<PersonSummary[]>('/persons'),
  };
}
