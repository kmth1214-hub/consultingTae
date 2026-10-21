import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile, saveProfile, markSnowCleared } from '../src/game/profileStore.js';

const KEY = 'cookie-roguelike.profile.v1';
const empty = { version: 1, snowAreaCleared: false };
function storage(value = null) {
  const data = new Map(value === null ? [] : [[KEY, value]]);
  return { getItem: key => data.get(key) ?? null, setItem: (key, val) => data.set(key, val), data };
}

test('Snow unlock persists across reloads without storing any run or identity fields', () => {
  const local = storage();
  const original = loadProfile(local);
  assert.deepEqual(original, empty);
  const unlocked = markSnowCleared(original);
  assert.deepEqual(original, empty);
  assert.equal(saveProfile({ ...unlocked, score: 100, userId: 'private', inventory: {} }, local), true);
  assert.deepEqual(JSON.parse(local.getItem(KEY)), { version: 1, snowAreaCleared: true });
  assert.deepEqual(loadProfile(local), unlocked);
  assert.equal(local.data.size, 1);
});

test('malformed, unknown-version, or incorrectly typed profiles fall back to locked', () => {
  for (const raw of ['', '{broken', 'null', '[]', '{"version":2,"snowAreaCleared":true}', '{"version":1,"snowAreaCleared":"true"}']) {
    assert.deepEqual(loadProfile(storage(raw)), empty);
  }
  assert.equal(saveProfile({ version: 1, snowAreaCleared: 'true' }, storage()), false);
});

test('missing and throwing browser storage cannot crash loading or saving', () => {
  const failing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.deepEqual(loadProfile(failing), empty);
  assert.equal(saveProfile(markSnowCleared(empty), failing), false);
  assert.deepEqual(loadProfile(null), empty);
  assert.equal(saveProfile(empty, null), false);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('privacy'); } });
    assert.deepEqual(loadProfile(), empty);
    assert.equal(saveProfile(empty), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
