import { useQuery } from '@tanstack/react-query';
import { getPerson, type PersonDetail } from '../api/persons';

export function usePerson(id: string | null) {
  return useQuery<PersonDetail | null>({
    queryKey: ['person', id],
    queryFn: () => (id ? getPerson(id) : null),
    enabled: !!id,
    staleTime: 30_000,
  });
}
