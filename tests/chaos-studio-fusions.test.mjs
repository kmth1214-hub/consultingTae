import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as E } from '../src/game/battleEngine.js';
import { createStudioScenario } from '../src/dev/createStudioSession.js';

const kinds = ['frost-gear-snake', 'oven-snow-boar', 'jelly-cloud-robot'];

test('studio Chaos regular rounds guarantee all three fusion kinds with stable seeded rosters', () => {
  for (const round of [1, 2]) {
    const first = createStudioScenario({ area: 'chaos', round, seed: 41 });
    const again = createStudioScenario({ area: 'chaos', round, seed: 41 });
    assert.deepEqual(first.enemies, again.enemies);
    assert.deepEqual(first.run.enemies, first.enemies);
    assert.equal(first.run.studioMonsterPrototype, 'regional-monsters-v1');
    assert.ok(first.enemies.length >= 9 && first.enemies.length <= 13);
    for (const kind of kinds) assert.ok(first.enemies.some(enemy => enemy.kind === kind));
    for (const enemy of first.enemies) {
      assert.ok(kinds.includes(enemy.kind));
      assert.equal(enemy.hp, 4);
      assert.equal(enemy.maxHp, 4);
      assert.equal(enemy.attackCount, 0);
    }
  }
  const rosters = new Set(Array.from({ length: 5 }, (_, seed) =>
    createStudioScenario({ area: 'chaos', round: 2, seed }).enemies.map(enemy => enemy.kind).join(',')));
  assert.ok(rosters.size > 1);
});

test('fusion enemy alternates attack variants and keeps damage, miss and defense rules', () => {
  for (const [kind, expectedKinds] of [
    ['frost-gear-snake', ['snake', 'dry-ice']],
    ['oven-snow-boar', ['boar', 'snowball']],
    ['jelly-cloud-robot', ['washing-robot', 'snowball']]
  ]) {
    const state = E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
      inventory: {}, studioMonsterPrototype: 'regional-monsters-v1' });
    state.enemies = [state.enemies.find(enemy => enemy.kind === kind)];
    for (let turn = 0; turn < 4; turn += 1) {
      const attack = E.resolveEnemyTurn(state, () => 0);
      assert.equal(attack.kind, kind);
      assert.equal(attack.fusionAttack, turn % 2 ? 'disrupt' : 'base');
      assert.equal(attack.attackKind, expectedKinds[turn % 2]);
      assert.ok(attack.damage >= 1 && attack.damage <= 8);
      assert.equal(state.enemies[0].attackCount, turn + 1);
    }
    const miss = E.resolveEnemyTurn(state, () => .99);
    assert.equal(miss.missed, true);
    assert.equal(miss.damage, 0);
    state.defenseArmed = true;
    const blocked = E.resolveEnemyTurn(state, () => 0);
    assert.equal(blocked.blocked, true);
    assert.equal(blocked.damage, 0);
  }
});

test('user Chaos roster and fused boss retain their existing identities', () => {
  const user = E.createRunState({ area: 'chaos', round: 1, rng: () => 0, inventory: {} });
  assert.equal(user.studioMonsterPrototype, undefined);
  assert.ok(user.enemies.every(enemy => !kinds.includes(enemy.kind)));
  const userAttack = E.resolveEnemyTurn(user, () => 0);
  assert.equal(userAttack.fusionAttack, null);
  const boss = createStudioScenario({ area: 'chaos', round: 3, seed: 1 }).run;
  assert.equal(boss.enemies[0].kind, 'chaos-fused-boss');
  assert.equal(E.resolveEnemyTurn(boss, () => 0).fusionAttack, null);
});

test('a landed second fusion attack applies only its one-shot, non-stacking disruption', () => {
  for (const [kind, disruption] of [
    ['frost-gear-snake', 'pull'], ['oven-snow-boar', 'preview'], ['jelly-cloud-robot', 'roll']
  ]) {
    const state = E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
      inventory: { fireball: 1 }, studioMonsterPrototype: 'regional-monsters-v1' });
    state.enemies = [state.enemies.find(enemy => enemy.kind === kind)];
    const base = E.resolveEnemyTurn(state, () => 0);
    assert.equal(base.aimDisruption, undefined);
    assert.equal(state.pendingAimDisruption, null);
    const disrupted = E.resolveEnemyTurn(state, () => 0);
    assert.equal(disrupted.aimDisruption, disruption);
    assert.equal(state.pendingAimDisruption, disruption);
    const item = E.useConsumable(state, 'fireball', { rng: () => 0 });
    assert.equal(item.accepted, true);
    assert.equal(state.pendingAimDisruption, disruption);
    const rejected = E.resolveProjectile({ ...state, terminal: 'defeat' }, { hitIds: [], damage: 1 });
    assert.equal(rejected.accepted, false);
    assert.equal(state.pendingAimDisruption, disruption);
    state.enemies[0].attackCount = 0;
    const fired = E.resolveProjectile(state, { hitIds: [], damage: 1, rng: () => 0 });
    assert.equal(fired.accepted, true);
    assert.equal(state.pendingAimDisruption, null);
  }
});

test('misses, defense and zero damage never create disruption or replace an existing one', () => {
  for (const mode of ['miss', 'defense', 'zero']) {
    const state = E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
      inventory: {}, studioMonsterPrototype: 'regional-monsters-v1' });
    state.enemies = [state.enemies.find(enemy => enemy.kind === 'frost-gear-snake')];
    state.enemies[0].attackCount = 1;
    state.pendingAimDisruption = 'roll';
    if (mode === 'defense') state.defenseArmed = true;
    if (mode === 'zero') state.nextAttackDamageMultiplier = .5;
    const attack = E.resolveEnemyTurn(state, () => mode === 'miss' ? .99 : 0);
    assert.equal(attack.aimDisruption, undefined);
    assert.equal(state.pendingAimDisruption, 'roll');
    assert.equal(attack.missed, mode === 'miss');
    assert.equal(attack.blocked, mode === 'defense');
    if (mode === 'zero') assert.equal(attack.damage, 0);
  }
});
