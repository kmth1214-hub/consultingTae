const { resolvePrincipal } = require('../leaderboard/principal');
const { createPlayerProfileRepository } = require('./repository');
const { createPlayerProfileService } = require('./service');

const json = (status, body) => ({ status, jsonBody: body, headers: { 'cache-control': 'no-store' } });

function createPlayerProfileHandlers({ env = process.env,
  repositoryFactory = createPlayerProfileRepository, logger = console } = {}) {
  async function respond(request, operation) {
    const principal = resolvePrincipal(request.headers, env);
    if (!principal) return json(401, { error: 'Sign in with an authorized company account.' });
    try {
      const repository = repositoryFactory({ env });
      const service = createPlayerProfileService({ repository });
      return json(200, await service[operation](principal));
    } catch (error) {
      logger?.error?.('Player profile request failed.', {
        code: error?.code || 'UNEXPECTED', statusCode: error?.statusCode || error?.status
      });
      return json(503, { error: 'Player profile is temporarily unavailable. Please try again.' });
    }
  }
  return {
    get: request => respond(request, 'get'),
    unlockSnow: request => respond(request, 'unlockSnow')
  };
}

module.exports = { createPlayerProfileHandlers };
