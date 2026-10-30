const { stableOwnerKey } = require('../leaderboard/principal');

function createPlayerProfileService({ repository } = {}) {
  if (!repository) throw new TypeError('A player profile repository is required.');
  const publicProfile = entity => ({ version: 1, snowAreaCleared: entity?.snowAreaCleared === true });
  return {
    async get(principal) { return publicProfile(await repository.get(stableOwnerKey(principal.userId))); },
    async unlockSnow(principal) { return publicProfile(await repository.unlockSnow(stableOwnerKey(principal.userId))); }
  };
}

module.exports = { createPlayerProfileService };
