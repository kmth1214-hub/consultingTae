const { isProductionEnvironment } = require('../leaderboard/principal');

const localProfiles = new Map();
const statusOf = error => error?.statusCode ?? error?.status;

function createMemoryPlayerProfileRepository(records = localProfiles) {
  return {
    async get(ownerKey) { return records.has(ownerKey) ? { ...records.get(ownerKey) } : null; },
    async unlockSnow(ownerKey) {
      const existing = records.get(ownerKey);
      if (existing?.snowAreaCleared) return { ...existing };
      const entity = { partitionKey: 'PLAYER', rowKey: ownerKey, version: 1,
        snowAreaCleared: true, updatedAt: new Date().toISOString() };
      records.set(ownerKey, entity);
      return { ...entity };
    }
  };
}

function createPlayerProfileRepository({ env = process.env, tableClientFactory } = {}) {
  const connectionString = env.LEADERBOARD_STORAGE_CONNECTION_STRING;
  if (typeof connectionString !== 'string' || !connectionString.trim()) {
    const localEnabled = !isProductionEnvironment(env) && env.NODE_ENV !== 'production'
      && env.LEADERBOARD_LOCAL_MODE === 'true'
      && typeof env.LEADERBOARD_LOCAL_USER_ID === 'string' && env.LEADERBOARD_LOCAL_USER_ID.trim()
      && typeof env.LEADERBOARD_LOCAL_DISPLAY_NAME === 'string' && env.LEADERBOARD_LOCAL_DISPLAY_NAME.trim();
    if (localEnabled) return createMemoryPlayerProfileRepository();
    const error = new Error('Player profile storage is not configured.');
    error.code = 'PLAYER_PROFILE_STORAGE_NOT_CONFIGURED';
    throw error;
  }
  const tableName = env.PLAYER_PROFILE_TABLE_NAME || 'PlayerProfiles';
  if (!/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName)) throw new TypeError('Invalid Azure Table name.');
  const createClient = tableClientFactory || (() => {
    const { TableClient } = require('@azure/data-tables');
    return TableClient.fromConnectionString(connectionString, tableName);
  });
  const client = createClient(connectionString, tableName);
  let tableReady;
  async function ensureTable() {
    if (!tableReady) tableReady = client.createTable().catch(error => {
      if (statusOf(error) !== 409) { tableReady = null; throw error; }
    });
    return tableReady;
  }
  async function get(ownerKey) {
    await ensureTable();
    try { return await client.getEntity('PLAYER', ownerKey); }
    catch (error) { if (statusOf(error) === 404) return null; throw error; }
  }
  async function unlockSnow(ownerKey) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await get(ownerKey);
      if (current?.snowAreaCleared === true) return current;
      const entity = { partitionKey: 'PLAYER', rowKey: ownerKey, version: 1,
        snowAreaCleared: true, updatedAt: new Date().toISOString() };
      try {
        if (current) await client.updateEntity(entity, 'Replace', {
          etag: current.etag, matchConditions: 'IfNotModified'
        });
        else await client.createEntity(entity);
        return entity;
      } catch (error) {
        if (![404, 409, 412].includes(statusOf(error))) throw error;
      }
    }
    const error = new Error('Player profile changed repeatedly during update.');
    error.code = 'PLAYER_PROFILE_CONFLICT';
    error.statusCode = 503;
    throw error;
  }
  return { get, unlockSnow };
}

module.exports = { createPlayerProfileRepository, createMemoryPlayerProfileRepository };
