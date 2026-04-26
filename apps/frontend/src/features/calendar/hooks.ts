import { useQuery } from '@tanstack/react-query';
import type { CalendarOccurrence } from '@garden-guide/shared';
import * as api from '../../lib/api';

export function useCalendar(from: string, to: string) {
  return useQuery<CalendarOccurrence[]>({
    queryKey: ['calendar', from, to] as const,
    queryFn: () => api.listCalendar(from, to),
    staleTime: 60_000,
  });
}
