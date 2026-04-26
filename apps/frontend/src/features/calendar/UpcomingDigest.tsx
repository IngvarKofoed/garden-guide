import type { CalendarOccurrence } from '@garden-guide/shared';
import { ACTION_LABELS, ACTION_TONES, ActionIcon } from './actionStyle';
import { PlantBadge } from './PlantBadge';
import { occurrenceKey, occurrenceTitle, occurrenceWindowLabel, parseYmd } from './util';

interface UpcomingDigestProps {
  today: Date;
  occurrences: CalendarOccurrence[];
  onSelect: (occ: CalendarOccurrence) => void;
  selectedKey: string | null;
}

interface Bucket {
  label: string;
  caption: string;
  items: CalendarOccurrence[];
}

export function UpcomingDigest({
  today,
  occurrences,
  onSelect,
  selectedKey,
}: UpcomingDigestProps) {
  const buckets = bucketize(today, occurrences);
  const total = buckets.reduce((acc, b) => acc + b.items.length, 0);

  return (
    <section className="rounded-[28px] bg-cream p-6 shadow-card md:p-7">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted">
            Right now
          </p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            What the garden needs
          </h3>
        </div>
        <span className="text-xs text-muted tabular-nums">{total} active</span>
      </header>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-ivory/60 p-8 text-center text-sm text-muted">
          Nothing on the schedule for the next two weeks.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {buckets.map(
            (b) =>
              b.items.length > 0 && (
                <div key={b.label}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h4 className="text-sm font-semibold text-ink">{b.label}</h4>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted">
                      {b.caption}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {b.items.map((occ) => (
                      <DigestRow
                        key={occurrenceKey(occ)}
                        occ={occ}
                        selected={selectedKey === occurrenceKey(occ)}
                        onSelect={() => onSelect(occ)}
                      />
                    ))}
                  </ul>
                </div>
              ),
          )}
        </div>
      )}
    </section>
  );
}

function DigestRow({
  occ,
  selected,
  onSelect,
}: {
  occ: CalendarOccurrence;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = ACTION_TONES[occ.actionType];
  const isCompleted = !!occ.completedOn;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`group flex w-full items-center gap-3 rounded-2xl py-2.5 pl-2 pr-3 text-left transition-colors duration-200 ease-leaf hover:bg-ivory/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${
          selected ? 'bg-ivory/85 ring-1 ring-ink/15' : ''
        }`}
      >
        <span className="relative shrink-0">
          <PlantBadge
            plantId={occ.plantId}
            iconPhotoId={occ.plantIconPhotoId}
            plantName={occ.plantName}
            size={40}
            fallbackBg={tone.bar}
            fallbackText={tone.text}
          />
          <span
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full"
            style={{
              backgroundColor: tone.bar,
              color: tone.text,
              boxShadow: '0 0 0 2px rgba(242,239,230,0.95)',
            }}
            aria-hidden
          >
            <ActionIcon type={occ.actionType} className="h-3 w-3" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium ${
              isCompleted ? 'text-muted line-through decoration-1' : 'text-ink'
            }`}
          >
            {occurrenceTitle(occ)}
            <span className="px-1.5 text-muted/40">·</span>
            <span className={isCompleted ? 'text-muted' : 'text-ink/85'}>
              {occ.plantName}
            </span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {ACTION_LABELS[occ.actionType]} · {occurrenceWindowLabel(occ)}
          </p>
        </div>
        {isCompleted && (
          <span className="hidden items-center rounded-full bg-leaf/15 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-forest sm:inline-flex">
            done
          </span>
        )}
      </button>
    </li>
  );
}

function bucketize(today: Date, occurrences: CalendarOccurrence[]): Bucket[] {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = addDays(startOfToday, 1);
  const inSeven = addDays(startOfToday, 7);
  const inFourteen = addDays(startOfToday, 14);

  const active: CalendarOccurrence[] = [];
  const within7: CalendarOccurrence[] = [];
  const within14: CalendarOccurrence[] = [];

  for (const occ of occurrences) {
    const start = parseYmd(occ.startDate);
    const end = parseYmd(occ.endDate);
    if (end < startOfToday) continue;
    if (start <= startOfToday && end >= startOfToday) {
      active.push(occ);
    } else if (start >= tomorrow && start < inSeven) {
      within7.push(occ);
    } else if (start >= inSeven && start < inFourteen) {
      within14.push(occ);
    }
  }

  const byStart = (a: CalendarOccurrence, b: CalendarOccurrence) =>
    a.startDate.localeCompare(b.startDate);
  active.sort(byStart);
  within7.sort(byStart);
  within14.sort(byStart);

  return [
    { label: 'Active today', caption: 'happening now', items: active },
    { label: 'This week', caption: 'starts within 7 days', items: within7 },
    { label: 'Next week', caption: 'in 8–14 days', items: within14 },
  ];
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
