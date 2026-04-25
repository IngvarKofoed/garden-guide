import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../lib/api';

export function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Garden Guide</h1>
      <p className="mt-3 text-stone-600 dark:text-stone-400">
        Your private guide for your garden.
      </p>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Server status
        </h2>
        <p className="mt-2 text-lg">
          {isLoading && 'Checking…'}
          {isError && <span className="text-red-600">Backend unreachable</span>}
          {data && (
            <span>
              <span className="font-medium">{data.status}</span>
              <span className="ml-2 text-stone-500">v{data.version}</span>
            </span>
          )}
        </p>
      </section>
    </main>
  );
}
