const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePrincipal, stableOwnerKey } = require('../../api/src/leaderboard/principal');
const { validateSubmission } = require('../../api/src/leaderboard/validation');
const { createLeaderboardHandlers } = require('../../api/src/leaderboard/handlers');
const { createLeaderboardService } = require('../../api/src/leaderboard/service');
const { createMemoryRepository } = require('../../api/src/leaderboard/memory-repository');

const valid = Object.freeze({ score: 220, cookieId: 'adventurer', furthestArea: 'forest', round: 2, durationMs: 12000 });
const envLocal = Object.freeze({ NODE_ENV: 'development', LEADERBOARD_LOCAL_MODE: 'true',
  LEADERBOARD_LOCAL_USER_ID: 'local-1', LEADERBOARD_LOCAL_DISPLAY_NAME: 'Local Player' });
function principalHeader(overrides = {}) {
  const principal = { userId: 'entra-opaque-id', userDetails: 'Cookie Player', identityProvider: 'aad', userRoles: ['anonymous', 'authenticated'], ...overrides };
  return Buffer.from(JSON.stringify(principal)).toString('base64');
}
const principal = { userId: 'entra-opaque-id', displayName: 'Cookie Player' };

test('SWA principal accepts only authenticated Entra identities and never trusts body identity', () => {
  assert.deepEqual(resolvePrincipal({ 'x-ms-client-principal': principalHeader() }), principal);
  assert.equal(resolvePrincipal({ 'X-MS-CLIENT-PRINCIPAL': principalHeader({ userRoles: ['anonymous'] }) }), null);
  assert.equal(resolvePrincipal({ 'x-ms-client-principal': principalHeader({ identityProvider: 'github' }) }), null);
  assert.equal(resolvePrincipal({ 'x-ms-client-principal': principalHeader({ userDetails: 'player@company.example' }) }), null);
  assert.equal(resolvePrincipal({ 'x-ms-client-principal': 'not base64 json' }), null);
  assert.equal(resolvePrincipal({}, { ...envLocal, WEBSITE_SITE_NAME: 'production-app' }), null);
  assert.equal(resolvePrincipal({}, { ...envLocal, NODE_ENV: 'production' }), null);
  assert.deepEqual(resolvePrincipal({}, envLocal), { userId: 'local-1', displayName: 'Local Player' });
  assert.match(stableOwnerKey(principal.userId), /^[a-f\d]{64}$/);
  assert.notEqual(stableOwnerKey(principal.userId), principal.userId);
});

test('submission validation accepts only main-run data within safe bounds', () => {
  assert.deepEqual(validateSubmission(valid), { ok: true, value: valid });
  for (const round of [1, 3]) assert.equal(validateSubmission({ ...valid, round }).ok, true);
  for (const value of [null, [], { ...valid, email: 'user@example.com' }, { ...valid, userId: 'client' },
    { ...valid, score: -1 }, { ...valid, score: 1_000_001 }, { ...valid, score: 1.5 },
    { ...valid, cookieId: 'unknown' }, { ...valid, furthestArea: 'chaos' },
    ...[0, 4, 5, 1.5].map(round => ({ ...valid, round })),
    { ...valid, durationMs: -1 }, { ...valid, durationMs: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(validateSubmission(value).ok, false, JSON.stringify(value));
  }
});

test('GET and POST fail closed without identity or production storage and never expose server errors', async () => {
  const productionEnv = { NODE_ENV: 'production' };
  const handlers = createLeaderboardHandlers({ env: productionEnv, logger: { error() {} } });
  const anonymous = await handlers.get({ headers: new Headers() });
  assert.equal(anonymous.status, 401);
  assert.deepEqual(anonymous.jsonBody, { error: 'Sign in with an authorized company account to use the leaderboard.' });
  assert.equal((await handlers.get({ headers: new Headers({ 'x-ms-client-principal': principalHeader() }) })).status, 503);

  const localHandlers = createLeaderboardHandlers({ env: envLocal });
  const localPost = await localHandlers.post({ headers: new Headers(), json: async () => valid });
  assert.equal(localPost.status, 200);
  assert.equal(localPost.jsonBody.record.score, valid.score);
  assert.equal((await localHandlers.post({ headers: new Headers({ 'x-ms-client-principal': principalHeader() }), json: async () => { throw new SyntaxError(); } })).status, 400);
  const bad = await localHandlers.post({ headers: new Headers({ 'x-ms-client-principal': principalHeader() }), json: async () => ({ ...valid, userId: 'forged' }) });
  assert.equal(bad.status, 400);
});

test('HTTP handlers expose only public board fields and ignore client identity fields', async () => {
  const repository = createMemoryRepository();
  const handlers = createLeaderboardHandlers({ env: envLocal, repositoryFactory: () => repository, now: () => new Date('2026-10-22T00:00:00.000Z') });
  const headers = new Headers({ 'x-ms-client-principal': principalHeader() });
  const posted = await handlers.post({ headers, json: async () => valid });
  assert.equal(posted.status, 200);
  assert.equal(posted.jsonBody.saved, true);
  assert.deepEqual(posted.jsonBody.record, { rank: 1, cookieId: 'adventurer', score: 220 });
  const get = await handlers.get({ headers });
  assert.equal(get.status, 200);
  assert.deepEqual(get.jsonBody, { entries: [{ rank: 1, displayName: 'Cookie Player', cookieId: 'adventurer', score: 220 }], personalBest: null });
  assert.doesNotMatch(JSON.stringify(get.jsonBody), /durationMs|furthestArea|rowKey|email|userId|round/);
  assert.equal(get.headers['cache-control'], 'no-store');
});

test('leaderboard keeps one strict personal best and ranks score, round, duration, then stable owner key', async () => {
  const repository = createMemoryRepository();
  const service = createLeaderboardService({ repository, now: () => new Date('2026-10-22T00:00:00.000Z') });
  const users = Array.from({ length: 12 }, (_, index) => ({ userId: `user-${index}`, displayName: `Player ${index}` }));
  for (let index = 0; index < users.length; index++) {
    const submission = { ...valid, score: 300 - index * 10, round: 2, durationMs: 8000 + index };
    await service.submit({ principal: users[index], submission });
  }
  const equalScoreBetterRound = { ...valid, score: 300, round: 3, durationMs: 9000 };
  await service.submit({ principal: users[1], submission: equalScoreBetterRound });
  await service.submit({ principal: users[11], submission: { ...valid, score: 1, durationMs: 1 } });
  const board = await service.getBoard(users[11]);
  assert.equal(board.entries.length, 10);
  assert.equal(board.entries[0].displayName, 'Player 1');
  assert.equal(board.entries[0].score, 300);
  assert.deepEqual(board.personalBest, { rank: 12, cookieId: 'adventurer', score: 190 });
  assert.equal(Object.hasOwn(board.entries[0], 'round'), false);
  assert.equal(Object.hasOwn(board.entries[0], 'durationMs'), false);
  const stored = await repository.get(stableOwnerKey('user-11'));
  assert.equal(stored.score, 190);
  assert.equal(Object.hasOwn(stored, 'userId'), false);
  assert.equal(Object.hasOwn(stored, 'email'), false);
});

test('concurrent submissions cannot downgrade a best record', async () => {
  const repository = createMemoryRepository();
  const service = createLeaderboardService({ repository });
  await Promise.all([
    service.submit({ principal, submission: { ...valid, score: 100 } }),
    service.submit({ principal, submission: { ...valid, score: 500 } })
  ]);
  const stored = await repository.get(stableOwnerKey(principal.userId));
  assert.equal(stored.score, 500);
});
