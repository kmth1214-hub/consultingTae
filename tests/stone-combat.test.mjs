import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { getCandyDetails } from '../src/game/candyPresentation.js';

const owners = {
  adventurer: 'adventurer-candy', alchemist: 'alchemist-candy', wizard: 'wizard-orb',
  milk: 'milk-candy', wind: 'wind-candy'
};

test('each cookie starts with one exclusive and two basic stones', () => {
  for (const [characterId, ownId] of Object.entries(owners)) {
    const state = BattleEngine.createRunState({ characterId, rng: () => .5 });
    assert.equal(state.maxAmmo, 3);
    assert.equal(state.ammo, 3);
    assert.equal(state.weapons.filter(weapon => weapon.id === ownId).length, 1);
    assert.equal(state.weapons.filter(weapon => weapon.id === 'basic-stone').length, 2);
    assert.equal(new Set(state.weaponQueue).size, 3);
    assert.equal(state.weaponQueue.length, 3);
  }
});

test('basic stone does not receive exclusive hit effects or score bonuses', () => {
  const state = BattleEngine.createRunState({ characterId: 'wizard', rng: () => .5, inventory: {} });
  state.enemies = [{ id: 'target', kind: 'snake', hp: 99, maxHp: 99, alive: true, isBoss: false }];
  state.weaponQueue = state.weapons.filter(weapon => weapon.id === 'basic-stone').map(weapon => weapon.instanceId);
  state.currentWeaponId = state.weaponQueue[0];
  state.effectCounters.projectileCollisions = 2;
  const event = BattleEngine.resolveProjectile(state, { hitIds: ['target'], damage: 1, rng: () => .5 });
  assert.equal(event.hits[0].damage, 1);
  assert.equal(event.scoreDelta, 1);
  assert.equal(state.effectCounters.projectileCollisions, 2);
});

test('adventurer hit and alchemist item no longer grant cookie score', () => {
  const adventurer = BattleEngine.createRunState({ characterId: 'adventurer', rng: () => .5, inventory: {} });
  adventurer.enemies = [{ id: 'target', kind: 'snake', hp: 99, maxHp: 99, alive: true, isBoss: false }];
  for (let i = 0; i < 3; i++) {
    const event = BattleEngine.resolveProjectile(adventurer, { hitIds: ['target'], damage: 1, rng: () => .5 });
    assert.equal(event.scoreDelta, 1);
  }
  assert.equal(adventurer.score, 3);
  const alchemist = BattleEngine.createRunState({ characterId: 'alchemist', rng: () => .5,
    inventory: { heal: 1 } });
  alchemist.playerHp = 50;
  const item = BattleEngine.useConsumable(alchemist, 'heal', { rng: () => .5 });
  assert.equal(item.accepted, true);
  assert.equal(item.scoreDelta, 0);
  assert.equal(alchemist.score, 0);
});

test('wizard third exclusive direct hit adds one damage', () => {
  const state = BattleEngine.createRunState({ characterId: 'wizard', rng: () => .5, inventory: {} });
  state.enemies = [{ id: 'target', kind: 'snake', hp: 99, maxHp: 99, alive: true, isBoss: false }];
  state.effectCounters.projectileCollisions = 2;
  state.weaponQueue = [state.weapons.find(weapon => weapon.id === 'wizard-orb').instanceId];
  state.currentWeaponId = state.weaponQueue[0];
  const event = BattleEngine.resolveProjectile(state, { hitIds: ['target'], damage: 1, rng: () => .5 });
  assert.equal(event.hits[0].damage, 2);
});
