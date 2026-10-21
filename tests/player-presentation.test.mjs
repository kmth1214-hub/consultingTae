import test from 'node:test';
import assert from 'node:assert/strict';
import { getPlayerPresentation } from '../src/game/playerPresentation.js';
import { CHARACTERS } from '../src/game/gameData.js';

const base = { phase: 'idle', response: null, playerHp: 100, defenseArmed: false, healActive: false };

test('all selected cookies resolve to their existing character asset and unknown ids safely fall back', () => {
  for (const character of CHARACTERS) {
    const view = getPlayerPresentation({ ...base, characterId: character.id });
    assert.equal(view.characterId, character.id);
    assert.equal(view.assetKey, character.asset);
    assert.equal(typeof view.assetKey, 'string');
  }
  assert.equal(getPlayerPresentation({ ...base, characterId: 'missing' }).characterId, 'adventurer');
});

test('player pose precedence follows committed hit, shield, heal, response and aim states', () => {
  const response = (stage, attack) => ({ id: 9, stage, attack: { damage: 5, blocked: false, blockedBy: null, ...attack } });
  assert.equal(getPlayerPresentation({ ...base, phase: 'dragging' }).pose, 'aiming');
  assert.equal(getPlayerPresentation({ ...base, phase: 'launching' }).pose, 'release');
  assert.equal(getPlayerPresentation({ ...base, response: response('windup') }).pose, 'brace');
  assert.equal(getPlayerPresentation({ ...base, response: response('travel') }).pose, 'brace');
  assert.equal(getPlayerPresentation({ ...base, response: response('impact') }).pose, 'hurt');
  assert.equal(getPlayerPresentation({ ...base, response: response('impact'), playerHp: 0 }).pose, 'defeated');
  assert.equal(getPlayerPresentation({ ...base, healActive: true }).pose, 'healing');
  assert.equal(getPlayerPresentation({ ...base, response: response('impact', { blocked: true, blockedBy: 'milk' }), healActive: true }).pose, 'blocked');
});

test('zero-damage and blocked responses do not create injury and only real blocks show a shield reason', () => {
  const zero = getPlayerPresentation({ ...base, response: { id: 2, stage: 'impact', attack: { damage: 0, blocked: false } } });
  assert.equal(zero.pose, 'idle'); assert.equal(zero.damage, 0); assert.equal(zero.impactId, 2);
  const blocked = getPlayerPresentation({ ...base, response: { id: 3, stage: 'impact', attack: { damage: 0, blocked: true, blockedBy: 'defense' } } });
  assert.equal(blocked.pose, 'blocked'); assert.equal(blocked.damage, 0); assert.equal(blocked.blockedBy, 'defense'); assert.equal(blocked.showShield, true);
  const armed = getPlayerPresentation({ ...base, defenseArmed: true });
  assert.equal(armed.showShield, true); assert.equal(armed.blockedBy, null);
  const incomingBlocked = getPlayerPresentation({ ...base, response: { id: 5, stage: 'windup', attack: { damage: 0, blocked: true, blockedBy: 'defense' } } });
  assert.equal(incomingBlocked.pose, 'brace'); assert.equal(incomingBlocked.showShield, true);
});

test('view model does not mutate caller-owned response or input', () => {
  const input = { ...base, characterId: 'wizard', response: { id: 4, stage: 'impact', attack: { damage: 6, blocked: false } } };
  const before = structuredClone(input);
  getPlayerPresentation(input);
  assert.deepEqual(input, before);
});
