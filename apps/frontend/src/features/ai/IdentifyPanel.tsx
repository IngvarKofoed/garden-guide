import { useState } from 'react';
import type { PlantCandidate } from '@garden-guide/shared';
import { Button, Field, Input, Tag } from '../../components/ui';
import { useIdentifyPlant } from './hooks';

interface IdentifyPanelProps {
  initialName: string;
  onPick: (pick: { name: string; species: string | null }) => void;
}

export function IdentifyPanel({ initialName, onPick }: IdentifyPanelProps) {
  const [description, setDescription] = useState(initialName);
  const identify = useIdentifyPlant();

  const candidates = identify.data?.candidates ?? [];

  const onIdentify = () => {
    if (!description.trim()) return;
    identify.mutate({ name: description.trim() });
  };

  return (
    <div className="rounded-2xl border border-hairline bg-cream/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <SparkleIcon />
        <h3 className="text-sm font-semibold tracking-tight text-ink">
          Identify with AI
        </h3>
      </div>

      <p className="mb-4 text-xs text-muted">
        Describe what you have and we'll suggest matching species. Pick a candidate to
        prefill the form.
      </p>

      <Field
        label="Description"
        htmlFor="ai-desc"
        hint="Common name, look, or any clue."
      >
        <Input
          id="ai-desc"
          type="text"
          value={description}
          placeholder="e.g. small white-flowered shrub"
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onIdentify}
          disabled={identify.isPending || !description.trim()}
        >
          {identify.isPending ? 'Asking…' : 'Identify'}
        </Button>
        {identify.isError && (
          <span className="text-xs text-red-700">
            {(identify.error as Error).message}
          </span>
        )}
      </div>

      {candidates.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {candidates.map((c, i) => (
            <CandidateRow key={`${c.commonName}-${i}`} candidate={c} onPick={onPick} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  onPick,
}: {
  candidate: PlantCandidate;
  onPick: (pick: { name: string; species: string | null }) => void;
}) {
  return (
    <li className="rounded-2xl bg-ivory p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">{candidate.commonName}</span>
            {candidate.species && (
              <span className="text-sm italic text-muted">{candidate.species}</span>
            )}
            <Tag tone="mint">{Math.round(candidate.confidence * 100)}%</Tag>
          </div>
          <p className="mt-1 text-xs text-muted">{candidate.notes}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onPick({ name: candidate.commonName, species: candidate.species })
          }
        >
          Use this
        </Button>
      </div>
    </li>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-leaf" aria-hidden="true">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
