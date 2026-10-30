const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/js/battle-engine.js');

const weapon = (id, grade = 'C') => ({ ...engine.WEAPON_CATALOG.find(item => item.id === id), grade });
const create = (ids = ['adventurer-candy'], options = {}) => {
  const deck = [...ids, ...Array(Math.max(0, 3 - ids.length)).fill('basic-stone')];
  const state = engine.createRunState({ weapons: deck.map(id => weapon(id)), inventory: {}, rng: () => 0, ...options });
  state.weaponQueue = state.weapons.map(item => item.instanceId);
  state.currentWeaponId = state.weaponQueue[0];
  return state;
};
function sturdyEnemy(state) {
  state.enemies[0].hp = state.enemies[0].maxHp = 100;
  return state.enemies[0].id;
}
function clearCity() {
  const state = create(['adventurer-candy'], { area: 'city', round: 3, score: 100, now: 0 });
  state.terminal = 'round-clear';
  const rewards = engine.drawRewardChoices(state, () => 0.5);
  engine.spinRewardSlot(state, 'stone', () => .5);
  engine.applyRewardChoice(state, 'consumable', rewards.consumables[0].choiceId);
  engine.advanceRound(state, { now: 1000 });
  return state;
}

test('a new run receives exactly one seeded starter item and the selected character weapon', () => {
  const keys = ['fireball', 'spear', 'defense', 'heal'];
  keys.forEach((key, index) => {
    const state = engine.createRunState({ characterId: 'wizard', rng: () => (index + 0.1) / 4, now: 0 });
    assert.equal(Object.values(state.inventory).reduce((a, b) => a + b, 0), 1);
    assert.equal(state.inventory[key], 1);
    assert.equal(state.characterId, 'wizard');
    assert.equal(state.weapons[0].id, 'wizard-orb');
    assert.equal(state.playStartedAt, 0);
  });
  for (const [characterId, id] of Object.entries({ adventurer: 'adventurer-candy', alchemist: 'alchemist-candy', wizard: 'wizard-orb', milk: 'milk-candy', wind: 'wind-candy' })) {
    assert.equal(engine.createRunState({ characterId }).weapons[0].id, id);
  }
});

test('explicit inventories are independent, integer capped, and exclude unknown slots', () => {
  const input = { fireball: 9, spear: -2, defense: 1.9, heal: NaN, unknown: 3 };
  const state = engine.createRunState({ inventory: input });
  assert.deepEqual(state.inventory, { fireball: 3, spear: 0, defense: 1, heal: 0 });
  assert.notEqual(state.inventory, input);
});

test('Adventurer direct hits score only damage and no cookie-specific point bonus', () => {
  const state = create(['adventurer-candy', 'adventurer-candy']);
  const id = sturdyEnemy(state);
  let result;
  for (let i = 0; i < 3; i++) result = engine.resolveProjectile(state, { hitIds: [id, id], damage: 1, rng: () => 0 });
  assert.equal(state.score, 3);
  assert.equal(result.scoreDelta, 1);
  assert.equal(state.effectCounters.permanentWeaponHits, 3);
  assert.equal(state.effectCounters.projectileCollisions, 0);
});

test('zero damage counts as a collision and Wizard boosts the third collision without stacking', () => {
  const state = create(['wizard-orb', 'wizard-orb', 'wizard-orb']);
  const id = sturdyEnemy(state);
  const damage = Array.from({ length: 3 }, () => engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => 0 }).hits[0].damage);
  assert.deepEqual(damage, [0, 0, 1]);
  assert.equal(state.score, 1);
  assert.equal(state.effectCounters.projectileCollisions, 3);
});

test('one projectile counts successive spillover collisions, but stops at a surviving enemy', () => {
  const state = create(['wizard-orb'], { area: 'city', round: 2 });
  state.enemies[0].hp = 1;
  state.enemies[1].hp = 1;
  const result = engine.resolveProjectile(state, { hitIds: state.enemies.map(e => e.id), damage: 3, rng: () => 0 });
  assert.deepEqual(result.hits.map(e => e.damage), [1, 1, 2]);
  assert.equal(state.effectCounters.permanentWeaponHits, 1);
  assert.equal(state.effectCounters.projectileCollisions, 3);
});

