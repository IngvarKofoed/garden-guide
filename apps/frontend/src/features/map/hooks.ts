import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GardenMap, GardenMapPutRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const MAP_QUERY_KEY = ['map'] as const;

export function useMap() {
  return useQuery<GardenMap>({
    queryKey: MAP_QUERY_KEY,
    queryFn: api.getMap,
    // The map is large and managed locally during edits — refetches would
    // overwrite in-flight strokes. The editor manages cache writes directly.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useSaveMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GardenMapPutRequest) => api.putMap(body),
    onSuccess: (data) => qc.setQueryData(MAP_QUERY_KEY, data),
  });
}
