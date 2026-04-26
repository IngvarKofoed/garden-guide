import { useRef, useState } from 'react';
import { Button } from '../../components/ui';
import { plantIconDraftUrl, plantIconUrl } from '../../lib/api';
import {
  useAcceptPlantIconDraft,
  useDeletePlantIcon,
  useDeletePlantIconDraft,
  useGeneratePlantIconDraft,
  usePlant,
  useUploadPlantIcon,
} from '../plants/hooks';

interface IconPanelProps {
  plantId: string;
}

export function IconPanel({ plantId }: IconPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plantQuery = usePlant(plantId);
  const upload = useUploadPlantIcon();
  const remove = useDeletePlantIcon();
  const generate = useGeneratePlantIconDraft();
  const accept = useAcceptPlantIconDraft();
  const cancelDraft = useDeletePlantIconDraft();

  const [error, setError] = useState<string | null>(null);

  const plant = plantQuery.data;
  const hasIcon = !!plant?.iconPhotoId;
  const hasDraft = !!plant?.iconDraftPhotoId;
  const draftUrl = hasDraft && plant
    ? plantIconDraftUrl(plant.id, plant.iconDraftPhotoId)
    : null;
  const iconUrl = hasIcon && plant
    ? plantIconUrl(plant.id, plant.iconPhotoId)
    : null;

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync({ id: plantId, file });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onGenerate = async () => {
    setError(null);
    try {
      await generate.mutateAsync(plantId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAcceptDraft = async () => {
    setError(null);
    try {
      await accept.mutateAsync(plantId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onCancelDraft = async () => {
    setError(null);
    try {
      await cancelDraft.mutateAsync(plantId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync(plantId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="rounded-2xl border border-hairline bg-cream/60 p-5">
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ivory">
          {draftUrl ? (
            <img
              src={draftUrl}
              alt="AI icon draft"
              className="h-full w-full object-cover"
            />
          ) : iconUrl ? (
            <img
              src={iconUrl}
              alt={`${plant?.name ?? 'Plant'} icon`}
              className="h-full w-full object-cover"
            />
          ) : (
            <SeedIcon />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-ink">Icon</h3>
            {hasDraft && <span className="text-xs text-muted">— AI draft</span>}
          </div>
          <p className="mt-1 text-xs text-muted">
            {hasDraft
              ? 'A new icon is waiting for you. Use it, regenerate, or discard.'
              : 'Used in plant lists and the calendar. Upload your own photo or let AI draw a small illustration.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {hasDraft ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={onAcceptDraft}
                  disabled={accept.isPending}
                >
                  {accept.isPending ? 'Saving…' : 'Use this'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onGenerate}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? 'Drawing…' : 'Try again'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancelDraft}
                  disabled={cancelDraft.isPending}
                >
                  {cancelDraft.isPending ? 'Discarding…' : 'Discard'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onPickFile}
                  disabled={upload.isPending}
                >
                  {upload.isPending ? 'Uploading…' : 'Upload'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onGenerate}
                  disabled={generate.isPending}
                >
                  {generate.isPending ? 'Drawing…' : 'Generate with AI'}
                </Button>
                {hasIcon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    disabled={remove.isPending}
                  >
                    Remove
                  </Button>
                )}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function SeedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-10 w-10 text-muted/50"
      aria-hidden="true"
    >
      <path
        d="M12 21v-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 13c-2 0-4-1.5-4-4 2 0 4 1.5 4 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 13c0-2.5 1.5-4.5 4.5-4.5 0 3-2 4.5-4.5 4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
