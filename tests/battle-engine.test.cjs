const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/js/battle-engine.js');

test('creates a fresh Forest run with one snake, 100 HP, and nine shots', () => {
  const state = engine.createRunState({ area: 'forest', round: 1 });
  assert.equal(state.playerHp, 100);
  assert.equal(state.ammo, 9);
  assert.equal(state.score, 0);
  assert.deepEqual(state.enemies.map(enemy => enemy.kind), ['snake']);
});

test('samples C-grade damage with the documented weighted outcomes and caps zero rolls', () => {
  assert.equal(engine.rollWeaponDamage(() => 0.005, 'C', 0), 0);
  assert.equal(engine.rollWeaponDamage(() => 0.02, 'C', 0), 1);
  assert.equal(engine.rollWeaponDamage(() => 0.421, 'C', 0), 2);
  assert.equal(engine.rollWeaponDamage(() => 0.821, 'C', 0), 3);
  assert.equal(engine.rollWeaponDamage(() => 0.921, 'C', 0), 4);
  assert.equal(engine.rollWeaponDamage(() => 0.005, 'C', 2), 1);
  assert.equal(engine.rollWeaponDamage(() => 0.005, 'B', 0), 1);
  assert.equal(engine.rollWeaponDamage(() => 0.005, 'A', 0), 2);
});

test('applies damage to the first path target, scores removed HP, and resolves one enemy turn', () => {
  const state = engine.createRunState({ area: 'forest', round: 2, rng: () => 0 });
  const event = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 2, weaponGrade: 'C', rng: () => 0 });
  assert.equal(state.ammo, 8);
  assert.equal(state.enemies[0].hp, 2);
  assert.equal(state.score, 2);
  assert.equal(state.playerHp, 99);
  assert.equal(event.enemyAttack.damage, 1);
  assert.equal(event.hits[0].damage, 2);
});

test('only carries unused damage after defeating a target and processes path order', () => {
  const state = engine.createRunState({ area: 'forest', round: 3 });
  state.enemies = [
    { id: 'a', kind: 'snake', hp: 1, maxHp: 1, isBoss: false, attackCount: 0, alive: true },
    { id: 'b', kind: 'boar', hp: 4, maxHp: 4, isBoss: false, attackCount: 0, alive: true },
    { id: 'c', kind: 'boar', hp: 4, maxHp: 4, isBoss: false, attackCount: 0, alive: true }
  ];
  const event = engine.resolveProjectile(state, { hitIds: ['a', 'b', 'c'], damage: 3, weaponGrade: 'C', rng: () => 0 });
  assert.deepEqual(event.hits.map(hit => hit.id), ['a', 'b']);
  assert.equal(state.enemies[0].hp, 0);
  assert.equal(state.enemies[1].hp, 2);
  assert.equal(state.enemies[2].hp, 4);
  assert.equal(state.score, 3);
});

test('a miss consumes ammo and lets a living enemy attack', () => {
  const state = engine.createRunState({ area: 'forest', round: 2 });
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 2, weaponGrade: 'C', rng: () => 0 });
  assert.equal(event.hits.length, 0);
  assert.equal(event.missed, true);
  assert.equal(state.ammo, 8);
  assert.equal(state.playerHp, 99);
  assert.equal(event.enemyAttack.enemyId, state.enemies[0].id);
});

test('ammo exhaustion with enemies remaining ends the run without another enemy action', () => {
  const state = engine.createRunState({ area: 'forest', round: 2 });
  state.ammo = 1;
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 2, weaponGrade: 'C', rng: () => 0 });
  assert.equal(state.ammo, 0);
  assert.equal(state.terminal, 'defeat');
  assert.equal(event.runDefeated, true);
  assert.equal(event.enemyAttack, null);
});

test('clearing the final enemy ends the action before an enemy response', () => {
  const state = engine.createRunState({ area: 'forest', round: 1 });
  const event = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 4, weaponGrade: 'C', rng: () => 0 });
  assert.equal(state.terminal, 'round-clear');
  assert.equal(event.roundCleared, true);
  assert.equal(event.enemyAttack, null);
});

test('boss special attack replaces the normal attack on its third attack', () => {
  const state = engine.createRunState({ area: 'forest', round: 5 });
  const boss = state.enemies[0];
  state.playerHp = 100;
  engine.resolveEnemyTurn(state, () => 0);
  engine.resolveEnemyTurn(state, () => 0);
  const event = engine.resolveEnemyTurn(state, () => 0);
  assert.equal(boss.attackCount, 3);
  assert.equal(event.special, 'boar-charge');
  assert.equal(event.damage, 8);
});

test('Heal spends one item, restores 25 up to max HP, and resolves one enemy attack', () => {
  const state = engine.createRunState({ playerHp: 60, rng: () => 0.5 });
  const event = engine.useConsumable(state, 'heal', { rng: () => 0.5 });
  assert.equal(event.accepted, true);
  assert.equal(event.effect.healed, 25);
  assert.equal(state.playerHp, 80); // healing to 85, then a 5-point enemy attack
  assert.equal(engine.getConsumableCount(state, 'heal'), 0);
  assert.equal(state.turnNumber, 2); // one player action and one enemy attack
});

test('Defense consumes its turn and cancels a boss special completely', () => {
  const state = engine.createRunState({ area: 'forest', round: 5, rng: () => 0.99 });
  state.enemies[0].attackCount = 2;
  const event = engine.useConsumable(state, 'defense', { rng: () => 0.99 });
  assert.equal(event.enemyAttack.blocked, true);
  assert.equal(event.enemyAttack.special, null);
  assert.equal(state.playerHp, 100);
  assert.equal(state.enemies[0].attackCount, 3);
});

test('Fireball doubles only the next permanent projectile and preserves a zero roll', () => {
  const state = engine.createRunState({ rng: () => 0.5 });
  engine.useConsumable(state, 'fireball', { rng: () => 0.5 });
  assert.equal(state.fireballArmed, true);
  const zero = engine.resolveProjectile(state, { damage: 0, hitIds: [state.enemies[0].id], rng: () => 0.5 });
  assert.equal(zero.damage, 0);
  assert.equal(state.fireballArmed, false);
  assert.equal(engine.getConsumableCount(state, 'fireball'), 0);
});

test('Spear hits up to three enemies with falling damage, even when a target survives', () => {
  const state = engine.createRunState({ area: 'forest', round: 4, rng: () => 0.5 });
  state.enemies = state.enemies.slice(0, 3);
  state.enemies.forEach((enemy) => { enemy.hp = 10; enemy.maxHp = 10; });
  const event = engine.useConsumable(state, 'spear', { rng: () => 0.5 }); // 4, 3, 2
  assert.deepEqual(event.hits.map((hit) => hit.damage), [4, 3, 2]);
  assert.equal(state.score, 9);
  assert.equal(engine.getConsumableCount(state, 'spear'), 1);
});

test('blocked and empty consumables cannot be spent or consume a turn', () => {
  const state = engine.createRunState();
  state.consumablesBlocked = true;
  const blocked = engine.useConsumable(state, 'heal', { rng: () => 0.5 });
  assert.equal(blocked.reason, 'blocked');
  state.consumablesBlocked = false;
  state.inventory.heal = 0;
  const empty = engine.useConsumable(state, 'heal', { rng: () => 0.5 });
  assert.equal(empty.reason, 'empty');
  assert.equal(state.turnNumber, 0);
});
