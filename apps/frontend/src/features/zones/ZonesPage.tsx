import { useEffect, useState } from 'react';
import type { Zone } from '@garden-guide/shared';
import { Button, Card, EmptyState } from '../../components/ui';
import { MapEditor } from '../map/MapEditor';
import { cellsAreEmpty, decodeCells } from '../map/cells';
import { useMap } from '../map/hooks';
import { useDeleteZone, useZones } from './hooks';
import { ZONE_PALETTE } from './palette';
import { Swatch } from './Swatch';
import { ZoneForm } from './ZoneForm';

type View = 'map' | 'list';

export function ZonesPage() {
  const zones = useZones();
  const map = useMap();
  const [editing, setEditing] = useState<Zone | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<View | null>(null);

  // Default the view from server state once: map if any cells are painted, else list.
  useEffect(() => {
    if (view !== null || !map.data) return;
    const cells = decodeCells(map.data.cells, map.data.width * map.data.height);
    setView(cellsAreEmpty(cells) ? 'list' : 'map');
  }, [map.data, view]);

  const activeView: View = view ?? 'list';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Zones
          </h1>
          <p className="mt-2 text-sm text-muted">
            Areas of your garden — front bed, greenhouse, anywhere you want to group plants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={activeView} onChange={setView} />
          <Button onClick={() => setShowCreate(true)}>New zone</Button>
        </div>
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

      {activeView === 'map' ? (
        <MapView mapLoading={map.isLoading} mapData={map.data} onSwitchToList={() => setView('list')} />
      ) : (
        <ListView
          loading={zones.isLoading}
          error={zones.isError}
          zones={zones.data ?? []}
          onEdit={(z) => setEditing(z)}
          onCreate={() => setShowCreate(true)}
        />
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const opts: { value: View; label: string }[] = [
    { value: 'map', label: 'Map' },
    { value: 'list', label: 'List' },
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

function MapView({
  mapLoading,
  mapData,
  onSwitchToList,
}: {
  mapLoading: boolean;
  mapData: ReturnType<typeof useMap>['data'];
  onSwitchToList: () => void;
}) {
  if (mapLoading || !mapData) {
    return <p className="text-sm text-muted">Loading map…</p>;
  }
  return <MapEditor map={mapData} onSwitchToList={onSwitchToList} />;
}

function ListView({
  loading,
  error,
  zones,
  onEdit,
  onCreate,
}: {
  loading: boolean;
  error: boolean;
  zones: Zone[];
  onEdit: (z: Zone) => void;
  onCreate: () => void;
}) {
  if (loading) return <p className="text-sm text-muted">Loading zones…</p>;
  if (error) return <p className="text-sm text-red-700">Couldn't load zones.</p>;
  if (zones.length === 0) {
    return (
      <EmptyState
        title="No zones yet"
        description="Create your first zone to start organising your garden."
        action={<Button onClick={onCreate}>Create a zone</Button>}
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {zones.map((zone) => (
        <ZoneCard key={zone.id} zone={zone} onEdit={() => onEdit(zone)} />
      ))}
    </div>
  );
}

function ZoneCard({ zone, onEdit }: { zone: Zone; onEdit: () => void }) {
  const remove = useDeleteZone();
  const palette = ZONE_PALETTE[zone.colorToken];
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <Swatch token={zone.colorToken} size={28} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink">{zone.name}</h2>
          <p className="text-xs uppercase tracking-wide text-muted">
            {zone.kind === 'structure' ? 'Structure' : 'Area'} · {palette.label}
          </p>
          {zone.description && (
            <p className="mt-1.5 text-sm text-muted">{zone.description}</p>
          )}
        </div>
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
