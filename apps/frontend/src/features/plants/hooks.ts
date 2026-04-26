import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Plant, PlantCreateRequest, PlantUpdateRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const PLANTS_QUERY_KEY = ['plants'] as const;

export function usePlants(opts: api.PlantListOptions = {}) {
  return useQuery<Plant[]>({
    queryKey: [...PLANTS_QUERY_KEY, opts],
    queryFn: () => api.listPlants(opts),
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantCreateRequest) => api.createPlant(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANTS_QUERY_KEY }),
  });
}

export function useUpdatePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlantUpdateRequest }) =>
      api.updatePlant(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANTS_QUERY_KEY }),
  });
}

export function useArchivePlant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archivePlant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PLANTS_QUERY_KEY }),
  });
}
