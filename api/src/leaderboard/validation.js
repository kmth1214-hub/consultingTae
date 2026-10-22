const COOKIE_IDS = new Set(['adventurer', 'alchemist', 'wizard', 'milk', 'wind']);
const AREAS = new Set(['forest', 'snow', 'city']);
const SUBMISSION_FIELDS = ['score', 'cookieId', 'furthestArea', 'round', 'durationMs'];

function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Request body must be an object.' };
  const keys = Object.keys(body).sort();
  if (keys.length !== SUBMISSION_FIELDS.length || keys.some((key, index) => key !== [...SUBMISSION_FIELDS].sort()[index])) {
    return { ok: false, error: 'Request body has missing or unsupported fields.' };
  }
  if (!Number.isSafeInteger(body.score) || body.score < 0 || body.score > 1_000_000) return { ok: false, error: 'Score is outside the supported range.' };
  if (typeof body.cookieId !== 'string' || !COOKIE_IDS.has(body.cookieId)) return { ok: false, error: 'Unknown cookie.' };
  if (typeof body.furthestArea !== 'string' || !AREAS.has(body.furthestArea)) return { ok: false, error: 'Invalid main-run area.' };
  if (!Number.isSafeInteger(body.round) || body.round < 1 || body.round > 3) return { ok: false, error: 'Invalid main-run round.' };
  if (!Number.isSafeInteger(body.durationMs) || body.durationMs < 0 || body.durationMs > 864_000_000) return { ok: false, error: 'Duration is outside the supported range.' };
  return { ok: true, value: Object.fromEntries(SUBMISSION_FIELDS.map(field => [field, body[field]])) };
}

module.exports = { validateSubmission, COOKIE_IDS, AREAS };
