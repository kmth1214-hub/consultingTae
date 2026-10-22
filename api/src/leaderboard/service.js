const { stableOwnerKey } = require('./principal');

function compareRecords(a, b) {
  return b.score - a.score
    || b.round - a.round
    || a.durationMs - b.durationMs
    || a.rowKey.localeCompare(b.rowKey);
}

function isStrictlyBetter(candidate, current) {
  if (candidate.score !== current.score) return candidate.score > current.score;
  if (candidate.round !== current.round) return candidate.round > current.round;
  return candidate.durationMs < current.durationMs;
}

function ownRecord(record, rank) {
  return { rank, cookieId: record.cookieId, score: record.score };
}

function createLeaderboardService({ repository, now = () => new Date() }) {
  if (!repository) throw new TypeError('A leaderboard repository is required.');

  async function getBoard(principal) {
    const ownerKey = stableOwnerKey(principal.userId);
    const ordered = (await repository.listAll()).sort(compareRecords);
    const ownIndex = ordered.findIndex(record => record.rowKey === ownerKey);
    return {
      entries: ordered.slice(0, 10).map((record, index) => ({
        rank: index + 1,
        displayName: record.displayName,
        cookieId: record.cookieId,
        score: record.score
      })),
      personalBest: ownIndex >= 10 ? ownRecord(ordered[ownIndex], ownIndex + 1) : null
    };
  }

  async function submit({ principal, submission }) {
    const ownerKey = stableOwnerKey(principal.userId);
    const entity = {
      partitionKey: 'GLOBAL',
      rowKey: ownerKey,
      displayName: principal.displayName,
      cookieId: submission.cookieId,
      score: submission.score,
      furthestArea: submission.furthestArea,
      round: submission.round,
      durationMs: submission.durationMs,
      updatedAt: now().toISOString()
    };
    let saved = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const existing = await repository.get(ownerKey);
      if (existing && !isStrictlyBetter(entity, existing)) break;
      try {
        if (existing) await repository.replace(entity, existing.etag);
        else await repository.insert(entity);
        saved = true;
        break;
      } catch (error) {
        if (![404, 409, 412].includes(error?.statusCode ?? error?.status)) throw error;
        if (attempt === 2) {
          const retryable = new Error('Leaderboard record changed repeatedly during update.');
          retryable.statusCode = 503;
          retryable.code = 'LEADERBOARD_RECORD_CONFLICT';
          throw retryable;
        }
      }
    }
    const current = await repository.get(ownerKey);
    if (!current) return { saved, record: null };
    const ordered = (await repository.listAll()).sort(compareRecords);
    const rank = ordered.findIndex(record => record.rowKey === ownerKey) + 1;
    return { saved, record: ownRecord(current, rank) };
  }

  return { getBoard, submit };
}

module.exports = { createLeaderboardService, compareRecords, isStrictlyBetter };
