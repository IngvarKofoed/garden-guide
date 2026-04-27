import { Link, useParams } from 'react-router-dom';
import type { CareTask } from '@garden-guide/shared';
import { slotLabel, yearSlotLabel } from '@garden-guide/shared';
import { Button, Card, EmptyState, Tag } from '../components/ui';
import { plantIconUrl } from '../lib/api';
import { JournalEntryForm } from '../features/journal/JournalEntryForm';
import { JournalList } from '../features/journal/JournalList';
import { useArchivePlant, usePlant } from '../features/plants/hooks';
import { useTasksForPlant } from '../features/tasks/hooks';
import { useZones } from '../features/zones/hooks';

export function PlantPage() {
  const { id } = useParams<{ id: string }>();
  const plant = usePlant(id);
  const tasks = useTasksForPlant(id);
  const zones = useZones();
  const archive = useArchivePlant();

  if (plant.isLoading) {
    return <p className="text-sm text-muted">Loading plant…</p>;
  }
  if (plant.isError || !plant.data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-700">
          {plant.error instanceof Error ? plant.error.message : "Couldn't load plant."}
        </p>
        <Link to="/plants" className="text-sm text-leaf hover:underline">
          ← Back to plants
        </Link>
      </div>
    );
  }

  const p = plant.data;
  const zoneName = zones.data?.find((z) => z.id === p.zoneId)?.name ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/plants" className="text-sm text-muted hover:text-ink">
          ← Plants
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          {p.iconPhotoId && (
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream md:h-24 md:w-24">
              <img
                src={plantIconUrl(p.id, p.iconPhotoId)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                {p.name}
              </h1>
              {p.archivedAt && <Tag tone="ivory">Archived</Tag>}
            </div>
            {p.species && (
              <p className="mt-1 text-base italic text-muted">{p.species}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {zoneName && <Tag tone="mint">{zoneName}</Tag>}
            </div>
          </div>
        </div>
        {!p.archivedAt && (
          <div className="flex items-center gap-2">
            <Link
              to={`/plants/${p.id}/edit`}
              className="inline-flex h-9 items-center rounded-full bg-ivory px-4 text-sm font-medium text-ink transition-colors hover:bg-hairline/60"
            >
              Edit plant
            </Link>
            <Button
              variant="ghost"
              size="sm"
              disabled={archive.isPending}
              onClick={() => {
                if (
                  confirm(`Archive "${p.name}"? Its journal history is preserved.`)
                ) {
                  archive.mutate(p.id);
                }
              }}
            >
              Archive
            </Button>
          </div>
        )}
      </header>

      {p.description && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            About
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{p.description}</p>
        </Card>
      )}

      {p.notes && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Notes
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-ink">{p.notes}</p>
        </Card>
      )}

      <Card className="p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Care tasks</h2>
          <span className="text-xs text-muted">
            {tasks.data ? `${tasks.data.length} task${tasks.data.length === 1 ? '' : 's'}` : ''}
          </span>
        </header>
        {tasks.isLoading && <p className="mt-3 text-sm text-muted">Loading tasks…</p>}
        {tasks.isError && (
          <p className="mt-3 text-sm text-red-700">Couldn't load tasks.</p>
        )}
        {tasks.data && tasks.data.length === 0 && (
          <p className="mt-3 text-sm text-muted">
            No tasks yet.{' '}
            {!p.archivedAt && (
              <Link
                to={`/plants/${p.id}/edit`}
                className="text-leaf hover:underline"
              >
                Add one or generate a care plan.
              </Link>
            )}
          </p>
        )}
        {tasks.data && tasks.data.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {tasks.data.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Journal</h2>
          <span className="text-xs text-muted">
            What's been done and observed
          </span>
        </header>
        {!p.archivedAt && (
          <div className="mt-4 rounded-2xl bg-cream/70 p-5">
            <JournalEntryForm plantId={p.id} />
          </div>
        )}
        <div className="mt-5">
          <JournalList plantId={p.id} readOnly={!!p.archivedAt} />
        </div>
      </Card>

      {p.archivedAt && (
        <EmptyState
          title="Plant is archived"
          description="Unarchive to edit details, manage tasks, or write journal entries."
        />
      )}
    </div>
  );
}

function TaskRow({ task }: { task: CareTask }) {
  const label = task.customLabel ?? task.actionType;
  const window =
    task.kind === 'recurring'
      ? task.recurStartSlot === task.recurEndSlot
        ? slotLabel(task.recurStartSlot)
        : `${slotLabel(task.recurStartSlot)} → ${slotLabel(task.recurEndSlot)}`
      : yearSlotLabel(task.dueSlot);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hairline bg-ivory/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium capitalize text-ink">{label}</span>
        <Tag tone={task.kind === 'recurring' ? 'mint' : 'leaf'}>
          {task.kind === 'recurring' ? 'Recurring' : 'One-off'}
        </Tag>
        <span className="text-xs text-muted">{window}</span>
      </div>
      {task.source === 'ai' && <Tag tone="ivory">AI</Tag>}
    </li>
  );
}
