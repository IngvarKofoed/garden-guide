import { Link } from 'react-router-dom';
import { useMe } from '../lib/auth';
import { usePlants } from '../features/plants/hooks';
import { useZones } from '../features/zones/hooks';

export function Home() {
  const me = useMe();
  const zones = useZones();
  const activePlants = usePlants({ archived: 'false' });

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-sm text-muted">Welcome back</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Hello, {me.data?.displayName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted">
          Your private guide for your garden.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          to="/zones"
          label="Zones"
          value={zones.data?.length ?? '—'}
          description="Areas of the garden you've named."
        />
        <StatCard
          to="/plants"
          label="Plants"
          value={activePlants.data?.length ?? '—'}
          description="Active plants and trees."
        />
      </div>
    </div>
  );
}

function StatCard({
  to,
  label,
  value,
  description,
}: {
  to: string;
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-3xl bg-ivory p-6 shadow-card transition-colors duration-200 ease-leaf hover:bg-mint"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-3 text-5xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </Link>
  );
}
