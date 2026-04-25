import { HealthSchema, type Health } from '@garden-guide/shared';

async function request<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} from ${path}`);
  }
  const data: unknown = await res.json();
  return schema.parse(data);
}

export function getHealth(): Promise<Health> {
  return request('/healthz', HealthSchema);
}
