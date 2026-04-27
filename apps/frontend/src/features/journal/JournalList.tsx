import type { ActionType, JournalEntryWithPhotos } from '@garden-guide/shared';
import { Button } from '../../components/ui';
import { journalPhotoUrl } from '../../lib/api';
import { useDeleteJournalEntry, useJournalForPlant } from './hooks';

const ACTION_LABELS: Record<ActionType, string> = {
  prune: 'Prune',
  fertilize: 'Fertilize',
  water: 'Water',
  plant: 'Plant',
  transplant: 'Transplant',
  harvest: 'Harvest',
  sow: 'Sow',
  mulch: 'Mulch',
  treat: 'Treat',
  inspect: 'Inspect',
  custom: 'Note',
};

interface JournalListProps {
  plantId: string;
  /** When true, hides the per-row delete button (e.g. archived plants). */
  readOnly?: boolean;
}

export function JournalList({ plantId, readOnly = false }: JournalListProps) {
  const journal = useJournalForPlant(plantId);

  if (journal.isLoading) {
    return <p className="text-sm text-muted">Loading journal…</p>;
  }
  if (journal.isError) {
    return <p className="text-sm text-red-700">Couldn't load journal.</p>;
  }
  const entries = journal.data ?? [];
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        No entries yet. Record what you did or observed and it'll appear here
        and on the calendar.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <JournalRow key={entry.id} entry={entry} readOnly={readOnly} />
      ))}
    </ul>
  );
}

function JournalRow({
  entry,
  readOnly,
}: {
  entry: JournalEntryWithPhotos;
  readOnly: boolean;
}) {
  const remove = useDeleteJournalEntry();
  const label =
    entry.actionType === 'custom'
      ? entry.customLabel ?? ACTION_LABELS.custom
      : ACTION_LABELS[entry.actionType];

  return (
    <li className="rounded-2xl border border-hairline bg-ivory/60 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span className="text-xs text-muted">{formatLong(entry.occurredOn)}</span>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm('Delete this journal entry?')) {
                remove.mutate(entry.id);
              }
            }}
          >
            Delete
          </Button>
        )}
      </div>
      {entry.notes && (
        <p className="mt-2 whitespace-pre-line text-sm text-ink/85">
          {entry.notes}
        </p>
      )}
      {entry.photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {entry.photos.map((photo) => (
            <a
              key={photo.id}
              href={journalPhotoUrl(entry.id, photo.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
            >
              <img
                src={journalPhotoUrl(entry.id, photo.id)}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover transition-transform duration-200 ease-leaf hover:scale-[1.02]"
              />
            </a>
          ))}
        </div>
      )}
    </li>
  );
}

function formatLong(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  return new Date(y!, m! - 1, d!).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
