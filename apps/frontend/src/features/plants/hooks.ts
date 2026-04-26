import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Plant, PlantCreateRequest, PlantUpdateRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const PLANTS_QUERY_KEY = ['plants'] as const;

// Update both the detail cache (consumed by IconPanel/PlantPage via usePlant)
// and the list cache (consumed by PlantsPage cards) so the UI re-renders
// instantly without waiting for a background refetch.
function applyPlantToCaches(qc: QueryClient, plant: Plant): void {
  qc.setQueryData<Plant>([...PLANTS_QUERY_KEY, 'detail', plant.id], plant);
  qc.invalidateQueries({ queryKey: PLANTS_QUERY_KEY });
}

export function usePlants(opts: api.PlantListOptions = {}) {
  return useQuery<Plant[]>({
    queryKey: [...PLANTS_QUERY_KEY, opts],
    queryFn: () => api.listPlants(opts),
  });
}

export function usePlant(id: string | undefined) {
  return useQuery<Plant>({
    queryKey: [...PLANTS_QUERY_KEY, 'detail', id],
    queryFn: () => api.getPlant(id!),
    enabled: !!id,
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

export function useUploadPlantIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: Blob }) =>
      api.uploadPlantIcon(id, file),
    onSuccess: (plant) => applyPlantToCaches(qc, plant),
  });
}

export function useDeletePlantIcon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlantIcon(id),
    onSuccess: (plant) => applyPlantToCaches(qc, plant),
  });
}

export function useGeneratePlantIconDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.generatePlantIconDraft(id),
    onSuccess: (plant) => applyPlantToCaches(qc, plant),
  });
}

export function useAcceptPlantIconDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.acceptPlantIconDraft(id),
    onSuccess: (plant) => applyPlantToCaches(qc, plant),
  });
}

export function useDeletePlantIconDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlantIconDraft(id),
    onSuccess: (plant) => applyPlantToCaches(qc, plant),
  });
}
