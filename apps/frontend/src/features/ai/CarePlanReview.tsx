import { useEffect, useState } from 'react';
import type {
  CareTaskCreateRequest,
  SuggestedTask,
} from '@garden-guide/shared';
import { slotLabel, yearSlotLabel } from '@garden-guide/shared';
import { Button, Card, Tag, Textarea } from '../../components/ui';
import { useCreateTaskForPlant } from '../tasks/hooks';
import { useGenerateCarePlan, useRefineCarePlan } from './hooks';

interface CarePlanReviewProps {
  plantId: string;
}

export function CarePlanReview({ plantId }: CarePlanReviewProps) {
  const generate = useGenerateCarePlan();
  const refine = useRefineCarePlan();
  const createTask = useCreateTaskForPlant(plantId);

  const [tasks, setTasks] = useState<SuggestedTask[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  // When new suggestions arrive, select all by default and clear accept state.
  useEffect(() => {
    setSelected(new Set(tasks.map((_, i) => i)));
    setAccepted(new Set());
    setAcceptError(null);
  }, [tasks]);

  const onGenerate = () => {
    setExplanation(null);
    generate.mutate(
      { plantId },
      {
        onSuccess: (res) => setTasks(res.tasks),
      },
    );
  };

  const onRefine = () => {
    if (!question.trim()) return;
    refine.mutate(
      { plantId, question: question.trim() },
      {
        onSuccess: (res) => {
          setTasks(res.tasks);
          setExplanation(res.explanation);
          setQuestion('');
        },
      },
    );
  };

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const onAccept = async () => {
    setAcceptError(null);
    const indices = [...selected].filter((i) => !accepted.has(i));
    for (const i of indices) {
      const t = tasks[i];
      if (!t) continue;
      try {
        await createTask.mutateAsync(toCreateRequest(t));
        setAccepted((prev) => new Set(prev).add(i));
      } catch (err) {
        setAcceptError((err as Error).message);
        return;
      }
    }
  };

  const remaining = [...selected].filter((i) => !accepted.has(i)).length;
  const hasTasks = tasks.length > 0;

  return (
    <Card className="p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SparkleIcon />
          <h2 className="text-lg font-semibold text-ink">AI care plan</h2>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onGenerate}
          disabled={generate.isPending}
        >
          {generate.isPending
            ? 'Thinking…'
            : hasTasks
              ? 'Regenerate'
              : 'Generate care plan'}
        </Button>
      </header>

      {generate.isError && !hasTasks && (
        <p className="mt-3 text-sm text-red-700">
          {(generate.error as Error).message}
        </p>
      )}

      {!hasTasks && !generate.isPending && !generate.isError && (
        <p className="mt-3 text-sm text-muted">
          Get a starter care plan tailored to this plant. Suggestions land here for
          you to review — nothing is saved until you accept.
        </p>
      )}

      {explanation && (
        <p className="mt-4 rounded-2xl bg-mint/40 p-3 text-sm text-ink">
          {explanation}
        </p>
      )}

      {hasTasks && (
        <ul className="mt-5 flex flex-col gap-3">
          {tasks.map((task, i) => (
            <SuggestedTaskRow
              key={i}
              task={task}
              checked={selected.has(i)}
              accepted={accepted.has(i)}
              onToggle={() => toggle(i)}
            />
          ))}
        </ul>
      )}

      {hasTasks && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <p className="text-xs text-muted">
            {accepted.size > 0 && `${accepted.size} added · `}
            {remaining} selected, ready to add
          </p>
          <Button
            type="button"
            onClick={onAccept}
            disabled={remaining === 0 || createTask.isPending}
          >
            {createTask.isPending
              ? 'Adding…'
              : remaining === 0 && accepted.size > 0
                ? 'All added'
                : 'Add selected tasks'}
          </Button>
        </div>
      )}

      {acceptError && (
        <p className="mt-3 text-sm text-red-700">{acceptError}</p>
      )}

      {hasTasks && (
        <div className="mt-6 border-t border-hairline pt-5">
          <label
            htmlFor="ai-refine"
            className="text-sm font-medium text-ink"
          >
            Refine the plan
          </label>
          <p className="mt-1 text-xs text-muted">
            Ask a follow-up question or describe a constraint and we'll adjust.
          </p>
          <Textarea
            id="ai-refine"
            className="mt-2 w-full"
            value={question}
            placeholder="e.g. We're in a clay soil — how should fertilising change?"
            onChange={(e) => setQuestion(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefine}
              disabled={refine.isPending || !question.trim()}
            >
              {refine.isPending ? 'Refining…' : 'Refine plan'}
            </Button>
            {refine.isError && (
              <span className="text-xs text-red-700">
                {(refine.error as Error).message}
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function SuggestedTaskRow({
  task,
  checked,
  accepted,
  onToggle,
}: {
  task: SuggestedTask;
  checked: boolean;
  accepted: boolean;
  onToggle: () => void;
}) {
  const window =
    task.kind === 'recurring'
      ? task.recurStartSlot === task.recurEndSlot
        ? slotLabel(task.recurStartSlot)
        : `${slotLabel(task.recurStartSlot)} → ${slotLabel(task.recurEndSlot)}`
      : yearSlotLabel(task.dueSlot);
  const label = task.customLabel ?? task.actionType;

  return (
    <li
      className={`rounded-2xl border p-4 transition-colors ${
        accepted
          ? 'border-leaf/60 bg-mint/30'
          : checked
            ? 'border-hairline bg-ivory'
            : 'border-hairline/60 bg-ivory/40'
      }`}
    >
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={accepted}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-hairline text-leaf focus:ring-leaf/40"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink capitalize">
              {label}
            </span>
            <Tag tone={task.kind === 'recurring' ? 'mint' : 'leaf'}>
              {task.kind === 'recurring' ? 'Recurring' : 'One-off'}
            </Tag>
            <span className="text-xs text-muted">{window}</span>
            {accepted && <Tag tone="ivory">Added</Tag>}
          </div>
          <p className="mt-1 text-xs text-muted">{task.rationale}</p>
        </div>
      </label>
    </li>
  );
}

function toCreateRequest(t: SuggestedTask): CareTaskCreateRequest {
  if (t.kind === 'recurring') {
    return {
      kind: 'recurring',
      actionType: t.actionType,
      customLabel: t.customLabel ?? null,
      recurStartSlot: t.recurStartSlot,
      recurEndSlot: t.recurEndSlot,
      notes: t.rationale,
      notify: true,
    };
  }
  return {
    kind: 'one_off',
    actionType: t.actionType,
    customLabel: t.customLabel ?? null,
    dueSlot: t.dueSlot,
    notes: t.rationale,
    notify: true,
  };
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-leaf" aria-hidden="true">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