test('Milk direct hit heals five once, caps HP, and arms the following-shot shield', () => {
  const state = create(['milk-candy', 'milk-candy', 'milk-candy'], { playerHp: 50 });
  const id = sturdyEnemy(state);
  const first = engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => .5 });
  assert.equal(first.healedPlayer, 5);
  assert.equal(first.milkShieldGained, true);
  assert.notEqual(first.enemyAttack?.blockedBy, 'milk');
  assert.equal(state.milkShieldPending, true);
  const second = engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => .5 });
  assert.equal(second.enemyAttack?.blockedBy, 'milk');
  assert.equal(second.healedPlayer, 5);
  assert.equal(state.milkShieldPending, true, 'a second Milk hit earns a fresh following-shot shield');
  state.playerHp = 99;
  const third = engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => .5 });
  assert.equal(third.healedPlayer, 1);
  assert.equal(state.playerHp, 100);
  assert.equal(state.effectCounters.projectileCollisions, 0);
});

test('Defense takes priority over a Milk shield and unused Milk protection expires after one shot', () => {
  const state = create(['milk-candy', 'basic-stone', 'basic-stone'], { area: 'city', round: 3, inventory: { defense: 1 } });
  state.milkShieldPending = true;
  const prepared = engine.useConsumable(state, 'defense', { rng: () => 0 });
  assert.equal(prepared.enemyAttack, null);
  const defense = engine.resolveProjectile(state, { hitIds: [], damage: 0, rng: () => 0 });
  assert.equal(defense.enemyAttack.blockedBy, 'defense');
  assert.equal(state.milkShieldActive, false);
  assert.equal(state.milkShieldPending, false);
  const next = engine.resolveProjectile(state, { hitIds: [], damage: 0, rng: () => 0 });
  assert.equal(next.enemyAttack?.blockedBy, null);
});

test('Wind guarantees the selected boss first once per round and carries its damage onward', () => {
  const state = create(['wind-candy', 'wind-candy', 'wind-candy'], { area: 'chaos', round: 3 });
  engine.resolveProjectile(state, {hitIds:[state.enemies[0].id],damage:28,rng:()=>0});
  const scoreBefore = state.bonusScore;
  const [boar, , robot] = state.enemies;
  robot.hp = 1;
  const hit = engine.resolveProjectile(state, { selectedTargetId: robot.id, hitIds: [boar.id, robot.id], damage: 3, rng: () => 0 });
  assert.deepEqual(hit.hits.map(e => e.id), [robot.id, boar.id]);
  assert.deepEqual(hit.hits.map(e => e.damage), [1, 3]);
  assert.equal(state.roundEffects.windHomingUsed, true);
  const miss = engine.resolveProjectile(state, { selectedTargetId: boar.id, hitIds: [], damage: 3, rng: () => 0 });
  assert.equal(miss.missed, true);
  assert.equal(state.bonusScore, scoreBefore + 4);
});

test('round transitions reset Wind but preserve the next-shot Milk shield', () => {
  const state = create(['wind-candy', 'milk-candy']);
  state.roundEffects.windHomingUsed = true;
  state.milkShieldPending = true;
  state.effectCounters.permanentWeaponHits = 8;
  state.terminal = 'round-clear';
  engine.drawRewardChoices(state, () => 0);
  engine.spinRewardSlot(state, 'stone', () => 0);
  engine.applyRewardChoice(state, 'consumable', state.rewardChoices.consumables[0].choiceId);
  engine.advanceRound(state, { rng: () => 0 });
  assert.deepEqual(state.roundEffects, { windHomingUsed: false });
  assert.equal(state.milkShieldPending, true);
  assert.equal(state.effectCounters.permanentWeaponHits, 8);
});

