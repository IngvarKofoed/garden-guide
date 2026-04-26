import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GardenContext, GardenContextUpdateRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const GARDEN_CONTEXT_QUERY_KEY = ['settings', 'garden-context'] as const;

export function useGardenContext() {
  return useQuery<GardenContext>({
    queryKey: GARDEN_CONTEXT_QUERY_KEY,
    queryFn: api.getGardenContext,
  });
}

export function useUpdateGardenContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GardenContextUpdateRequest) => api.updateGardenContext(body),
    onSuccess: (data) => {
      qc.setQueryData(GARDEN_CONTEXT_QUERY_KEY, data);
    },
  });
}
