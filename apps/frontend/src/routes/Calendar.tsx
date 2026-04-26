import { useId, useMemo, useState } from 'react';
import { useCalendar } from '../features/calendar/hooks';
import { Ribbon } from '../features/calendar/Ribbon';
import { OccurrenceDetail } from '../features/calendar/OccurrenceDetail';
import { UpcomingDigest } from '../features/calendar/UpcomingDigest';
import { FilterPanel, FilterToggle } from '../features/calendar/FilterPanel';
import { occurrenceKey, MONTH_ABBR } from '../features/calendar/util';
import {
  ActionTypeSchema,
  type ActionType,
  type CalendarOccurrence,
} from '@garden-guide/shared';

const ALL_ACTIONS = ActionTypeSchema.options;

type View = 'year' | 'quarter' | 'two-months';

export function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<View>('year');
  const [year, setYear] = useState<number>(today.getFullYear());
  const [quarterStart, setQuarterStart] = useState<number>(
    Math.floor(today.getMonth() / 3) * 3,
  );
  const [twoMonthStart, setTwoMonthStart] = useState<number>(
    // Clamp so the 2-month window always fits inside the displayed year.
    Math.min(today.getMonth(), 10),
  );
  const [selected, setSelected] = useState<CalendarOccurrence | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<ActionType>>(
    () => new Set(ALL_ACTIONS),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelId = useId();

  // Load a slightly wider window than the displayed year so cross-year wrap
  // (e.g. late-Nov → late-Feb mulch) shows in both years.
  const from = `${year - 1}-12-01`;
  const to = `${year + 1}-01-31`;
  const { data, isLoading, isError } = useCalendar(from, to);

  const allOccurrences = data ?? [];
  const filteredOccurrences = useMemo(
    () => allOccurrences.filter((o) => visibleTypes.has(o.actionType)),
    [allOccurrences, visibleTypes],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<ActionType, number>> = {};
    for (const o of allOccurrences) c[o.actionType] = (c[o.actionType] ?? 0) + 1;
    return c;
  }, [allOccurrences]);
  const hiddenCount = ALL_ACTIONS.length - visibleTypes.size;

  const occurrences = filteredOccurrences;
  const selectedKey = selected ? occurrenceKey(selected) : null;
  const onSelect = (occ: CalendarOccurrence) => {
    setSelected((cur) =>
      cur && occurrenceKey(cur) === occurrenceKey(occ) ? null : occ,
    );
  };
  const onToggleFilter = (type: ActionType) => {
    setVisibleTypes((cur) => {
      const next = new Set(cur);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };
  const onResetFilters = () => setVisibleTypes(new Set(ALL_ACTIONS));

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        year={year}
        view={view}
        onYearShift={(delta) => setYear((y) => y + delta)}
        onViewChange={setView}
        filterToggle={
          <FilterToggle
            expanded={filterOpen}
            hiddenCount={hiddenCount}
            onClick={() => setFilterOpen((v) => !v)}
            panelId={filterPanelId}
          />
        }
      />
      <FilterPanel
        visible={visibleTypes}
        hiddenCount={hiddenCount}
        onToggle={onToggleFilter}
        onReset={onResetFilters}
        expanded={filterOpen}
        panelId={filterPanelId}
        counts={counts}
      />

      {isError && (
        <div className="rounded-2xl bg-ivory p-5 text-sm text-red-700">
          Couldn't load the calendar. Try again in a moment.
        </div>
      )}
      {isLoading && !data && <RibbonSkeleton />}

      {!isLoading && (
        <>
          {view === 'year' && (
            <Ribbon
              year={year}
              occurrences={occurrences}
              monthRange={[0, 11]}
              today={today}
              onSelect={onSelect}
              selectedKey={selectedKey}
            />
          )}

          {view === 'quarter' && (
            <div className="flex flex-col gap-4">
              <QuarterShifter
                year={year}
                quarterStart={quarterStart}
                onShift={(delta) => {
                  let next = quarterStart + delta * 3;
                  let nextYear = year;
                  if (next < 0) {
                    next += 12;
                    nextYear -= 1;
                  } else if (next > 9) {
                    next -= 12;
                    nextYear += 1;
                  }
                  setQuarterStart(next);
                  setYear(nextYear);
                }}
              />
              <Ribbon
                year={year}
                occurrences={occurrences}
                monthRange={[quarterStart, quarterStart + 2]}
                today={today}
                onSelect={onSelect}
                selectedKey={selectedKey}
              />
            </div>
          )}

          {view === 'two-months' && (
            <div className="flex flex-col gap-4">
              <TwoMonthShifter
                year={year}
                twoMonthStart={twoMonthStart}
                onShift={(delta) => {
                  let next = twoMonthStart + delta;
                  let nextYear = year;
                  if (next < 0) {
                    next = 10;
                    nextYear -= 1;
                  } else if (next > 10) {
                    next = 0;
                    nextYear += 1;
                  }
                  setTwoMonthStart(next);
                  setYear(nextYear);
                }}
              />
              <Ribbon
                year={year}
                occurrences={occurrences}
                monthRange={[twoMonthStart, twoMonthStart + 1]}
                today={today}
                onSelect={onSelect}
                selectedKey={selectedKey}
              />
            </div>
          )}
        </>
      )}

      {selected && (
        <OccurrenceDetail
          occ={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {!isLoading && (
        <UpcomingDigest
          today={today}
          occurrences={occurrences}
          onSelect={onSelect}
          selectedKey={selectedKey}
        />
      )}
    </div>
  );
}

function PageHeader({
  year,
  view,
  onYearShift,
  onViewChange,
  filterToggle,
}: {
  year: number;
  view: View;
  onYearShift: (delta: number) => void;
  onViewChange: (v: View) => void;
  filterToggle: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
              The garden year
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Calendar
            </h1>
          </div>
          <YearStepper year={year} onShift={onYearShift} />
        </div>
        <div className="flex items-center gap-2">
          {filterToggle}
          <ViewSwitcher view={view} onChange={onViewChange} />
        </div>
      </div>
    </header>
  );
}

function YearStepper({
  year,
  onShift,
}: {
  year: number;
  onShift: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-ivory px-1.5 py-1">
      <RoundIcon onClick={() => onShift(-1)} ariaLabel="Previous year">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </RoundIcon>
      <span className="px-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {year}
      </span>
      <RoundIcon onClick={() => onShift(1)} ariaLabel="Next year">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </RoundIcon>
    </div>
  );
}

function RoundIcon({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors duration-200 ease-leaf hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
    >
      {children}
    </button>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  const opts: Array<{ id: View; label: string }> = [
    { id: 'year', label: 'Year' },
    { id: 'quarter', label: 'Quarter' },
    { id: 'two-months', label: '2 Months' },
  ];
  return (
    <div className="inline-flex h-10 items-center rounded-full bg-ivory p-1">
      {opts.map((o) => {
        const active = view === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`inline-flex h-8 items-center rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60 ${
              active ? 'bg-ink text-cream' : 'text-ink/80 hover:text-ink'
            }`}
            aria-pressed={active}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function QuarterShifter({
  year,
  quarterStart,
  onShift,
}: {
  year: number;
  quarterStart: number;
  onShift: (delta: number) => void;
}) {
  const label = `${MONTH_ABBR[quarterStart]} – ${MONTH_ABBR[quarterStart + 2]} ${year}`;
  return (
    <Shifter onPrev={() => onShift(-1)} onNext={() => onShift(1)} label={label} />
  );
}

function TwoMonthShifter({
  year,
  twoMonthStart,
  onShift,
}: {
  year: number;
  twoMonthStart: number;
  onShift: (delta: number) => void;
}) {
  const label = `${MONTH_ABBR[twoMonthStart]} – ${MONTH_ABBR[twoMonthStart + 1]} ${year}`;
  return (
    <Shifter onPrev={() => onShift(-1)} onNext={() => onShift(1)} label={label} />
  );
}

function Shifter({
  onPrev,
  onNext,
  label,
}: {
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-full bg-cream px-2 py-1">
      <RoundIcon onClick={onPrev} ariaLabel="Previous">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </RoundIcon>
      <span className="px-2 text-base font-semibold tracking-tight text-ink">
        {label}
      </span>
      <RoundIcon onClick={onNext} ariaLabel="Next">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </RoundIcon>
    </div>
  );
}

function RibbonSkeleton() {
  return (
    <div className="rounded-[28px] bg-cream p-6 shadow-card">
      <div className="grid grid-cols-12 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-ivory"
            style={{ animation: 'gg-pulse 1.6s ease-in-out infinite', animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-full bg-ivory"
            style={{
              width: `${30 + ((i * 17) % 60)}%`,
              marginLeft: `${(i * 11) % 40}%`,
              animation: 'gg-pulse 1.6s ease-in-out infinite',
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
