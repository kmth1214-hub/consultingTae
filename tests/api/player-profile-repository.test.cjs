const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlayerProfileRepository, createMemoryPlayerProfileRepository } = require('../../api/src/profile/repository');

function tableHarness() {
  const records = new Map();
  let revision = 0, tablesCreated = 0;
  const client = {
    async createTable() { tablesCreated++; },
    async getEntity(partitionKey, rowKey) {
      assert.equal(partitionKey, 'PLAYER');
      const record = records.get(rowKey);
      if (!record) throw { statusCode: 404 };
      return { ...record };
    },
    async createEntity(entity) {
      if (records.has(entity.rowKey)) throw { statusCode: 409 };
      records.set(entity.rowKey, { ...entity, etag: String(++revision) });
    },
    async updateEntity(entity, mode, options) {
      assert.equal(mode, 'Replace');
      assert.equal(options.matchConditions, 'IfNotModified');
      const current = records.get(entity.rowKey);
      if (!current || current.etag !== options.etag) throw { statusCode: 412 };
      records.set(entity.rowKey, { ...entity, etag: String(++revision) });
    }
  };
  return { client, records, get tablesCreated() { return tablesCreated; } };
}

test('Table profile is locked until one-way Snow unlock and never downgrades', async () => {
  const harness = tableHarness();
  const repository = createPlayerProfileRepository({
    env: { LEADERBOARD_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true' },
    tableClientFactory: (_, tableName) => { assert.equal(tableName, 'PlayerProfiles'); return harness.client; }
  });
  assert.equal(await repository.get('a'), null);
  assert.equal((await repository.unlockSnow('a')).snowAreaCleared, true);
  const first = await repository.get('a');
  assert.equal(first.partitionKey, 'PLAYER');
  assert.equal(first.version, 1);
  assert.match(first.updatedAt, /^\d{4}-\d\d-\d\dT/);
  assert.equal((await repository.unlockSnow('a')).snowAreaCleared, true);
  assert.equal(harness.records.size, 1);
  assert.equal(harness.tablesCreated, 1);
  assert.equal(await repository.get('b'), null);
});

test('concurrent unlocks converge on true and repair a legacy locked row', async () => {
  const harness = tableHarness();
  const repository = createPlayerProfileRepository({
    env: { LEADERBOARD_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true' },
    tableClientFactory: () => harness.client
  });
  const both = await Promise.all([repository.unlockSnow('same'), repository.unlockSnow('same')]);
  assert.deepEqual(both.map(profile => profile.snowAreaCleared), [true, true]);
  harness.records.set('old', { partitionKey: 'PLAYER', rowKey: 'old',
    version: 1, snowAreaCleared: false, etag: 'old-etag' });
  assert.equal((await repository.unlockSnow('old')).snowAreaCleared, true);
  assert.equal((await repository.get('old')).snowAreaCleared, true);
});

test('storage failures do not silently enable memory mode in production', async () => {
  assert.throws(() => createPlayerProfileRepository({
    env: { NODE_ENV: 'production', LEADERBOARD_LOCAL_MODE: 'true',
      LEADERBOARD_LOCAL_USER_ID: 'local', LEADERBOARD_LOCAL_DISPLAY_NAME: 'Local' }
  }), /not configured/);
  const harness = tableHarness();
  harness.client.createTable = async () => { throw { statusCode: 503 }; };
  const repository = createPlayerProfileRepository({
    env: { LEADERBOARD_STORAGE_CONNECTION_STRING: 'connection' },
    tableClientFactory: () => harness.client
  });
  await assert.rejects(repository.get('a'), error => error.statusCode === 503);
});

test('local memory repository keeps accounts separate', async () => {
  const repository = createMemoryPlayerProfileRepository(new Map());
  await repository.unlockSnow('a');
  assert.equal((await repository.get('a')).snowAreaCleared, true);
  assert.equal(await repository.get('b'), null);
});
