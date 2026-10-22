const test = require('node:test');
const assert = require('node:assert/strict');
const { createRepository } = require('../../api/src/leaderboard/repository-factory');
const { createTableRepository } = require('../../api/src/leaderboard/table-repository');

test('repository factory selects Table when configured and fails closed when production storage is absent', () => {
  let argumentsSeen;
  const repository = createRepository({ env: { LEADERBOARD_STORAGE_CONNECTION_STRING: 'secret', LEADERBOARD_TABLE_NAME: 'Records01' },
    tableClientFactory: (...args) => { argumentsSeen = args; return { createTable() {}, getEntity() {}, listEntities() {}, createEntity() {}, updateEntity() {} }; } });
  assert.ok(repository);
  assert.deepEqual(argumentsSeen, ['secret', 'Records01']);
  assert.throws(() => createRepository({ env: { NODE_ENV: 'production', LEADERBOARD_LOCAL_MODE: 'true',
    LEADERBOARD_LOCAL_USER_ID: 'x', LEADERBOARD_LOCAL_DISPLAY_NAME: 'x' } }), { code: 'LEADERBOARD_STORAGE_NOT_CONFIGURED' });
  assert.throws(() => createRepository({ env: { WEBSITE_HOSTNAME: 'example.azurestaticapps.net', LEADERBOARD_LOCAL_MODE: 'true',
    LEADERBOARD_LOCAL_USER_ID: 'x', LEADERBOARD_LOCAL_DISPLAY_NAME: 'x' } }), { code: 'LEADERBOARD_STORAGE_NOT_CONFIGURED' });
  assert.ok(createRepository({ env: { NODE_ENV: 'development', LEADERBOARD_LOCAL_MODE: 'true',
    LEADERBOARD_LOCAL_USER_ID: 'local', LEADERBOARD_LOCAL_DISPLAY_NAME: 'Tester' } }));
});

test('Table repository creates the table idempotently and uses conditional ETag updates', async () => {
  const calls = [];
  const client = {
    async createTable() { calls.push(['createTable']); const error = new Error(); error.statusCode = 409; throw error; },
    async getEntity(partition, row) { calls.push(['getEntity', partition, row]); return { partitionKey: partition, rowKey: row, etag: 'tag-1', score: 2 }; },
    async *listEntities(options) { calls.push(['listEntities', options]); yield { rowKey: 'a' }; yield { rowKey: 'b' }; },
    async createEntity(entity) { calls.push(['createEntity', entity]); },
    async updateEntity(entity, mode, options) { calls.push(['updateEntity', entity, mode, options]); }
  };
  const repository = createTableRepository({ connectionString: 'not-logged', tableName: 'Records01', tableClientFactory: () => client });
  const found = await repository.get('owner');
  assert.equal(found.score, 2);
  const rows = await repository.listAll();
  assert.equal(rows.length, 2);
  await repository.insert({ partitionKey: 'GLOBAL', rowKey: 'new' });
  await repository.replace({ partitionKey: 'GLOBAL', rowKey: 'owner', score: 3 }, 'tag-1');
  assert.deepEqual(calls.at(-1), ['updateEntity', { partitionKey: 'GLOBAL', rowKey: 'owner', score: 3 }, 'Replace',
    { etag: 'tag-1', matchConditions: 'IfNotModified' }]);
});

test('Table repository maps missing entities to null and validates connection/table configuration', async () => {
  const notFound = new Error(); notFound.statusCode = 404;
  const repository = createTableRepository({ connectionString: 'secret', tableClientFactory: () => ({
    async createTable() {}, async getEntity() { throw notFound; }
  }) });
  assert.equal(await repository.get('absent'), null);
  assert.throws(() => createTableRepository({ connectionString: '' }), { code: 'LEADERBOARD_STORAGE_NOT_CONFIGURED' });
  assert.throws(() => createTableRepository({ connectionString: 'secret', tableName: 'a' }), /Invalid Azure Table name/);
});
