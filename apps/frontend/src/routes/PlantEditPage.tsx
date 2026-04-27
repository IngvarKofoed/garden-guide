import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ActionTypeSchema,
  formatSlot,
  formatYearSlot,
  parseSlot,
  parseYearSlot,
  slotLabel,
  yearSlotLabel,
  type ActionType,
  type CareTask,
  type CareTaskCreateRequest,
  type CareTaskUpdateRequest,
  type MonthSlot,
  type YearSlot,
} from '@garden-guide/shared';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Tag,
  Textarea,
} from '../components/ui';
import { CarePlanReview } from '../features/ai/CarePlanReview';
import { usePlant } from '../features/plants/hooks';
import { PlantForm } from '../features/plants/PlantsPage';
import {
  useCreateTaskForPlant,
  useDeleteTask,
  useTasksForPlant,
  useUpdateTask,
} from '../features/tasks/hooks';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const POSITION_OPTIONS = [
  { value: '1', label: 'early' },
  { value: '2', label: 'mid' },
  { value: '3', label: 'late' },
];

const ACTION_OPTIONS = ActionTypeSchema.options.map((v) => ({
  value: v,
  label: v[0]!.toUpperCase() + v.slice(1),
}));

export function PlantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plant = usePlant(id);

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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          to={`/plants/${p.id}`}
          className="text-sm text-muted hover:text-ink"
        >
          ← Back to {p.name}
        </Link>
      </div>

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Edit {p.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Plant details, AI-assisted care plan, and individual tasks.
        </p>
      </header>

      <PlantForm
        plant={p}
        onClose={() => navigate(`/plants/${p.id}`)}
        onSaved={() => {
          /* stay on the page; cache refreshes via invalidation */
        }}
      />

      {!p.archivedAt && <CarePlanReview plantId={p.id} />}

      <TaskManagerSection plantId={p.id} archived={!!p.archivedAt} />

      {p.archivedAt && (
        <EmptyState
          title="Plant is archived"
          description="Unarchive on the plant page to add or edit tasks."
        />
      )}
    </div>
  );
}

