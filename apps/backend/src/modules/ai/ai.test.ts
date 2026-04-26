import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  CarePlanResponse,
  IdentifyPlantResponse,
  PlantDescriptionResponse,
  PlantIconResponse,
  RefineCarePlanResponse,
} from '@garden-guide/shared';
import { buildTestApp, sessionCookieFromResponse, type TestApp } from '../../test-utils.js';
import { ensureBootstrapInvite } from '../auth/service.js';
import type {
  CarePlanProviderInput,
  IdentifyPlantProviderInput,
  LLMProvider,
  PlantDescriptionProviderInput,
  PlantIconProviderInput,
  RefineCarePlanProviderInput,
} from './provider.js';

interface FakeProviderCalls {
  identify: IdentifyPlantProviderInput[];
  carePlan: CarePlanProviderInput[];
  refine: RefineCarePlanProviderInput[];
  describe: PlantDescriptionProviderInput[];
  icon: PlantIconProviderInput[];
}

function buildFakeProvider(opts: {
  identify?: IdentifyPlantResponse;
  carePlan?: CarePlanResponse;
  refine?: RefineCarePlanResponse;
  describe?: PlantDescriptionResponse;
  icon?: PlantIconResponse;
  fail?: 'identify' | 'carePlan' | 'refine' | 'describe' | 'icon';
}): { provider: LLMProvider; calls: FakeProviderCalls } {
  const calls: FakeProviderCalls = {
    identify: [],
    carePlan: [],
    refine: [],
    describe: [],
    icon: [],
  };
  const provider: LLMProvider = {
    info: { name: 'openai', model: 'fake' },
    async identifyPlant(input) {
      calls.identify.push(input);
      if (opts.fail === 'identify') throw new Error('boom');
      if (!opts.identify) throw new Error('no canned identify response');
      return opts.identify;
    },
    async generateCarePlan(input) {
      calls.carePlan.push(input);
      if (opts.fail === 'carePlan') throw new Error('boom');
      if (!opts.carePlan) throw new Error('no canned care-plan response');
      return opts.carePlan;
    },
    async refineCarePlan(input) {
      calls.refine.push(input);
      if (opts.fail === 'refine') throw new Error('boom');
      if (!opts.refine) throw new Error('no canned refine response');
      return opts.refine;
    },
    async describePlant(input) {
      calls.describe.push(input);
      if (opts.fail === 'describe') throw new Error('boom');
      if (!opts.describe) throw new Error('no canned describe response');
      return opts.describe;
    },
    async generatePlantIcon(input) {
      calls.icon.push(input);
      if (opts.fail === 'icon') throw new Error('boom');
      if (!opts.icon) throw new Error('no canned icon response');
      return opts.icon;
    },
  };
  return { provider, calls };
}

async function registerUser(t: TestApp): Promise<string> {
  const bootstrap = await ensureBootstrapInvite(t.db, 24);
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      inviteToken: bootstrap!.token,
      email: 'gardener@example.com',
      displayName: 'Gardener',
      password: 'password1234',
    },
  });
  const cookie = sessionCookieFromResponse(res.headers);
  if (!cookie) throw new Error('no session cookie');
  return cookie;
}

async function createPlant(t: TestApp, cookie: string): Promise<string> {
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/v1/plants',
    headers: { cookie },
    payload: { name: 'Lavender', species: 'Lavandula angustifolia' },
  });
  expect(res.statusCode).toBe(201);
  return (res.json() as { id: string }).id;
}

describe('ai routes', () => {
  let t: TestApp;
  let cookie: string;

  afterEach(async () => {
    if (t) await t.close();
  });

  it('POST /api/v1/ai/identify-plant returns provider candidates', async () => {
    const canned: IdentifyPlantResponse = {
      candidates: [
        { commonName: 'Lavender', species: 'Lavandula angustifolia', confidence: 0.92, notes: 'Aromatic perennial.' },
      ],
    };
    const { provider, calls } = buildFakeProvider({ identify: canned });
    t = await buildTestApp({ llm: provider });
    cookie = await registerUser(t);

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify-plant',
      headers: { cookie },
      payload: { name: 'lavender' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(canned);
    expect(calls.identify).toHaveLength(1);
    expect(calls.identify[0]).toMatchObject({ name: 'lavender' });
  });

  it('POST /api/v1/ai/identify-plant requires name or photoId', async () => {
    const { provider } = buildFakeProvider({});
    t = await buildTestApp({ llm: provider });
    cookie = await registerUser(t);

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify-plant',
      headers: { cookie },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('POST /api/v1/ai/care-plan loads the plant and forwards it to the provider', async () => {
    const canned: CarePlanResponse = {
      tasks: [
        {
          kind: 'recurring',
          actionType: 'prune',
          customLabel: null,
          recurStartSlot: '03-1',
          recurEndSlot: '03-3',
          rationale: 'Late-winter prune triggers fresh growth.',
        },
      ],
    };
    const { provider, calls } = buildFakeProvider({ carePlan: canned });
    t = await buildTestApp({ llm: provider });
    cookie = await registerUser(t);
    const plantId = await createPlant(t, cookie);

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/care-plan',
      headers: { cookie },
      payload: { plantId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(canned);
    expect(calls.carePlan).toHaveLength(1);
    expect(calls.carePlan[0]).toMatchObject({
      commonName: 'Lavender',
      species: 'Lavandula angustifolia',
    });
  });

  it('POST /api/v1/ai/care-plan returns 404 for an unknown plant', async () => {
    const { provider } = buildFakeProvider({});
    t = await buildTestApp({ llm: provider });
    cookie = await registerUser(t);

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/care-plan',
      headers: { cookie },
      payload: { plantId: '01HQ0000000000000000000000' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('POST /api/v1/ai/plant-description forwards plant context and returns text', async () => {
    const canned: PlantDescriptionResponse = {
      description: 'Lavender is a fragrant Mediterranean perennial with silver foliage and purple spikes that thrives in dry, well-drained soil.',
    };
    const { provider, calls } = buildFakeProvider({ describe: canned });
    t = await buildTestApp({ llm: provider });
    cookie = await registerUser(t);
    const plantId = await createPlant(t, cookie);

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/plant-description',
      headers: { cookie },
      payload: { plantId },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(canned);
    expect(calls.describe).toHaveLength(1);
    expect(calls.describe[0]).toMatchObject({
      commonName: 'Lavender',
      species: 'Lavandula angustifolia',
    });
  });

  it('AI endpoints require authentication', async () => {
    const { provider } = buildFakeProvider({});
    t = await buildTestApp({ llm: provider });

    const res = await t.app.inject({
      method: 'POST',
      url: '/api/v1/ai/care-plan',
      payload: { plantId: '01HQ0000000000000000000000' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('ai routes — defaults', () => {
  it('test harness uses a throwing fake unless overridden', async () => {
    const harness = await buildTestApp();
    try {
      const bootstrap = await ensureBootstrapInvite(harness.db, 24);
      const reg = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          inviteToken: bootstrap!.token,
          email: 'a@example.com',
          displayName: 'A',
          password: 'password1234',
        },
      });
      const cookie = sessionCookieFromResponse(reg.headers)!;
      const res = await harness.app.inject({
        method: 'POST',
        url: '/api/v1/ai/identify-plant',
        headers: { cookie },
        payload: { name: 'something' },
      });
      expect(res.statusCode).toBe(500);
    } finally {
      await harness.close();
    }
  });
});
