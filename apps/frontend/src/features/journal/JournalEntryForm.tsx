import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ActionTypeSchema,
  JournalEntryCreateRequestSchema,
  type ActionType,
  type JournalEntryCreateRequest,
} from '@garden-guide/shared';
import { Button, Field, Input, Select, Textarea } from '../../components/ui';
import { useCreateJournalEntry, useUploadJournalPhoto } from './hooks';

const ACTION_LABELS: Record<ActionType, string> = {
  prune: 'Prune',
  fertilize: 'Fertilize',
  water: 'Water',
  plant: 'Plant',
  transplant: 'Transplant',
  harvest: 'Harvest',
  sow: 'Sow',
  mulch: 'Mulch',
  treat: 'Treat',
  inspect: 'Inspect',
  custom: 'Other (custom)',
};

const ACTION_OPTIONS = ActionTypeSchema.options.map((value) => ({
  value,
  label: ACTION_LABELS[value],
}));

interface JournalEntryFormProps {
  plantId: string;
}

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function JournalEntryForm({ plantId }: JournalEntryFormProps) {
  const create = useCreateJournalEntry();
  const upload = useUploadJournalPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JournalEntryCreateRequest>({
    resolver: zodResolver(JournalEntryCreateRequestSchema),
    defaultValues: {
      plantId,
      occurredOn: todayYmd(),
      actionType: 'inspect',
      customLabel: null,
      notes: null,
    },
  });

  const actionType = watch('actionType');

  const onPickFiles = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setFiles((cur) => [...cur, ...Array.from(list)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const onRemoveFile = (idx: number) =>
    setFiles((cur) => cur.filter((_, i) => i !== idx));

  const onSubmit = handleSubmit(async (values) => {
    try {
      const body: JournalEntryCreateRequest = {
        ...values,
        plantId,
        notes: values.notes?.toString().trim() || null,
        customLabel:
          values.actionType === 'custom'
            ? values.customLabel?.toString().trim() || null
            : null,
      };
      const entry = await create.mutateAsync(body);
      // Sequential uploads — keeps things simple and matches the backend's
      // single-file multipart limit.
      for (const file of files) {
        await upload.mutateAsync({ journalId: entry.id, file });
      }
      reset({
        plantId,
        occurredOn: todayYmd(),
        actionType: 'inspect',
        customLabel: null,
        notes: null,
      });
      setFiles([]);
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      noValidate
    >
      <Field
        label="Action"
        htmlFor="journal-action"
        error={errors.actionType?.message}
      >
        <Select
          id="journal-action"
          className="w-full"
          value={actionType}
          onChange={(v) => setValue('actionType', v as ActionType)}
          options={ACTION_OPTIONS}
        />
      </Field>
      <Field
        label="Date"
        htmlFor="journal-date"
        error={errors.occurredOn?.message}
      >
        <Input id="journal-date" type="date" {...register('occurredOn')} />
      </Field>
      <Field
        label="Photo"
        htmlFor="journal-photo"
        hint={
          files.length === 0
            ? 'Optional — multiple allowed'
            : `${files.length} attached`
        }
      >
        <input
          ref={fileInputRef}
          id="journal-photo"
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={onFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onPickFiles}
        >
          Add photo
        </Button>
      </Field>

      {actionType === 'custom' && (
        <div className="sm:col-span-3">
          <Field
            label="Custom label"
            htmlFor="journal-custom"
            error={errors.customLabel?.message}
          >
            <Input
              id="journal-custom"
              type="text"
              placeholder="e.g. spotted aphids"
              {...register('customLabel')}
            />
          </Field>
        </div>
      )}

      <div className="sm:col-span-3">
        <Field label="Notes" htmlFor="journal-notes" error={errors.notes?.message}>
          <Textarea
            id="journal-notes"
            placeholder="What did you do or observe?"
            {...register('notes')}
          />
        </Field>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2 sm:col-span-3">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 rounded-full bg-cream pl-3 pr-1 py-1 text-xs text-ink"
            >
              <span className="max-w-[14ch] truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemoveFile(idx)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-hairline/60 hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.root && (
        <p className="text-sm text-red-700 sm:col-span-3">{errors.root.message}</p>
      )}

      <div className="flex items-center justify-end sm:col-span-3">
        <Button type="submit" disabled={isSubmitting || upload.isPending}>
          {isSubmitting || upload.isPending ? 'Saving…' : 'Add entry'}
        </Button>
      </div>
    </form>
  );
}
