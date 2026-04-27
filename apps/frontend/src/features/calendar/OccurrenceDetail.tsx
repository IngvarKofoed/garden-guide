import { Link } from 'react-router-dom';
import type { CalendarOccurrence } from '@garden-guide/shared';
import { journalPhotoUrl } from '../../lib/api';
import { ACTION_LABELS, ACTION_TONES, ActionIcon } from './actionStyle';
import { PlantBadge } from './PlantBadge';
import { occurrenceTitle, occurrenceWindowLabel } from './util';

interface OccurrenceDetailProps {
  occ: CalendarOccurrence;
  onClose: () => void;
}

export function OccurrenceDetail({ occ, onClose }: OccurrenceDetailProps) {
  const tone = ACTION_TONES[occ.actionType];
  const isJournal = occ.kind === 'journal';
  const isOneOff = occ.kind === 'one_off';
  const isCompleted = occ.kind !== 'journal' && !!occ.completedOn;
  const plantName = occ.plantName ?? (isJournal ? 'No plant' : '');

  const kindCaption = isJournal
    ? 'journal'
    : isOneOff
      ? 'one-off'
      : 'recurring';

  return (
    <aside
      className="relative overflow-hidden rounded-[28px] bg-cream p-6 shadow-card md:p-7"
      role="dialog"
      aria-label={`${occurrenceTitle(occ)}${plantName ? ` for ${plantName}` : ''}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
        style={{ background: tone.accent, opacity: isJournal ? 0.5 : 0.85 }}
      />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span className="relative shrink-0">
            <PlantBadge
              plantId={occ.plantId}
              iconPhotoId={occ.plantIconPhotoId}
              plantName={occ.plantName}
              size={56}
              fallbackBg={tone.bar}
              fallbackText={tone.text}
            />
            <span
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                backgroundColor: tone.bar,
                color: tone.text,
                boxShadow: '0 0 0 2.5px rgba(242,239,230,0.98)',
              }}
              aria-hidden
            >
              <ActionIcon type={occ.actionType} className="h-4 w-4" />
            </span>
          </span>
          <div>
            <p
              className="text-[11px] font-medium uppercase tracking-[0.18em]"
              style={{ color: tone.accent }}
            >
              {ACTION_LABELS[occ.actionType]} · {kindCaption}
              {isCompleted ? ' · done' : ''}
            </p>
            <h3 className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-ink">
              {occurrenceTitle(occ)}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {plantName || 'Garden note'}
              {occ.plantSpecies && (
                <>
                  <span className="px-1.5 text-muted/40">·</span>
                  <span className="italic">{occ.plantSpecies}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ivory text-ink transition-colors duration-200 ease-leaf hover:bg-hairline/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <DetailRow label="Window" value={occurrenceWindowLabel(occ)} />
        {!isJournal && (
          <DetailRow
            label="Dates"
            value={`${formatLong(occ.startDate)} – ${formatLong(occ.endDate)}`}
          />
        )}
        {isCompleted && occ.completedOn && (
          <DetailRow label="Completed" value={formatLong(occ.completedOn)} />
        )}
      </dl>

      {occ.notes && (
        <div className="mt-5 rounded-2xl bg-ivory/80 p-4 text-sm leading-relaxed text-ink/85">
          {occ.notes}
        </div>
      )}

      {isJournal && occ.photoIds.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {occ.photoIds.map((photoId) => (
            <a
              key={photoId}
              href={journalPhotoUrl(occ.journalId, photoId)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-xl bg-ivory/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/60"
            >
              <img
                src={journalPhotoUrl(occ.journalId, photoId)}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover transition-transform duration-200 ease-leaf hover:scale-[1.02]"
              />
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        {occ.plantId && (
          <Link
            to={`/plants/${occ.plantId}`}
            className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-medium text-cream transition-colors duration-200 ease-leaf hover:bg-ink/90"
          >
            Open plant
          </Link>
        )}
      </div>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

function formatLong(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
