const PROFILE_URL = '/api/profile';

function readProfile(value) {
  if (!value || typeof value !== 'object' || value.version !== 1
    || typeof value.snowAreaCleared !== 'boolean') throw new Error('invalid-profile');
  return { version: 1, snowAreaCleared: value.snowAreaCleared };
}

export function createPlayerProfileClient({ fetchImpl = globalThis.fetch } = {}) {
  async function request(path, method) {
    const response = await fetchImpl(path, { method, credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error(`profile-http-${response.status}`);
    return readProfile(await response.json());
  }
  return {
    get: () => request(PROFILE_URL, 'GET'),
    unlockSnow: () => request(`${PROFILE_URL}/snow-clear`, 'POST')
  };
}
