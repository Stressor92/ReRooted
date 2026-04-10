import { useQuery } from '@tanstack/react-query';
import { getTree } from '../api/tree';

export function useTree() {
  return useQuery({
    queryKey: ['tree'],
    queryFn: getTree,
    staleTime: 10_000,
  });
}
