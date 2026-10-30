import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerProfileClient } from '../src/game/playerProfileClient.js';

test('profile client reads and unlocks only server public DTO', async () => {
  const calls = [];
  const client = createPlayerProfileClient({ fetchImpl: async (path, init) => {
    calls.push({ path, init });
    return { ok: true, json: async () => ({ version: 1, snowAreaCleared: path.endsWith('snow-clear'), userId: 'hidden' }) };
  } });
  assert.deepEqual(await client.get(), { version: 1, snowAreaCleared: false });
  assert.deepEqual(await client.unlockSnow(), { version: 1, snowAreaCleared: true });
  assert.deepEqual(calls.map(call => [call.path, call.init.method]),
    [['/api/profile', 'GET'], ['/api/profile/snow-clear', 'POST']]);
  assert.ok(calls.every(call => call.init.credentials === 'same-origin' && call.init.cache === 'no-store'));
});

test('profile client rejects failed responses and malformed records', async () => {
  const failed = createPlayerProfileClient({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(failed.get(), /profile-http-503/);
  const malformed = createPlayerProfileClient({ fetchImpl: async () => ({ ok: true, json: async () => ({ snowAreaCleared: true }) }) });
  await assert.rejects(malformed.get(), /invalid-profile/);
});
