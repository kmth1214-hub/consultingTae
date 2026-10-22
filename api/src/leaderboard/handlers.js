const { resolvePrincipal } = require('./principal');
const { validateSubmission } = require('./validation');
const { createRepository } = require('./repository-factory');
const { createLeaderboardService } = require('./service');

function json(status, body) {
  return { status, jsonBody: body, headers: { 'cache-control': 'no-store' } };
}

function createLeaderboardHandlers({ env = process.env, repositoryFactory = createRepository, logger = console, now } = {}) {
  async function withService(request, operation) {
    const principal = resolvePrincipal(request.headers, env);
    if (!principal) return json(401, { error: 'Sign in with an authorized company account to use the leaderboard.' });
    let repository;
    try {
      repository = repositoryFactory({ env });
    } catch (error) {
      return json(503, { error: 'The leaderboard is temporarily unavailable. Please try again.' });
    }
    const service = createLeaderboardService({ repository, now });
    try {
      return await operation(service, principal);
    } catch (error) {
      logger?.error?.('Leaderboard request failed.', { code: error?.code || 'UNEXPECTED', statusCode: error?.statusCode || error?.status });
      return json(503, { error: 'The leaderboard is temporarily unavailable. Please try again.' });
    }
  }

  return {
    async get(request) {
      return withService(request, async (service, principal) => json(200, await service.getBoard(principal)));
    },
    async post(request) {
      return withService(request, async (service, principal) => {
        let body;
        try { body = await request.json(); }
        catch { return json(400, { error: 'Request body must be valid JSON.' }); }
        const validation = validateSubmission(body);
        if (!validation.ok) return json(400, { error: validation.error });
        const result = await service.submit({ principal, submission: validation.value });
        return json(200, { saved: result.saved, record: result.record });
      });
    }
  };
}

module.exports = { createLeaderboardHandlers };