test('Spear gets no cookie score bonus or permanent stone abilities', () => {
  const state = create(engine.WEAPON_CATALOG.map(w => w.id), { area: 'city', round: 2, inventory: { spear: 1 }, playerHp: 50 });
  state.enemies.forEach(e => { e.hp = e.maxHp = 10; });
  state.effectCounters.permanentWeaponHits = 2;
  state.effectCounters.projectileCollisions = 2;
  const prepared = engine.useConsumable(state, 'spear', { rng: () => 0.5 });
  assert.deepEqual(prepared.hits, []);
  assert.equal(prepared.scoreDelta, 0);
  assert.equal(state.playerHp, 50);
  const event = engine.resolveProjectile(state, { hitIds: state.enemies.slice(0, 3).map(e => e.id), rng: () => 0.5 });
  assert.deepEqual(event.hits.map(e => e.damage), [4, 3, 2]);
  assert.equal(event.scoreDelta, 9);
  assert.equal(state.score, 9);
  assert.equal(state.ammo, state.maxAmmo - 1);
  assert.deepEqual(state.effectCounters, { permanentWeaponHits: 2, projectileCollisions: 2, consumablesUsed: 1 });
  assert.equal(state.roundEffects.windHomingUsed, false);
  assert.equal(event.healedPlayer, 0);
});

test('rejected consumable and missed projectile do not award Alchemist or Adventurer points', () => {
  const state = create(['adventurer-candy', 'alchemist-candy']);
  state.effectCounters.permanentWeaponHits = 2;
  assert.equal(engine.useConsumable(state, 'heal').accepted, false);
  engine.resolveProjectile(state, { hitIds: [], damage: 2, rng: () => 0 });
  assert.equal(state.score, 0);
  assert.equal(state.effectCounters.permanentWeaponHits, 2);
  assert.equal(state.effectCounters.consumablesUsed, 0);
});

test('engine-owned random rolls cap zero damage at two per round', () => {
  const state = create(['wizard-orb', 'wizard-orb', 'wizard-orb', 'wizard-orb']);
  const id = sturdyEnemy(state);
  const rolls = Array.from({ length: 4 }, () => engine.resolveProjectile(state, { hitIds: [id], rng: () => 0 }).damage);
  assert.deepEqual(rolls, [0, 0, 1, 1]);
  assert.equal(state.zeroRollsThisRound, 2);
});

test('legacy weapon choice cannot bypass the slot and a winning copy stays C-grade', () => {
  const state = create();
  state.terminal = 'round-clear';
  const choice = { ...weapon('adventurer-candy'), choiceId: 'weapon:test' };
  engine.drawRewardChoices(state, () => 0);
  const before = structuredClone(state);
  const prompt = engine.applyRewardChoice(state, 'weapon', choice.choiceId);
  assert.equal(prompt.accepted, false);
  assert.deepEqual(state, before);
  assert.equal(engine.spinRewardSlot(state, 'stone', () => 0).result.prizeId, 'adventurer-candy');
  assert.equal(state.weapons.filter(item => item.id === 'adventurer-candy').length, 2);
  assert.ok(state.weapons.every(item => item.grade === 'C'));
});

test('each round slot adds one persistent stone and one shot from the next round', () => {
  const separate = create();
  assert.deepEqual([separate.ammo, separate.maxAmmo], [3, 3]);
  for (const index of [0, 1]) {
    separate.terminal = 'round-clear';
    engine.drawRewardChoices(separate, () => 0);
    assert.equal(engine.spinRewardSlot(separate, 'stone', () => 0).accepted, true);
    engine.applyRewardChoice(separate, 'consumable', separate.rewardChoices.consumables[0].choiceId);
    assert.deepEqual([separate.ammo, separate.maxAmmo], [3 + index, 3 + index]);
    assert.equal(engine.advanceRound(separate, { rng: () => 0 }).accepted, true);
    assert.deepEqual([separate.ammo, separate.maxAmmo], [4 + index, 4 + index]);
  }
  const target = sturdyEnemy(separate);
  engine.resolveProjectile(separate, { hitIds: [target], damage: 1, rng: () => 0 });
  assert.equal(separate.ammo, 4);
  assert.equal(separate.weapons.length, 5);
});

