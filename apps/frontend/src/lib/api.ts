import {
  type ApiError,
  type Health,
  type InviteCreateResponse,
  type Plant,
  type PlantCreateRequest,
  type PlantUpdateRequest,
  type User,
  type Zone,
  type ZoneCreateRequest,
  type ZoneUpdateRequest,
} from '@garden-guide/shared';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const err = (payload as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? `${res.status} ${res.statusText}`,
      err?.details,
    );
  }

  return payload as T;
}

// --- Health ---

export function getHealth(): Promise<Health> {
  return request<Health>('/healthz');
}

// --- Auth ---

export function getMe(): Promise<User> {
  return request<User>('/api/v1/auth/me');
}

export function login(email: string, password: string): Promise<User> {
  return request<User>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function logout(): Promise<void> {
  return request<void>('/api/v1/auth/logout', { method: 'POST' });
}

export interface RegisterInput {
  inviteToken: string;
  email: string;
  displayName: string;
  password: string;
}
export function registerAccount(input: RegisterInput): Promise<User> {
  return request<User>('/api/v1/auth/register', {
    method: 'POST',
    body: input,
  });
}

// --- Invites ---

export function createInvite(opts?: { email?: string }): Promise<InviteCreateResponse> {
  return request<InviteCreateResponse>('/api/v1/invites', {
    method: 'POST',
    body: { email: opts?.email ?? null },
  });
}

// --- Zones ---

export function listZones(): Promise<Zone[]> {
  return request<Zone[]>('/api/v1/zones');
}

export function createZone(body: ZoneCreateRequest): Promise<Zone> {
  return request<Zone>('/api/v1/zones', { method: 'POST', body });
}

export function updateZone(id: string, body: ZoneUpdateRequest): Promise<Zone> {
  return request<Zone>(`/api/v1/zones/${id}`, { method: 'PATCH', body });
}

export function deleteZone(id: string): Promise<void> {
  return request<void>(`/api/v1/zones/${id}`, { method: 'DELETE' });
}

// --- Plants ---

export interface PlantListOptions {
  zoneId?: string;
  q?: string;
  archived?: 'true' | 'false' | 'only';
}

export function listPlants(opts: PlantListOptions = {}): Promise<Plant[]> {
  const params = new URLSearchParams();
  if (opts.zoneId) params.set('zoneId', opts.zoneId);
  if (opts.q) params.set('q', opts.q);
  if (opts.archived) params.set('archived', opts.archived);
  const qs = params.toString();
  return request<Plant[]>(`/api/v1/plants${qs ? `?${qs}` : ''}`);
}

export function createPlant(body: PlantCreateRequest): Promise<Plant> {
  return request<Plant>('/api/v1/plants', { method: 'POST', body });
}

export function updatePlant(id: string, body: PlantUpdateRequest): Promise<Plant> {
  return request<Plant>(`/api/v1/plants/${id}`, { method: 'PATCH', body });
}

export function archivePlant(id: string): Promise<void> {
  return request<void>(`/api/v1/plants/${id}`, { method: 'DELETE' });
}
