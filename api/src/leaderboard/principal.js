const { createHash } = require('node:crypto');

function readHeader(headers, name) {
  if (headers && typeof headers.get === 'function') return headers.get(name);
  if (!headers) return null;
  const key = Object.keys(headers).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

function isProductionEnvironment(env) {
  return env.NODE_ENV === 'production'
    || env.AZURE_FUNCTIONS_ENVIRONMENT === 'Production'
    || Boolean(env.WEBSITE_SITE_NAME || env.WEBSITE_HOSTNAME || env.IDENTITY_ENDPOINT);
}

function resolvePrincipal(headers, env = process.env) {
  const encoded = readHeader(headers, 'x-ms-client-principal');
  if (encoded) {
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      const userId = typeof parsed.userId === 'string' ? parsed.userId.trim() : '';
      const displayName = typeof parsed.userDetails === 'string' ? parsed.userDetails.trim() : '';
      const roles = Array.isArray(parsed.userRoles) ? parsed.userRoles : [];
      if (!userId || !displayName || /\S+@\S+/.test(displayName)
        || parsed.identityProvider !== 'aad' || !roles.includes('authenticated')) return null;
      return { userId, displayName };
    } catch {
      return null;
    }
  }

  const localEnabled = env.NODE_ENV !== 'production'
    && env.AZURE_FUNCTIONS_ENVIRONMENT !== 'Production'
    && !isProductionEnvironment(env)
    && env.LEADERBOARD_LOCAL_MODE === 'true'
    && typeof env.LEADERBOARD_LOCAL_USER_ID === 'string'
    && env.LEADERBOARD_LOCAL_USER_ID.trim().length > 0
    && typeof env.LEADERBOARD_LOCAL_DISPLAY_NAME === 'string'
    && env.LEADERBOARD_LOCAL_DISPLAY_NAME.trim().length > 0;
  if (!localEnabled) return null;
  return {
    userId: env.LEADERBOARD_LOCAL_USER_ID.trim(),
    displayName: env.LEADERBOARD_LOCAL_DISPLAY_NAME.trim()
  };
}

function stableOwnerKey(userId) {
  if (typeof userId !== 'string' || !userId.trim()) throw new TypeError('A principal user ID is required.');
  return createHash('sha256').update(userId.trim(), 'utf8').digest('hex');
}

module.exports = { resolvePrincipal, stableOwnerKey, isProductionEnvironment };