test('camp weapon choice locks healing and grants two separate C-grade slot stones', () => {
  const state = create(['alchemist-candy']);
  state.area = 'forest'; state.round = 3; state.pendingCamp = true;
  const first = engine.chooseCampReward(state, 'weapon', { rng: () => 0.5 });
  assert.equal(first.pendingCamp, true);
  assert.equal(first.slotReady, true);
  assert.equal(state.weapons[0].grade, 'C');
  const beforeRejectedChoice = structuredClone(state);
  assert.equal(engine.chooseCampReward(state, 'heal').reason, 'camp-choice-locked');
  assert.deepEqual(state, beforeRejectedChoice);
  engine.spinRewardSlot(state, 'stone', () => 0);
  engine.spinRewardSlot(state, 'stone', () => 0);
  const result = engine.finishCampSlot(state, { rng: () => 0 });
  assert.equal(result.area, 'snow');
  assert.equal(state.weapons.length, 5);
  assert.ok(state.weapons.every(item => item.grade === 'C'));
});

test('Chaos waves use 9–13 regular monsters and round three starts with one fused boss', () => {
  assert.equal(engine.createRoundEnemies('chaos', 1, { rng: () => 0 }).length, 9);
  const many = engine.createRoundEnemies('chaos', 2, { rng: () => 0.999 });
  assert.equal(many.length, 13);
  assert.equal(many.every(e => e.kind === 'washing-robot' && e.hp === 4), true);
  const bosses = engine.createRoundEnemies('chaos', 3);
  assert.deepEqual(bosses.map(e => [e.kind, e.hp, e.maxHp, e.attackCount]), [
    ['chaos-fused-boss', 56, 56, 0]
  ]);
  for (const round of [0, 4, NaN]) assert.throws(() => engine.createRoundEnemies('chaos', round), RangeError);
});

test('Chaos bosses use their own third-attack specials and Oven Robot heals only to 26', () => {
  const state = create(['adventurer-candy'], { area: 'chaos', round: 3 });
  engine.resolveProjectile(state, {hitIds:[state.enemies[0].id],damage:28,rng:()=>0});
  state.ammo = 8; // Isolate the nine enemy actions from the three-stone deck.
  const attacks = Array.from({ length: 9 }, () => engine.resolveEnemyTurn(state, () => 0));
  assert.deepEqual(attacks.slice(6).map(e => e.special), ['boar-charge', 'frozen-breath', 'oven-overheat']);
  assert.deepEqual(state.enemies.map(e => e.attackCount), [3, 3, 3]);
  assert.equal(state.enemies[2].hp, 14);
  state.enemies[2].hp=25;state.enemies[2].attackCount=2;state.enemyTurnIndex=2;
  engine.resolveEnemyTurn(state,()=>0);
  assert.equal(state.enemies[2].hp,26);
  assert.equal(state.ammo, 6);
  assert.equal(state.consumablesBlocked, true);
});

test('bonus entry rejects invalid/repeated calls and freezes main final score before bonus item use', () => {
  const invalid = create();
  const before = structuredClone(invalid);
  assert.equal(engine.startBonusRoute(invalid).accepted, false);
  assert.deepEqual(invalid, before);
  const state = clearCity();
  const main = engine.getRunSummary(state, 1000);
  const inventory = { ...state.inventory };
  state.ammo = 2;
  assert.deepEqual(engine.startBonusRoute(state, { rng: () => 0, now: 2000 }), { accepted: true, area: 'chaos', round: 1 });
  assert.equal(state.ammo, state.maxAmmo);
  assert.deepEqual(state.inventory, inventory);
  assert.equal(engine.startBonusRoute(state).accepted, false);
  const item = Object.keys(state.inventory).find(key => state.inventory[key] > 0);
  engine.useConsumable(state, item, { rng: () => 0 });
  assert.equal(engine.getRunSummary(state, 3000).finalScore, main.finalScore);
  assert.equal(state.score, main.score);
});

test('Chaos projectile and item damage use normal scoring in bonusScore only', () => {
  const state = create([], { area: 'chaos', round: 1, score: 50,
    weapons: [weapon('wizard-orb', 'B'), weapon('basic-stone'), weapon('basic-stone')], inventory: { spear: 1 } });
  const shot = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 3, rng: () => 0 });
  assert.equal(shot.scoreDelta, 6);
  assert.equal(state.bonusScore, 6);
  engine.useConsumable(state, 'spear', { rng: () => 0.5 });
  engine.resolveProjectile(state, { hitIds: state.enemies.filter(e => e.alive).slice(0, 3).map(e => e.id), rng: () => 0.5 });
  assert.equal(state.bonusScore, 12); // remaining 1 HP, then 3 HP and 2 HP, at 1x
  assert.equal(state.score, 50);
});

