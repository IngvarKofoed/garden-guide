import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CareTask, CareTaskCreateRequest } from '@garden-guide/shared';
import * as api from '../../lib/api';

export const tasksForPlantKey = (plantId: string) => ['plants', plantId, 'tasks'] as const;

export function useTasksForPlant(plantId: string | undefined) {
  return useQuery<CareTask[]>({
    queryKey: ['plants', plantId, 'tasks'] as const,
    queryFn: () => api.listTasksForPlant(plantId!),
    enabled: !!plantId,
  });
}

export function useCreateTaskForPlant(plantId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CareTaskCreateRequest) => api.createTask(plantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksForPlantKey(plantId) });
    },
  });
}
