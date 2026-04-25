import { expect, test } from '@playwright/test';

test('healthz returns ok', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { status: string };
  expect(body.status).toBe('ok');
});

test('@mobile home page renders on phone viewport', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Garden Guide' })).toBeVisible();
});
