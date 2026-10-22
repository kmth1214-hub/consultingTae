const API_URL = '/api/leaderboard';
const COOKIE_IDS = new Set(['adventurer', 'alchemist', 'wizard', 'milk', 'wind']);

export class LeaderboardRequestError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'LeaderboardRequestError';
    this.status = status;
  }
}

async function readJson(response) {
  try { return await response.json(); }
  catch { throw new LeaderboardRequestError('리더보드 응답을 읽을 수 없습니다.', response.status); }
}

async function requestJson(response) {
  const payload = await readJson(response);
  if (!response.ok) {
    throw new LeaderboardRequestError(typeof payload?.error === 'string' ? payload.error : '리더보드를 사용할 수 없습니다.', response.status);
  }
  return payload;
}

function safeBoard(payload) {
  if (!payload || !Array.isArray(payload.entries) || payload.entries.length > 10
    || !(payload.personalBest === null || typeof payload.personalBest === 'object')) {
    throw new LeaderboardRequestError('리더보드 응답 형식이 올바르지 않습니다.');
  }
  const entries = payload.entries.map(entry => {
    if (!entry || !Number.isSafeInteger(entry.rank) || entry.rank < 1 || entry.rank > 10
      || typeof entry.displayName !== 'string' || !entry.displayName.trim() || /\S+@\S+/.test(entry.displayName)
      || typeof entry.cookieId !== 'string' || !COOKIE_IDS.has(entry.cookieId)
      || !Number.isSafeInteger(entry.score) || entry.score < 0) {
      throw new LeaderboardRequestError('리더보드 응답 형식이 올바르지 않습니다.');
    }
    return { rank: entry.rank, displayName: entry.displayName, cookieId: entry.cookieId, score: entry.score };
  });
  let personalBest = null;
  if (payload.personalBest !== null) {
    const item = payload.personalBest;
    if (!item || !Number.isSafeInteger(item.rank) || item.rank <= 10
      || typeof item.cookieId !== 'string' || !COOKIE_IDS.has(item.cookieId)
      || !Number.isSafeInteger(item.score) || item.score < 0) {
      throw new LeaderboardRequestError('리더보드 응답 형식이 올바르지 않습니다.');
    }
    personalBest = { rank: item.rank, cookieId: item.cookieId, score: item.score };
  }
  return { entries, personalBest };
}

export async function getLeaderboard({ fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(API_URL, {
    method: 'GET', credentials: 'same-origin', headers: { accept: 'application/json' }, signal
  });
  return safeBoard(await requestJson(response));
}

export async function submitMainRunRecord({ summary, selectedCharacterId, fetchImpl = fetch, signal }) {
  if (!summary || !COOKIE_IDS.has(selectedCharacterId)) throw new TypeError('A completed main-run summary and cookie are required.');
  const body = {
    score: summary.finalScore,
    cookieId: selectedCharacterId,
    furthestArea: summary.furthestArea,
    round: summary.round,
    durationMs: summary.durationMs
  };
  const response = await fetchImpl(API_URL, {
    method: 'POST', credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body), signal
  });
  const payload = await requestJson(response);
  if (typeof payload?.saved !== 'boolean' || !payload.record || !Number.isSafeInteger(payload.record.rank)
    || typeof payload.record.cookieId !== 'string' || !COOKIE_IDS.has(payload.record.cookieId)
    || !Number.isSafeInteger(payload.record.score) || payload.record.score < 0) {
    throw new LeaderboardRequestError('리더보드 저장 응답 형식이 올바르지 않습니다.');
  }
  return { saved: payload.saved, record: payload.record };
}
