import { useMemo } from 'react';
import type { CalendarOccurrence } from '@garden-guide/shared';
import { ACTION_TONES, ActionIcon } from './actionStyle';
import { PlantBadge } from './PlantBadge';
import {
  MONTH_ABBR,
  occurrenceIsInYear,
  occurrenceKey,
  occurrenceSpan,
  occurrenceTitle,
  packLanes,
  todaySlotIndex,
} from './util';

interface RibbonItem {
  occ: CalendarOccurrence;
  startIndex: number;
  endIndex: number;
}

interface RibbonProps {
  year: number;
  occurrences: CalendarOccurrence[];
  /** Inclusive month range (0-indexed). [0, 11] = full year, [m, m+2] = quarter. */
  monthRange: [number, number];
  today: Date;
  onSelect: (occ: CalendarOccurrence) => void;
  selectedKey: string | null;
}

export function Ribbon({
  year,
  occurrences,
  monthRange,
  today,
  onSelect,
  selectedKey,
}: RibbonProps) {
  const [startMonth, endMonth] = monthRange;
  const visibleMonths = endMonth - startMonth + 1;
  const startSlotIdx = startMonth * 3;
  const endSlotIdx = (endMonth + 1) * 3 - 1;
  const totalSlots = endSlotIdx - startSlotIdx + 1;

  const lanes = useMemo(() => {
    const items: RibbonItem[] = [];
    for (const occ of occurrences) {
      if (!occurrenceIsInYear(occ, year)) continue;
      const span = occurrenceSpan(occ, year);
      if (span.endIndex < startSlotIdx) continue;
      if (span.startIndex > endSlotIdx) continue;
      items.push({
        occ,
        startIndex: Math.max(span.startIndex, startSlotIdx),
        endIndex: Math.min(span.endIndex, endSlotIdx),
      });
    }
    return packLanes(items);
  }, [occurrences, year, startSlotIdx, endSlotIdx]);

  const isCurrentYear = today.getFullYear() === year;
  const todayIdx = todaySlotIndex(today);
  const todayWithinRange =
    isCurrentYear && todayIdx >= startSlotIdx && todayIdx <= endSlotIdx;
  const todayLeftPct = todayWithinRange
    ? ((todayIdx - startSlotIdx + 0.5) / totalSlots) * 100
    : null;

  const isWide = visibleMonths >= 12;

  return (
    <section className="relative overflow-hidden rounded-[28px] bg-cream shadow-card">
      <SeasonalWash startMonth={startMonth} endMonth={endMonth} />
      <div className="relative">
        {/* horizontally scrollable on tight widths so a 12-month ribbon stays legible */}
        <div className={isWide ? 'overflow-x-auto' : ''}>
          <div
            className="relative px-5 pt-5 pb-6 sm:px-7"
            style={isWide ? { minWidth: 880 } : undefined}
          >
            <MonthHeader
              startMonth={startMonth}
              endMonth={endMonth}
              today={isCurrentYear ? today : null}
            />
            <div className="relative mt-4">
              <SlotGrid visibleMonths={visibleMonths} />
              {todayLeftPct !== null && <TodayMarker leftPct={todayLeftPct} />}
              <div className="relative flex flex-col gap-1.5 py-1.5">
                {lanes.length === 0 && (
                  <EmptyLanes visibleMonths={visibleMonths} year={year} />
                )}
                {lanes.map((lane, laneIdx) => (
                  <Lane
                    key={laneIdx}
                    laneIdx={laneIdx}
                    items={lane}
                    totalSlots={totalSlots}
                    startSlotIdx={startSlotIdx}
                    onSelect={onSelect}
                    selectedKey={selectedKey}
                  />
                ))}
              </div>
              <SlotTickLegend />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthHeader({
  startMonth,
  endMonth,
  today,
}: {
  startMonth: number;
  endMonth: number;
  today: Date | null;
}) {
  const months = endMonth - startMonth + 1;
  return (
    <div
      className="grid text-[11px] font-medium uppercase tracking-[0.18em] text-muted"
      style={{ gridTemplateColumns: `repeat(${months}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: months }).map((_, i) => {
        const monthIdx = startMonth + i;
        const isCurrent = today && today.getMonth() === monthIdx;
        return (
          <div
            key={monthIdx}
            className={`flex items-baseline gap-2 pl-1 ${
              isCurrent ? 'text-ink' : ''
            }`}
          >
            <span>{MONTH_ABBR[monthIdx]}</span>
            {isCurrent && (
              <span className="h-1 w-1 translate-y-[-1px] rounded-full bg-leaf" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SlotGrid({ visibleMonths }: { visibleMonths: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 grid"
      style={{ gridTemplateColumns: `repeat(${visibleMonths}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: visibleMonths }).map((_, m) => (
        <div
          key={m}
          className="relative border-l border-hairline/55 first:border-l-transparent"
        >
          <span className="absolute inset-y-3 left-1/3 w-px bg-hairline/35" />
          <span className="absolute inset-y-3 left-2/3 w-px bg-hairline/35" />
        </div>
      ))}
    </div>
  );
}

function TodayMarker({ leftPct }: { leftPct: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10"
      style={{ left: `${leftPct}%` }}
      aria-hidden
    >
      <div className="absolute inset-y-2 w-px bg-leaf/70" />
      <div
        className="absolute -top-1 -translate-x-1/2 h-2 w-2 rounded-full bg-leaf"
        style={{ boxShadow: '0 0 0 4px rgba(110,168,107,0.18)' }}
      />
    </div>
  );
}

function Lane({
  laneIdx,
  items,
  totalSlots,
  startSlotIdx,
  onSelect,
  selectedKey,
}: {
  laneIdx: number;
  items: RibbonItem[];
  totalSlots: number;
  startSlotIdx: number;
  onSelect: (occ: CalendarOccurrence) => void;
  selectedKey: string | null;
}) {
  return (
    <div className="relative h-9">
      {items.map((it, idx) => {
        const startOff = it.startIndex - startSlotIdx;
        const span = it.endIndex - it.startIndex + 1;
        const leftPct = (startOff / totalSlots) * 100;
        const widthPct = (span / totalSlots) * 100;
        const tone = ACTION_TONES[it.occ.actionType];
        const key = occurrenceKey(it.occ);
        const isSelected = selectedKey === key;
        const isOneOff = it.occ.kind === 'one_off';
        const isCompleted = !!it.occ.completedOn;
        const cascade = laneIdx * 28 + idx * 18;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(it.occ)}
            title={`${occurrenceTitle(it.occ)} · ${it.occ.plantName}`}
            className={`group absolute top-0 flex h-9 items-center gap-2 overflow-hidden rounded-full pl-1 pr-3 text-left outline-none ring-offset-cream transition-[box-shadow,transform] duration-200 ease-leaf focus-visible:ring-2 focus-visible:ring-ink/70 focus-visible:ring-offset-2 ${
              isSelected ? 'shadow-[0_0_0_2px_rgba(15,15,15,0.85)]' : ''
            } ${isCompleted ? 'opacity-55' : ''}`}
            style={{
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              minWidth: 32,
              backgroundColor: tone.bar,
              color: tone.text,
              animation: 'gg-bar-in 320ms ease-out both',
              animationDelay: `${cascade}ms`,
            }}
          >
            <PlantBadge
              plantId={it.occ.plantId}
              iconPhotoId={it.occ.plantIconPhotoId}
              plantName={it.occ.plantName}
              size={26}
              ring={isOneOff ? tone.accent : undefined}
              fallbackBg="rgba(242,239,230,0.85)"
              fallbackText={tone.text}
            />
            <ActionIcon type={it.occ.actionType} className="h-[14px] w-[14px] shrink-0" />
            <span className="truncate text-[12.5px] font-medium leading-none">
              <span className="opacity-90">{occurrenceTitle(it.occ)}</span>
              <span className="px-1 opacity-40">·</span>
              <span>{it.occ.plantName}</span>
            </span>
            {isCompleted && (
              <span
                className="ml-auto inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                style={{ background: tone.accent, color: 'rgba(242,239,230,0.95)' }}
                aria-label="Completed"
              >
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5 10 17 19 7" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EmptyLanes({ visibleMonths, year }: { visibleMonths: number; year: number }) {
  return (
    <div className="flex h-28 items-center justify-center text-sm text-muted">
      {visibleMonths === 12
        ? `Nothing scheduled in ${year} yet — tasks will appear here as you add them.`
        : 'No tasks in this window.'}
    </div>
  );
}

function SlotTickLegend() {
  return (
    <div className="flex items-center justify-end gap-4 pt-3 text-[10px] uppercase tracking-[0.2em] text-muted/70">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-3 bg-hairline" />
        early
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-3 bg-hairline" />
        mid
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-px w-3 bg-hairline" />
        late
      </span>
    </div>
  );
}

function SeasonalWash({
  startMonth,
  endMonth,
}: {
  startMonth: number;
  endMonth: number;
}) {
  // Map [Jan..Dec] to [cool..warm..cool] across the visible window so the wash
  // intensifies near midsummer regardless of zoom.
  const center = 5.5; // between Jun and Jul
  const visible = endMonth - startMonth + 1;
  const fracFor = (m: number) => 1 - Math.min(1, Math.abs(m - center) / 6);
  const stops = Array.from({ length: visible }).map((_, i) => {
    const m = startMonth + i;
    const intensity = fracFor(m);
    const pct = ((i + 0.5) / visible) * 100;
    const alpha = 0.10 + intensity * 0.18;
    return `rgba(217, 232, 207, ${alpha.toFixed(3)}) ${pct}%`;
  });

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(to right, ${stops.join(', ')})` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 90% at 50% -20%, rgba(217, 232, 207, 0.45), transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{
          background:
            'linear-gradient(to top, rgba(169, 184, 158, 0.10), transparent)',
        }}
      />
    </>
  );
}
