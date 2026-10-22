import test from 'node:test';
import assert from 'node:assert/strict';
import { getLeaderboard, submitMainRunRecord, LeaderboardRequestError } from '../src/game/leaderboardClient.js';

const board = {
  entries: [{ rank: 1, displayName: 'Cookie Player', cookieId: 'adventurer', score: 980, round: 5, durationMs: 1200 }],
  personalBest: { rank: 12, cookieId: 'wizard', score: 300, furthestArea: 'city', round: 4, durationMs: 8000 }
};
const response = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, async json() { return payload; } });

test('GET uses same-origin credentials and projects only rank, name, cookie and score', async () => {
  let request;
  const result = await getLeaderboard({ fetchImpl: async (...args) => { request = args; return response(board); } });
  assert.equal(request[0], '/api/leaderboard');
  assert.equal(request[1].method, 'GET');
  assert.equal(request[1].credentials, 'same-origin');
  assert.deepEqual(result, {
    entries: [{ rank: 1, displayName: 'Cookie Player', cookieId: 'adventurer', score: 980 }],
    personalBest: { rank: 12, cookieId: 'wizard', score: 300 }
  });
});

test('GET rejects malformed data, email names, and non-success responses as recoverable errors', async () => {
  await assert.rejects(getLeaderboard({ fetchImpl: async () => response({ entries: [], personalBest: undefined }) }), LeaderboardRequestError);
  await assert.rejects(getLeaderboard({ fetchImpl: async () => response({ entries: [{ rank: 1, displayName: 'person@company.example', cookieId: 'wind', score: 1 }], personalBest: null }) }), LeaderboardRequestError);
  await assert.rejects(getLeaderboard({ fetchImpl: async () => response({ error: 'Try later' }, 503) }), error => error instanceof LeaderboardRequestError && error.status === 503 && error.message === 'Try later');
  await assert.rejects(getLeaderboard({ fetchImpl: async () => ({ ok: true, status: 200, async json() { throw new SyntaxError(); } }) }), /응답을 읽을 수 없습니다/);
});

test('POST projects main final score and sends no identity, email, or bonus score', async () => {
  let request;
  const summary = { finalScore: 440, score: 400, bonusScore: 99_999, furthestArea: 'snow', round: 3, durationMs: 88_000 };
  const result = await submitMainRunRecord({ summary, selectedCharacterId: 'wizard', fetchImpl: async (...args) => {
    request = args;
    return response({ saved: true, record: { rank: 7, cookieId: 'wizard', score: 440 } });
  } });
  assert.equal(request[0], '/api/leaderboard');
  assert.equal(request[1].method, 'POST');
  assert.equal(request[1].credentials, 'same-origin');
  assert.deepEqual(JSON.parse(request[1].body), { score: 440, cookieId: 'wizard', furthestArea: 'snow', round: 3, durationMs: 88_000 });
  assert.deepEqual(result, { saved: true, record: { rank: 7, cookieId: 'wizard', score: 440 } });
  assert.doesNotMatch(request[1].body, /userId|displayName|email|bonusScore|99999/);
});

test('POST rejects a malformed save result and preserves status for retry messaging', async () => {
  const args = { summary: { finalScore: 10, furthestArea: 'forest', round: 1, durationMs: 1000 }, selectedCharacterId: 'adventurer' };
  await assert.rejects(submitMainRunRecord({ ...args, fetchImpl: async () => response({ saved: true }) }), /저장 응답 형식/);
  await assert.rejects(submitMainRunRecord({ ...args, fetchImpl: async () => response({ error: 'Unavailable' }, 503) }), error => error.status === 503);
});
