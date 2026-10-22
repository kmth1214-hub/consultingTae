const { createMemoryRepository } = require('./memory-repository');
const { createTableRepository } = require('./table-repository');
const { isProductionEnvironment } = require('./principal');

const localStore = new Map();

function createRepository({ env = process.env, tableClientFactory } = {}) {
  const connectionString = env.LEADERBOARD_STORAGE_CONNECTION_STRING;
  if (typeof connectionString === 'string' && connectionString.trim()) {
    return createTableRepository({
      connectionString,
      tableName: env.LEADERBOARD_TABLE_NAME || 'LeaderboardRecords',
      tableClientFactory
    });
  }
  const localEnabled = !isProductionEnvironment(env)
    && env.NODE_ENV !== 'production'
    && env.LEADERBOARD_LOCAL_MODE === 'true'
    && typeof env.LEADERBOARD_LOCAL_USER_ID === 'string'
    && env.LEADERBOARD_LOCAL_USER_ID.trim().length > 0
    && typeof env.LEADERBOARD_LOCAL_DISPLAY_NAME === 'string'
    && env.LEADERBOARD_LOCAL_DISPLAY_NAME.trim().length > 0;
  if (localEnabled) return createMemoryRepository(localStore);
  const error = new Error('Leaderboard storage is not configured.');
  error.code = 'LEADERBOARD_STORAGE_NOT_CONFIGURED';
  throw error;
}

module.exports = { createRepository };
