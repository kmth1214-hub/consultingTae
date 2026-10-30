const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlayerProfileHandlers } = require('../../api/src/profile/handlers');
const { createMemoryPlayerProfileRepository } = require('../../api/src/profile/repository');
const { stableOwnerKey } = require('../../api/src/leaderboard/principal');

const production = Object.freeze({ NODE_ENV: 'production', LEADERBOARD_STORAGE_CONNECTION_STRING: 'connection' });
function requestFor(userId, overrides = {}) {
  const principal = { userId, userDetails: 'Player', identityProvider: 'aad',
    userRoles: ['anonymous', 'authenticated'], ...overrides };
  return { headers: { 'x-ms-client-principal': Buffer.from(JSON.stringify(principal)).toString('base64') } };
}

test('authenticated accounts see only their own Snow unlock; body cannot choose owner', async () => {
  const records = new Map();
  const handlers = createPlayerProfileHandlers({ env: production,
    repositoryFactory: () => createMemoryPlayerProfileRepository(records) });
  const alice = requestFor('alice'), bob = requestFor('bob');
  assert.deepEqual((await handlers.get(alice)).jsonBody, { version: 1, snowAreaCleared: false });
  const unlocked = await handlers.unlockSnow({ ...alice, json: async () => ({ userId: 'bob', snowAreaCleared: false }) });
  assert.equal(unlocked.status, 200);
  assert.deepEqual(unlocked.jsonBody, { version: 1, snowAreaCleared: true });
  assert.deepEqual((await handlers.get(alice)).jsonBody, unlocked.jsonBody);
  assert.deepEqual((await handlers.get(bob)).jsonBody, { version: 1, snowAreaCleared: false });
  assert.equal(records.has(stableOwnerKey('alice')), true);
  assert.equal(records.has('alice'), false);
});

test('anonymous or non-Entra caller is rejected before storage access', async () => {
  let calls = 0;
  const handlers = createPlayerProfileHandlers({ env: production, repositoryFactory: () => { calls++; throw Error('unexpected'); } });
  for (const request of [{ headers: {} }, requestFor('a', { identityProvider: 'github' }),
    requestFor('a', { userRoles: ['anonymous'] }), { headers: { 'x-ms-client-principal': 'broken' } }]) {
    assert.equal((await handlers.get(request)).status, 401);
    assert.equal((await handlers.unlockSnow(request)).status, 401);
  }
  assert.equal(calls, 0);
});

test('missing storage and transport errors return 503 without exposing connection details', async () => {
  const logs = [];
  const request = requestFor('alice');
  const missing = createPlayerProfileHandlers({ env: production, logger: { error: (...args) => logs.push(args) } });
  assert.equal((await missing.get(request)).status, 503);
  const failed = createPlayerProfileHandlers({ env: production,
    repositoryFactory: () => ({ get: async () => { throw Error('secret-connection'); } }),
    logger: { error: (...args) => logs.push(args) } });
  const result = await failed.get(request);
  assert.equal(result.status, 503);
  assert.equal(JSON.stringify(result).includes('secret-connection'), false);
  assert.equal(JSON.stringify(logs).includes('secret-connection'), false);
});

test('repeated and concurrent unlock requests remain true', async () => {
  const repository = createMemoryPlayerProfileRepository(new Map());
  const handlers = createPlayerProfileHandlers({ env: production, repositoryFactory: () => repository });
  const request = requestFor('same');
  const results = await Promise.all([handlers.unlockSnow(request), handlers.unlockSnow(request)]);
  assert.deepEqual(results.map(result => result.jsonBody.snowAreaCleared), [true, true]);
  assert.equal((await handlers.get(request)).jsonBody.snowAreaCleared, true);
});
