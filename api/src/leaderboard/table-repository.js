function statusOf(error) {
  return error?.statusCode ?? error?.status;
}

function createTableRepository({ connectionString, tableName = 'LeaderboardRecords', tableClientFactory } = {}) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) {
    const error = new Error('Leaderboard storage is not configured.');
    error.code = 'LEADERBOARD_STORAGE_NOT_CONFIGURED';
    throw error;
  }
  if (!/^[A-Za-z][A-Za-z0-9]{2,62}$/.test(tableName)) throw new TypeError('Invalid Azure Table name.');
  const createClient = tableClientFactory || (() => {
    const { TableClient } = require('@azure/data-tables');
    return TableClient.fromConnectionString(connectionString, tableName);
  });
  const client = createClient(connectionString, tableName);
  let tableReady;
  async function ensureTable() {
    if (!tableReady) tableReady = client.createTable().catch(error => {
      if (statusOf(error) !== 409) {
        tableReady = null;
        throw error;
      }
    });
    return tableReady;
  }
  return {
    async get(ownerKey) {
      await ensureTable();
      try {
        const entity = await client.getEntity('GLOBAL', ownerKey);
        return { ...entity, partitionKey: 'GLOBAL', rowKey: ownerKey };
      } catch (error) {
        if (statusOf(error) === 404) return null;
        throw error;
      }
    },
    async listAll() {
      await ensureTable();
      const records = [];
      for await (const entity of client.listEntities({ queryOptions: { filter: "PartitionKey eq 'GLOBAL'" } })) records.push(entity);
      return records;
    },
    async insert(entity) {
      await ensureTable();
      await client.createEntity(entity);
      return entity;
    },
    async replace(entity, etag) {
      await ensureTable();
      await client.updateEntity(entity, 'Replace', { etag, matchConditions: 'IfNotModified' });
      return entity;
    }
  };
}

module.exports = { createTableRepository, statusOf };
