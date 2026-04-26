import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Zone, ZoneCreateRequest, ZoneUpdateRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const ZONES_QUERY_KEY = ['zones'] as const;

export function useZones() {
  return useQuery<Zone[]>({
    queryKey: ZONES_QUERY_KEY,
    queryFn: api.listZones,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ZoneCreateRequest) => api.createZone(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ZONES_QUERY_KEY }),
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ZoneUpdateRequest }) =>
      api.updateZone(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ZONES_QUERY_KEY }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteZone(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ZONES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['plants'] });
    },
  });
}