test('Chaos transitions use two slots, refresh ammo, and end at bonus-clear', () => {
  const state = create([], { area: 'chaos', round: 1 });
  const inventoryBefore = { ...state.inventory };
  const weaponsBefore = structuredClone(state.weapons);
  for (let round = 1; round <= 2; round++) {
    state.terminal = 'round-clear'; state.ammo = 1;
    assert.deepEqual(engine.drawRewardChoices(state, () => 0), { weapons: [], consumables: [] });
    engine.spinRewardSlot(state, 'stone', () => 0);
    const misses = [0, .25, .5, .75, .5, .25, .25, .75, 0];
    let index = 0;
    engine.spinRewardSlot(state, 'consumable', () => misses[index++]);
    assert.equal(engine.advanceRound(state, { rng: () => 0 }).round, round + 1);
    assert.equal(state.ammo, state.weapons.length);
    assert.equal(state.pendingCamp, false);
    assert.equal(state.rewardChoices, null);
  }
  const finish = engine.resolveProjectile(state, { hitIds: state.enemies.map(e => e.id), damage: 100, rng: () => 0 });
  assert.equal(finish.bonusCleared, true);
  assert.equal(state.terminal, 'bonus-clear');
  assert.equal(engine.drawRewardChoices(state), null);
  assert.equal(engine.resolveProjectile(state, { damage: 1 }).accepted, false);
  assert.deepEqual(state.inventory, inventoryBefore);
  assert.equal(state.weapons.length, weaponsBefore.length + 2);
});

test('Snow boss clear emits an unlock flag for projectile and Spear, but Forest does not', () => {
  for (const source of ['projectile', 'spear']) {
    const state = create([], { area: 'snow', round: 3, inventory: { spear: 1 } });
    state.enemies[0].hp = 1;
    if (source === 'spear') engine.useConsumable(state, 'spear', { rng: () => 0 });
    const result = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 1, rng: () => 0 });
    assert.equal(state.snowAreaCleared, true);
    assert.equal(result.snowAreaCleared, true);
  }
  const forest = create();
  engine.resolveProjectile(forest, { hitIds: [forest.enemies[0].id], damage: 4 });
  assert.equal(forest.snowAreaCleared, false);
});

test('duplicate Alchemist stones do not award cookie-specific item points', () => {
  const state = create(['alchemist-candy', 'alchemist-candy'], { inventory: { heal: 1 } });
  const result = engine.useConsumable(state, 'heal', { rng: () => 0 });
  assert.equal(result.effect.healed, 0);
  assert.equal(result.scoreDelta, 0);
  assert.equal(state.effectCounters.consumablesUsed, 1);
});

test('invalid target does not spend the Wind charge and duplicate Wind copies cannot home twice', () => {
  const state = create(['wind-candy', 'wind-candy'], { area: 'forest', round: 2 });
  engine.resolveProjectile(state, { selectedTargetId: 'missing', hitIds: [], damage: 1, rng: () => 0 });
  assert.equal(state.roundEffects.windHomingUsed, false);
  const target = state.enemies[0];
  assert.equal(engine.resolveProjectile(state, { selectedTargetId: target.id, hitIds: [], damage: 1, rng: () => 0 }).missed, false);
  assert.equal(engine.resolveProjectile(state, { selectedTargetId: target.id, hitIds: [], damage: 1, rng: () => 0 }).missed, true);
});

test('Fireball rejects a second preparation item and doubles the next permanent shot only', () => {
  const state = create(['adventurer-candy'], { area: 'city', round: 2, inventory: { fireball: 1, spear: 1 } });
  state.enemies.forEach(e => { e.hp = e.maxHp = 20; });
  engine.useConsumable(state, 'fireball', { rng: () => 0 });
  assert.equal(engine.useConsumable(state, 'spear', { rng: () => 0 }).reason, 'item-used');
  assert.equal(state.inventory.spear, 1);
  assert.equal(state.fireballArmed, true);
  const shot = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 3, rng: () => 0 });
  assert.equal(shot.hits[0].damage, 6);
  assert.equal(state.fireballArmed, false);
});

