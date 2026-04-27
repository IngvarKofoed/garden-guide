import { zodResolver } from '@hookform/resolvers/zod';
import {
  ZoneCreateRequestSchema,
  type Zone,
  type ZoneCreateRequest,
  type ZoneKind,
} from '@garden-guide/shared';
import { useForm } from 'react-hook-form';
import { Button, Card, Field, Input, Textarea } from '../../components/ui';
import { ZONE_PALETTE, tokensForKind } from './palette';
import { Swatch } from './Swatch';
import { useCreateZone, useUpdateZone } from './hooks';

export function ZoneForm({
  zone,
  onClose,
  onSaved,
}: {
  zone?: Zone;
  onClose: () => void;
  onSaved: (zone: Zone) => void;
}) {
  const create = useCreateZone();
  const update = useUpdateZone();
  const editing = !!zone;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<ZoneCreateRequest>({
    resolver: zodResolver(ZoneCreateRequestSchema),
    defaultValues: {
      name: zone?.name ?? '',
      description: zone?.description ?? '',
      kind: zone?.kind ?? 'area',
      colorToken: zone?.colorToken,
    },
  });

  const kind = watch('kind') ?? 'area';
  const selectedColor = watch('colorToken');

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved =
        editing && zone
          ? await update.mutateAsync({ id: zone.id, body: values })
          : await create.mutateAsync(values);
      onSaved(saved);
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  });

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5 p-6" noValidate>
        <h2 className="text-xl font-semibold text-ink">
          {editing ? 'Edit zone' : 'New zone'}
        </h2>
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" type="text" autoFocus {...register('name')} />
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <Textarea id="description" {...register('description')} />
        </Field>

        <Field label="Kind">
          <KindToggle
            value={kind}
            onChange={(next) => {
              setValue('kind', next, { shouldDirty: true });
              if (selectedColor && !tokensForKind(next).includes(selectedColor)) {
                setValue('colorToken', undefined, { shouldDirty: true });
              }
            }}
          />
          <p className="mt-1 text-xs text-muted">
            {kind === 'structure'
              ? 'Built things — house, shed, greenhouse, paths.'
              : 'Planted areas — beds, lawns, vegetable patches.'}
          </p>
        </Field>

        <Field
          label="Color"
          error={errors.colorToken?.message}
          hint={editing ? undefined : 'Leave blank to pick automatically.'}
        >
          <div className="flex flex-wrap gap-2">
            {tokensForKind(kind).map((token) => (
              <Swatch
                key={token}
                token={token}
                size={36}
                selected={selectedColor === token}
                ariaLabel={ZONE_PALETTE[token].label}
                onClick={() =>
                  setValue('colorToken', selectedColor === token ? undefined : token, {
                    shouldDirty: true,
                  })
                }
              />
            ))}
          </div>
        </Field>

        {errors.root && <p className="text-sm text-red-700">{errors.root.message}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {editing ? 'Save changes' : 'Create zone'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: ZoneKind;
  onChange: (kind: ZoneKind) => void;
}) {
  const opts: { value: ZoneKind; label: string }[] = [
    { value: 'area', label: 'Area' },
    { value: 'structure', label: 'Structure' },
  ];
  return (
    <div className="inline-flex rounded-full border border-hairline bg-cream p-1">
      {opts.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              active ? 'bg-ink text-cream' : 'text-ink hover:bg-ivory'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