function TaskManagerSection({
  plantId,
  archived,
}: {
  plantId: string;
  archived: boolean;
}) {
  const tasks = useTasksForPlant(plantId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card className="p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Tasks</h2>
        {!archived && !creating && (
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
            }}
          >
            Add task
          </Button>
        )}
      </header>
      {tasks.isLoading && <p className="mt-3 text-sm text-muted">Loading tasks…</p>}
      {tasks.isError && (
        <p className="mt-3 text-sm text-red-700">Couldn't load tasks.</p>
      )}
      {creating && (
        <div className="mt-4">
          <TaskForm
            plantId={plantId}
            initial={null}
            onClose={() => setCreating(false)}
          />
        </div>
      )}
      {tasks.data && tasks.data.length === 0 && !creating && (
        <p className="mt-4 text-sm text-muted">
          No tasks yet. Add one manually or use the AI care plan above.
        </p>
      )}
      {tasks.data && tasks.data.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {tasks.data.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <TaskForm
                  plantId={plantId}
                  initial={t}
                  onClose={() => setEditingId(null)}
                />
              </li>
            ) : (
              <TaskRow
                key={t.id}
                task={t}
                disabled={archived}
                onEdit={() => {
                  setEditingId(t.id);
                  setCreating(false);
                }}
                plantId={plantId}
              />
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function TaskRow({
  task,
  onEdit,
  disabled,
  plantId,
}: {
  task: CareTask;
  onEdit: () => void;
  disabled: boolean;
  plantId: string;
}) {
  const del = useDeleteTask(plantId);
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
        {task.source === 'ai' && <Tag tone="ivory">AI</Tag>}
      </div>
      {!disabled && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={del.isPending}
            onClick={() => {
              if (confirm(`Delete task "${label}"?`)) del.mutate(task.id);
            }}
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}

function TaskForm({
  plantId,
  initial,
  onClose,
}: {
  plantId: string;
  initial: CareTask | null;
  onClose: () => void;
}) {
  const create = useCreateTaskForPlant(plantId);
  const update = useUpdateTask(plantId);

  const [actionType, setActionType] = useState<ActionType>(
    initial?.actionType ?? 'water',
  );
  const [customLabel, setCustomLabel] = useState(initial?.customLabel ?? '');
  const editingKind = initial?.kind;
  const [kind, setKind] = useState<'recurring' | 'one_off'>(
    initial?.kind ?? 'recurring',
  );

  const currentYear = new Date().getFullYear();
  const [recurStart, setRecurStart] = useState<MonthSlot>(
    initial?.kind === 'recurring' ? initial.recurStartSlot : formatSlot(4, 1),
  );
  const [recurEnd, setRecurEnd] = useState<MonthSlot>(
    initial?.kind === 'recurring' ? initial.recurEndSlot : formatSlot(4, 3),
  );
  const [dueSlot, setDueSlot] = useState<YearSlot>(
    initial?.kind === 'one_off'
      ? initial.dueSlot
      : formatYearSlot(currentYear, 4, 1),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [notify, setNotify] = useState(initial?.notify ?? true);
  const [error, setError] = useState<string | null>(null);

  const activeKind = editingKind ?? kind;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedLabel = customLabel.trim();
    if (actionType === 'custom' && !trimmedLabel) {
      setError('Custom action requires a label.');
      return;
    }
    const labelValue = trimmedLabel || null;
    const trimmedNotes = notes.trim() || null;

    try {
      if (initial) {
        const body: CareTaskUpdateRequest = {
          actionType,
          customLabel: labelValue,
          notes: trimmedNotes,
          notify,
          ...(initial.kind === 'recurring'
            ? { recurStartSlot: recurStart, recurEndSlot: recurEnd }
            : { dueSlot }),
        };
        await update.mutateAsync({ id: initial.id, body });
      } else {
        const body: CareTaskCreateRequest =
          kind === 'recurring'
            ? {
                kind: 'recurring',
                actionType,
                customLabel: labelValue,
                recurStartSlot: recurStart,
                recurEndSlot: recurEnd,
                notes: trimmedNotes,
                notify,
              }
            : {
                kind: 'one_off',
                actionType,
                customLabel: labelValue,
                dueSlot,
                notes: trimmedNotes,
                notify,
              };
        await create.mutateAsync(body);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-4 rounded-2xl border border-hairline bg-ivory/60 p-5 sm:grid-cols-2"
      noValidate
    >
      <Field label="Action" htmlFor="actionType">
        <Select
          id="actionType"
          className="w-full"
          value={actionType}
          onChange={(v) => setActionType(v as ActionType)}
          options={ACTION_OPTIONS}
        />
      </Field>
      <Field
        label={actionType === 'custom' ? 'Label' : 'Custom label (optional)'}
        htmlFor="customLabel"
      >
        <Input
          id="customLabel"
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder={actionType === 'custom' ? 'e.g. Net for birds' : ''}
        />
      </Field>
      <Field label="Kind" htmlFor="kind">
        {editingKind ? (
          <p className="flex h-12 items-center rounded-2xl border border-hairline bg-cream px-4 text-sm text-ink">
            {editingKind === 'recurring' ? 'Recurring' : 'One-off'}
          </p>
        ) : (
          <Select
            id="kind"
            className="w-full"
            value={kind}
            onChange={(v) => setKind(v as 'recurring' | 'one_off')}
            options={[
              { value: 'recurring', label: 'Recurring (yearly)' },
              { value: 'one_off', label: 'One-off' },
            ]}
          />
        )}
      </Field>
      <div className="hidden sm:block" />
      {activeKind === 'recurring' ? (
        <>
          <Field label="From" htmlFor="recurStart">
            <MonthSlotPicker
              id="recurStart"
              value={recurStart}
              onChange={setRecurStart}
            />
          </Field>
          <Field label="To" htmlFor="recurEnd">
            <MonthSlotPicker
              id="recurEnd"
              value={recurEnd}
              onChange={setRecurEnd}
            />
          </Field>
        </>
      ) : (
        <Field label="Due" htmlFor="dueSlot">
          <YearSlotPicker id="dueSlot" value={dueSlot} onChange={setDueSlot} />
        </Field>
      )}
      <div className="sm:col-span-2">
        <Field label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about this task."
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="h-4 w-4 rounded border-hairline text-leaf focus:ring-leaf/40"
        />
        Send a reminder when this task is due
      </label>
      {error && (
        <p className="text-sm text-red-700 sm:col-span-2">{error}</p>
      )}
      <div className="flex items-center justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save task' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}

function MonthSlotPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: MonthSlot;
  onChange: (v: MonthSlot) => void;
}) {
  const { month, position } = parseSlot(value);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        id={id}
        className="w-full"
        value={String(month)}
        onChange={(v) => onChange(formatSlot(Number(v), position))}
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
      />
      <Select
        className="w-full"
        value={String(position)}
        onChange={(v) =>
          onChange(formatSlot(month, Number(v) as 1 | 2 | 3))
        }
        options={POSITION_OPTIONS}
      />
    </div>
  );
}

function YearSlotPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: YearSlot;
  onChange: (v: YearSlot) => void;
}) {
  const { year, month, position } = parseYearSlot(value);
  return (
    <div className="grid grid-cols-3 gap-2">
      <Input
        id={id}
        type="number"
        min={1900}
        max={9999}
        value={year}
        onChange={(e) => {
          const y = Number(e.target.value);
          if (Number.isFinite(y)) onChange(formatYearSlot(y, month, position));
        }}
      />
      <Select
        className="w-full"
        value={String(month)}
        onChange={(v) =>
          onChange(formatYearSlot(year, Number(v), position))
        }
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
      />
      <Select
        className="w-full"
        value={String(position)}
        onChange={(v) =>
          onChange(formatYearSlot(year, month, Number(v) as 1 | 2 | 3))
        }
        options={POSITION_OPTIONS}
      />
    </div>
  );
}
