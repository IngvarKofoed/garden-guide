import { zodResolver } from '@hookform/resolvers/zod';
import { ZoneCreateRequestSchema, type Zone, type ZoneCreateRequest } from '@garden-guide/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, EmptyState, Field, Input, Textarea } from '../../components/ui';
import { useCreateZone, useDeleteZone, useUpdateZone, useZones } from './hooks';

export function ZonesPage() {
  const zones = useZones();
  const [editing, setEditing] = useState<Zone | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Zones
          </h1>
          <p className="mt-2 text-sm text-muted">
            Areas of your garden — front bed, greenhouse, anywhere you want to group plants.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New zone</Button>
      </header>

      {showCreate && (
        <ZoneForm
          onClose={() => setShowCreate(false)}
          onSaved={() => setShowCreate(false)}
        />
      )}
      {editing && (
        <ZoneForm
          zone={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {zones.isLoading && <p className="text-sm text-muted">Loading zones…</p>}
      {zones.isError && <p className="text-sm text-red-700">Couldn't load zones.</p>}
      {zones.data && zones.data.length === 0 && (
        <EmptyState
          title="No zones yet"
          description="Create your first zone to start organising your garden."
          action={<Button onClick={() => setShowCreate(true)}>Create a zone</Button>}
        />
      )}
      {zones.data && zones.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.data.map((zone) => (
            <ZoneCard key={zone.id} zone={zone} onEdit={() => setEditing(zone)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneCard({ zone, onEdit }: { zone: Zone; onEdit: () => void }) {
  const remove = useDeleteZone();
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">{zone.name}</h2>
        {zone.description && (
          <p className="mt-1.5 text-sm text-muted">{zone.description}</p>
        )}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={() => {
            if (
              confirm(`Delete zone "${zone.name}"? Plants in this zone will become unassigned.`)
            ) {
              remove.mutate(zone.id);
            }
          }}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function ZoneForm({
  zone,
  onClose,
  onSaved,
}: {
  zone?: Zone;
  onClose: () => void;
  onSaved: () => void;
}) {
  const create = useCreateZone();
  const update = useUpdateZone();
  const editing = !!zone;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ZoneCreateRequest>({
    resolver: zodResolver(ZoneCreateRequestSchema),
    defaultValues: { name: zone?.name ?? '', description: zone?.description ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editing && zone) {
        await update.mutateAsync({ id: zone.id, body: values });
      } else {
        await create.mutateAsync(values);
      }
      onSaved();
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
