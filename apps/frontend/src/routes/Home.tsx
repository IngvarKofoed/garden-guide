import { Link } from 'react-router-dom';
import { Card } from '../components/ui';
import { useMe } from '../lib/auth';
import { usePlants } from '../features/plants/hooks';
import { useZones } from '../features/zones/hooks';

export function Home() {
  const me = useMe();
  const zones = useZones();
  const activePlants = usePlants({ archived: 'false' });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">
          Hello, {me.data?.displayName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Your private guide for your garden.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/zones">
          <StatCard
            label="Zones"
            value={zones.data?.length ?? '—'}
            description="Areas of the garden you've named."
          />
        </Link>
        <Link to="/plants">
          <StatCard
            label="Plants"
            value={activePlants.data?.length ?? '—'}
            description="Active plants and trees."
          />
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <Card className="p-6 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </Card>
  );
}
