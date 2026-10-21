const PROFILE_KEY = 'cookie-roguelike.profile.v1';
const lockedProfile = () => ({ version: 1, snowAreaCleared: false });

function isValidProfile(profile) {
  return profile !== null && typeof profile === 'object'
    && profile.version === 1 && typeof profile.snowAreaCleared === 'boolean';
}

// Resolve localStorage inside the try block: browsers can throw even on property access.
export function loadProfile(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    const profile = JSON.parse(target.getItem(PROFILE_KEY));
    return isValidProfile(profile)
      ? { version: 1, snowAreaCleared: profile.snowAreaCleared }
      : lockedProfile();
  } catch {
    return lockedProfile();
  }
}

export function saveProfile(profile, storage) {
  if (!isValidProfile(profile)) return false;
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    target.setItem(PROFILE_KEY, JSON.stringify({ version: 1, snowAreaCleared: profile.snowAreaCleared }));
    return true;
  } catch {
    return false;
  }
}

export function markSnowCleared() {
  return { version: 1, snowAreaCleared: true };
}
