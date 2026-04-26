import type { ActionType } from '@garden-guide/shared';
import { ActionTypeSchema } from '@garden-guide/shared';
import { ACTION_LABELS, ACTION_TONES, ActionIcon } from './actionStyle';

const ALL_ACTIONS = ActionTypeSchema.options;

interface FilterPanelProps {
  /** The set of action types currently visible (checked). */
  visible: Set<ActionType>;
  /** Number of unchecked action types — drives the reset button + status. */
  hiddenCount: number;
  onToggle: (type: ActionType) => void;
  /** Reset to default (all checked). */
  onReset: () => void;
  expanded: boolean;
  panelId: string;
  /** Per-action counts shown as a quiet suffix on each chip; pass {} to omit. */
  counts?: Partial<Record<ActionType, number>>;
}

export function FilterPanel({
  visible,
  hiddenCount,
  onToggle,
  onReset,
  expanded,
  panelId,
  counts = {},
}: FilterPanelProps) {
  return (
    <div
      id={panelId}
      role="region"
      aria-label="Filter by action type"
      aria-hidden={!expanded}
      className="-mt-1"
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        transition:
          'grid-template-rows 280ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        opacity: expanded ? 1 : 0,
      }}
    >
      <div className="overflow-hidden">
        <div className="rounded-[28px] bg-ivory p-5 shadow-card md:p-6">
          <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted">
              Filter by action
              {hiddenCount > 0 && (
                <span className="ml-2 normal-case tracking-normal text-ink/70">
                  · {hiddenCount} hidden
                </span>
              )}
            </p>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                aria-label={`Show all — clear ${hiddenCount} hidden filter${hiddenCount === 1 ? '' : 's'}`}
                title="Show all"
                tabIndex={expanded ? 0 : -1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink transition-colors duration-200 ease-leaf hover:bg-hairline/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
              >
                <BroomIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_ACTIONS.map((action) => (
              <Chip
                key={action}
                action={action}
                active={visible.has(action)}
                count={counts[action] ?? 0}
                expanded={expanded}
                onToggle={() => onToggle(action)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  action,
  active,
  count,
  expanded,
  onToggle,
}: {
  action: ActionType;
  active: boolean;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const tone = ACTION_TONES[action];
  const dim = !active && count === 0;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      tabIndex={expanded ? 0 : -1}
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color,box-shadow,opacity] duration-200 ease-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
      style={
        active
          ? {
              backgroundColor: tone.bar,
              color: tone.text,
              boxShadow: `inset 0 0 0 1px ${tone.accent}`,
            }
          : {
              backgroundColor: 'transparent',
              color: '#0F0F0F',
              boxShadow: 'inset 0 0 0 1px rgba(216, 212, 199, 0.85)',
              opacity: dim ? 0.55 : 1,
            }
      }
    >
      <ActionIcon
        type={action}
        className="h-3.5 w-3.5 shrink-0"
      />
      <span>{ACTION_LABELS[action]}</span>
      {count > 0 && (
        <span
          className="tabular-nums text-[11px] font-medium"
          style={{ color: active ? tone.text : '#6B6B66', opacity: active ? 0.7 : 1 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface FilterToggleProps {
  expanded: boolean;
  /** Number of action types currently hidden — drives the dot indicator. */
  hiddenCount: number;
  onClick: () => void;
  panelId: string;
}

export function FilterToggle({
  expanded,
  hiddenCount,
  onClick,
  panelId,
}: FilterToggleProps) {
  const label =
    hiddenCount > 0
      ? `Filter by action — ${hiddenCount} hidden`
      : 'Filter by action';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={panelId}
      aria-label={label}
      title={label}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 ease-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 ${
        expanded ? 'bg-ink text-cream' : 'bg-ivory text-ink hover:bg-hairline/60'
      }`}
    >
      <FunnelIcon className="h-[18px] w-[18px]" />
      {hiddenCount > 0 && (
        <span
          className="absolute right-1.5 top-1.5 inline-flex h-2 w-2 rounded-full bg-leaf"
          style={{
            boxShadow: expanded ? '0 0 0 2px #0F0F0F' : '0 0 0 2px #E8E5DA',
          }}
          aria-hidden
        />
      )}
    </button>
  );
}

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 5h16l-6.2 8v5.5a0.6 0.6 0 0 1-0.9 0.5l-2.8-1.4a0.6 0.6 0 0 1-0.3-0.5V13L4 5z" />
    </svg>
  );
}

function BroomIcon({ className }: { className?: string }) {
  // A curved sweep-arc with three pellets being whisked off — pairs with the
  // funnel and reads as "clear/clean" without a generic ✕.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3.5 14.5C7.5 11 14 11 19.5 14.5" />
      <path d="M6 14v2.5M9 14v3M12.5 14v3M16 14.2v2.8M19 14.6v2.4" opacity="0.65" />
      <circle cx="6.5" cy="20" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="11" cy="20.5" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="20" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}
