import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  JournalEntryCreateRequest,
  JournalEntryWithPhotos,
} from '@garden-guide/shared';
import * as api from '../../lib/api';

const journalRootKey = ['journal'] as const;

const journalListKey = (opts: api.JournalListOptions) =>
  ['journal', 'list', opts] as const;

export function useJournalForPlant(plantId: string | undefined) {
  return useQuery<JournalEntryWithPhotos[]>({
    queryKey: journalListKey({ plantId }),
    queryFn: () => api.listJournal({ plantId }),
    enabled: !!plantId,
  });
}

function invalidateJournalAndCalendar(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: journalRootKey });
  qc.invalidateQueries({ queryKey: ['calendar'] });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: JournalEntryCreateRequest) => api.createJournal(body),
    onSuccess: () => invalidateJournalAndCalendar(qc),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteJournal(id),
    onSuccess: () => invalidateJournalAndCalendar(qc),
  });
}

export function useUploadJournalPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ journalId, file }: { journalId: string; file: Blob }) =>
      api.uploadJournalPhoto(journalId, file),
    onSuccess: () => invalidateJournalAndCalendar(qc),
  });
}
