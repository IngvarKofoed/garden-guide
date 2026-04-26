import { zodResolver } from '@hookform/resolvers/zod';
import {
  PlantCreateRequestSchema,
  type Plant,
  type PlantCreateRequest,
} from '@garden-guide/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Tag,
  Textarea,
} from '../../components/ui';
import { useZones } from '../zones/hooks';
import { useArchivePlant, useCreatePlant, usePlants, useUpdatePlant } from './hooks';

export function PlantsPage() {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [archivedView, setArchivedView] = useState<'false' | 'only'>('false');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Plant | null>(null);

  const zones = useZones();
  const plants = usePlants({
    q: search || undefined,
    zoneId: zoneFilter || undefined,
    archived: archivedView,
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Plants
          </h1>
          <p className="mt-2 text-sm text-muted">
            Every plant and tree in your garden.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New plant</Button>
      </header>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="search"
              className="text-xs font-medium uppercase tracking-wide text-muted"
            >
              Search
            </label>
            <Input
              id="search"
              placeholder="Name or species…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              Zone
            </label>
            <Select
              className="w-full"
              value={zoneFilter}
              onChange={setZoneFilter}
              options={[
                { value: '', label: 'All zones' },
                ...(zones.data ?? []).map((z) => ({ value: z.id, label: z.name })),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              Show
            </label>
            <Select
              className="w-full"
              value={archivedView}
              onChange={(v) => setArchivedView(v as 'false' | 'only')}
              options={[
                { value: 'false', label: 'Active' },
                { value: 'only', label: 'Archived' },
              ]}
            />
          </div>
        </div>
      </Card>

      {showCreate && (
        <PlantForm onClose={() => setShowCreate(false)} onSaved={() => setShowCreate(false)} />
      )}
      {editing && (
        <PlantForm
          plant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {plants.isLoading && <p className="text-sm text-muted">Loading plants…</p>}
      {plants.isError && <p className="text-sm text-red-700">Couldn't load plants.</p>}
      {plants.data && plants.data.length === 0 && (
        <EmptyState
          title={archivedView === 'only' ? 'No archived plants' : 'No plants yet'}
          description={
            archivedView === 'only'
              ? 'Plants you archive will show up here.'
              : 'Add your first plant to start tracking it.'
          }
          action={
            archivedView !== 'only' ? (
              <Button onClick={() => setShowCreate(true)}>Add a plant</Button>
            ) : undefined
          }
        />
      )}
      {plants.data && plants.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.data.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              zoneName={zones.data?.find((z) => z.id === plant.zoneId)?.name ?? null}
              onEdit={() => setEditing(plant)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlantCard({
  plant,
  zoneName,
  onEdit,
}: {
  plant: Plant;
  zoneName: string | null;
  onEdit: () => void;
}) {
  const archive = useArchivePlant();
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{plant.name}</h2>
          {plant.species && (
            <p className="mt-0.5 text-sm italic text-muted">{plant.species}</p>
          )}
        </div>
        {zoneName && <Tag tone="mint">{zoneName}</Tag>}
      </div>
      {plant.notes && (
        <p className="line-clamp-3 text-sm text-muted">{plant.notes}</p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-2">
        {plant.archivedAt ? (
          <Tag tone="ivory">Archived</Tag>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={archive.isPending}
              onClick={() => {
                if (confirm(`Archive "${plant.name}"? Its journal history is preserved.`)) {
                  archive.mutate(plant.id);
                }
              }}
            >
              Archive
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function PlantForm({
  plant,
  onClose,
  onSaved,
}: {
  plant?: Plant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = useCreatePlant();
  const update = useUpdatePlant();
  const zones = useZones();
  const editing = !!plant;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PlantCreateRequest>({
    resolver: zodResolver(PlantCreateRequestSchema),
    defaultValues: {
      name: plant?.name ?? '',
      species: plant?.species ?? '',
      zoneId: plant?.zoneId ?? null,
      notes: plant?.notes ?? '',
      hardinessZone: plant?.hardinessZone ?? '',
    },
  });

  const zoneValue = watch('zoneId') ?? '';

  const onSubmit = handleSubmit(async (values) => {
    try {
      const body: PlantCreateRequest = {
        ...values,
        species: values.species?.trim() || null,
        notes: values.notes?.trim() || null,
        hardinessZone: values.hardinessZone?.trim() || null,
        zoneId: values.zoneId || null,
      };
      if (editing && plant) {
        await update.mutateAsync({ id: plant.id, body });
      } else {
        await create.mutateAsync(body);
      }
      onSaved();
    } catch (err) {
      setError('root', { message: (err as Error).message });
    }
  });

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2" noValidate>
        <h2 className="text-xl font-semibold text-ink sm:col-span-2">
          {editing ? 'Edit plant' : 'New plant'}
        </h2>
        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" type="text" autoFocus {...register('name')} />
        </Field>
        <Field label="Species or cultivar" htmlFor="species" error={errors.species?.message}>
          <Input
            id="species"
            type="text"
            placeholder="e.g. Malus domestica"
            {...register('species')}
          />
        </Field>
        <Field label="Zone" htmlFor="zoneId">
          <Select
            id="zoneId"
            className="w-full"
            value={zoneValue}
            onChange={(v) => setValue('zoneId', v || null)}
            options={[
              { value: '', label: 'No zone' },
              ...(zones.data ?? []).map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        </Field>
        <Field
          label="Hardiness zone"
          htmlFor="hardinessZone"
          error={errors.hardinessZone?.message}
          hint="Override the garden default for microclimates."
        >
          <Input
            id="hardinessZone"
            type="text"
            placeholder="e.g. 7b"
            {...register('hardinessZone')}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" {...register('notes')} />
          </Field>
        </div>
        {errors.root && (
          <p className="text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>
        )}
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {editing ? 'Save changes' : 'Create plant'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