test('normal Oven Robot heals to 18 and a dead player cannot launch another projectile', () => {
  const state = create([], { area: 'city', round: 3 });
  const robot = state.enemies[0];
  robot.hp = 17; robot.attackCount = 2;
  assert.equal(engine.resolveEnemyTurn(state, () => 0).healedEnemy, 1);
  assert.equal(robot.hp, 18);
  state.playerHp = 0;
  const ammo = state.ammo;
  assert.equal(engine.resolveProjectile(state, { damage: 4, hitIds: [robot.id] }).accepted, false);
  assert.equal(state.ammo, ammo);
});

test('bonus waves can contain all five species and reject stale standard reward choices', () => {
  let index = 0;
  const samples = [0, 0.1, 0.3, 0.5, 0.7, 0.9];
  const enemies = engine.createRoundEnemies('chaos', 1, { rng: () => samples[index++ % samples.length] });
  assert.equal(new Set(enemies.map(e => e.kind)).size, 5);
  const state = create([], { area: 'chaos', round: 1 });
  state.terminal = 'round-clear';
  state.rewardChoices = { weapons: [{ ...weapon('wizard-orb'), choiceId: 'stale' }], consumables: [] };
  const before = structuredClone(state);
  assert.equal(engine.applyRewardChoice(state, 'weapon', 'stale').reason, 'no-reward');
  assert.deepEqual(state, before);
});

test('a complete main run spins rewards, clears both camps, and finishes Chaos', () => {
  const state = create(['adventurer-candy'], { inventory: { heal: 1 }, now: 0 });
  const visited = [];
  for (let action = 0; action < 9; action++) {
    visited.push(`${state.area}:${state.round}`);
    const shot = engine.resolveProjectile(state, { damage: 100, hitIds: state.enemies.map(e => e.id), rng: () => 0 });
    assert.equal(shot.roundCleared, true);
    const rewards = engine.drawRewardChoices(state, () => 0.5);
    assert.equal(engine.spinRewardSlot(state, 'stone', () => 0.5).accepted, true);
    if (rewards.consumables.length) {
      assert.equal(engine.applyRewardChoice(state, 'consumable', rewards.consumables[0].choiceId).accepted, true);
    }
    const next = engine.advanceRound(state, { rng: () => 0, now: 1000 + action });
    assert.equal(next.accepted, true);
    if (next.pendingCamp) assert.equal(engine.chooseCampReward(state, 'heal', { rng: () => 0 }).accepted, true);
  }
  assert.equal(visited.length, 9);
  assert.deepEqual(visited.filter(value => value.endsWith(':3')), ['forest:3', 'snow:3', 'city:3']);
  assert.equal(state.terminal, 'clear');
  assert.equal(state.snowAreaCleared, true);
  const main = engine.getRunSummary(state);
  const items = { ...state.inventory };
  const weapons = structuredClone(state.weapons);
  assert.equal(engine.startBonusRoute(state, { rng: () => 0 }).accepted, true);
  for (let round = 1; round <= 3; round++) {
    const result = engine.resolveProjectile(state, { damage: 100, hitIds: state.enemies.map(e => e.id), rng: () => 0 });
    assert.equal(result.roundCleared, true);
    if (round < 3) {
      engine.drawRewardChoices(state, () => 0);
      engine.spinRewardSlot(state, 'stone', () => 0);
      const misses = [0, .25, .5, .75, .5, .25, .25, .75, 0];
      let index = 0;
      engine.spinRewardSlot(state, 'consumable', () => misses[index++]);
      assert.equal(engine.advanceRound(state, { rng: () => 0 }).accepted, true);
    }
  }
  assert.equal(state.terminal, 'bonus-clear');
  assert.equal(engine.getRunSummary(state).finalScore, main.finalScore);
  assert.ok(state.bonusScore > 0);
  assert.ok(Object.keys(items).every(key => state.inventory[key] >= items[key]));
  assert.equal(state.weapons.length, weapons.length + 2);
});
