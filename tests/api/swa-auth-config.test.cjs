const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createLeaderboardHandlers } = require('../../api/src/leaderboard/handlers');
const { createMemoryRepository } = require('../../api/src/leaderboard/memory-repository');

test('Entra name claim reaches the authenticated leaderboard without exposing the email claim', async () => {
  const config = JSON.parse(readFileSync(resolve(__dirname, '../../config/staticwebapp.config.template.json'), 'utf8'));
  const claimType = config.auth.identityProviders.azureActiveDirectory.userDetailsClaim;
  // The actual Entra v1 response includes both names, with different values.
  const claims = [
    { typ: 'name', val: 'Cookie Player' },
    { typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name', val: 'player@company.example' }
  ];
  const userDetails = claims.find(claim => claim.typ === claimType)?.val;
  assert.ok(userDetails, 'configured claim must exist in the Entra response');
  const clientPrincipal = {
    identityProvider: 'aad', userId: 'entra-opaque-id', userDetails,
    userRoles: ['anonymous', 'authenticated']
  };
  const header = Buffer.from(JSON.stringify(clientPrincipal)).toString('base64');
  const handlers = createLeaderboardHandlers({
    env: { NODE_ENV: 'production' }, repositoryFactory: () => createMemoryRepository()
  });
  const response = await handlers.get({ headers: new Headers({ 'x-ms-client-principal': header }) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.jsonBody, { entries: [], personalBest: null });
  assert.equal(userDetails, 'Cookie Player');
});
