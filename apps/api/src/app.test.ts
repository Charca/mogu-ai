import { expect, it } from 'vitest';
import { createApp } from './app';

it('exposes public health and no user, diary, or AI-key write endpoints', async () => {
  const app = createApp();
  const health = await app.request('/health');
  expect(health.status).toBe(200);
  expect((await health.json()).status).toBe('ok');
  for (const path of ['/users', '/meals', '/api/gemini']) {
    const response = await app.request(path, { method: 'POST', body: '{"key":"test-secret"}' });
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).not.toContain('test-secret');
    expect(JSON.parse(body).requestId).toBeTruthy();
  }
});
