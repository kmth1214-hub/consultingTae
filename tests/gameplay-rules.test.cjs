const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/js/battle-engine.js');

const weapon = (id, grade = 'C') => ({ ...engine.WEAPON_CATALOG.find(item => item.id === id), grade });
const create = (ids = ['adventurer-candy'], options = {}) => engine.createRunState({
  weapons: ids.map(id => weapon(id)), inventory: {}, rng: () => 0, ...options
});
function sturdyEnemy(state) {
  state.enemies[0].hp = state.enemies[0].maxHp = 100;
  return state.enemies[0].id;
}
function clearCity() {
  const state = create(['adventurer-candy'], { area: 'city', round: 5, score: 100, now: 0 });
  state.terminal = 'round-clear';
  const rewards = engine.drawRewardChoices(state, () => 0.5);
  engine.applyRewardChoice(state, 'weapon', rewards.weapons[0].choiceId, { mergeDuplicate: false });
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

test('Adventurer awards one +10 per third colliding projectile despite duplicate owned copies', () => {
  const state = create(['adventurer-candy', 'adventurer-candy']);
  const id = sturdyEnemy(state);
  let result;
  for (let i = 0; i < 3; i++) result = engine.resolveProjectile(state, { hitIds: [id, id], damage: 1, rng: () => 0 });
  assert.equal(state.score, 13);
  assert.equal(result.scoreDelta, 11);
  assert.equal(state.effectCounters.permanentWeaponHits, 3);
  assert.equal(state.effectCounters.projectileCollisions, 3);
});

test('zero damage counts as a collision and Wizard boosts the third collision without stacking', () => {
  const state = create(['wizard-orb', 'wizard-orb']);
  const id = sturdyEnemy(state);
  const damage = Array.from({ length: 3 }, () => engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => 0 }).hits[0].damage);
  assert.deepEqual(damage, [0, 0, 1]);
  assert.equal(state.score, 1);
  assert.equal(state.effectCounters.projectileCollisions, 3);
});

test('one projectile counts successive spillover collisions, but stops at a surviving enemy', () => {
  const state = create(['wizard-orb'], { area: 'forest', round: 4 });
  state.enemies[0].hp = 1;
  state.enemies[1].hp = 1;
  const result = engine.resolveProjectile(state, { hitIds: state.enemies.map(e => e.id), damage: 3, rng: () => 0 });
  assert.deepEqual(result.hits.map(e => e.damage), [1, 1, 2]);
  assert.equal(state.effectCounters.permanentWeaponHits, 1);
  assert.equal(state.effectCounters.projectileCollisions, 3);
});

test('Milk heals at the third collision, caps HP, and keeps counters across area transitions', () => {
  const state = create(['milk-candy'], { playerHp: 50 });
  const id = sturdyEnemy(state);
  for (let i = 0; i < 2; i++) engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => 0 });
  const third = engine.resolveProjectile(state, { hitIds: [id], damage: 0, rng: () => 0 });
  assert.equal(third.healedPlayer, 1);
  assert.equal(state.playerHp, 48);
  state.area = 'forest'; state.round = 5; state.pendingCamp = true;
  engine.chooseCampReward(state, 'heal', { rng: () => 0 });
  assert.equal(state.effectCounters.projectileCollisions, 3);
  state.effectCounters.projectileCollisions = 5;
  assert.equal(engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 0, rng: () => 0 }).healedPlayer, 0);
  assert.equal(state.playerHp, 99);
});

test('Defense takes priority over Milk boss protection; Milk cancels the next whole attack once', () => {
  const state = create(['milk-candy', 'milk-candy'], { area: 'city', round: 5, inventory: { defense: 1 } });
  state.enemies[0].attackCount = 2;
  const defense = engine.useConsumable(state, 'defense', { rng: () => 0 });
  assert.equal(defense.enemyAttack.blockedBy, 'defense');
  assert.equal(state.roundEffects.milkBossBlockUsed, false);
  state.enemies[0].attackCount = 5;
  const passive = engine.resolveEnemyTurn(state, () => 0);
  assert.equal(passive.blockedBy, 'milk');
  assert.equal(passive.special, null);
  assert.equal(passive.ammoLost, 0);
  assert.equal(state.roundEffects.milkBossBlockUsed, true);
  assert.equal(engine.resolveEnemyTurn(state, () => 0).blocked, false);
});

test('Wind guarantees the selected boss first once per round and carries its damage onward', () => {
  const state = create(['wind-candy'], { area: 'chaos', round: 3 });
  const [boar, , robot] = state.enemies;
  robot.hp = 1;
  const hit = engine.resolveProjectile(state, { selectedTargetId: robot.id, hitIds: [boar.id, robot.id], damage: 3, rng: () => 0 });
  assert.deepEqual(hit.hits.map(e => e.id), [robot.id, boar.id]);
  assert.deepEqual(hit.hits.map(e => e.damage), [1, 3]);
  assert.equal(state.roundEffects.windHomingUsed, true);
  const miss = engine.resolveProjectile(state, { selectedTargetId: boar.id, hitIds: [], damage: 3, rng: () => 0 });
  assert.equal(miss.missed, true);
  assert.equal(state.bonusScore, 4);
});

test('round transitions reset Wind and Milk flags but retain run effect counters', () => {
  const state = create(['wind-candy', 'milk-candy']);
  state.roundEffects.windHomingUsed = true;
  state.roundEffects.milkBossBlockUsed = true;
  state.effectCounters.permanentWeaponHits = 8;
  state.terminal = 'round-clear';
  state.selectedRewards = { weapon: 'done', consumable: 'done' };
  engine.advanceRound(state, { rng: () => 0 });
  assert.deepEqual(state.roundEffects, { windHomingUsed: false, milkBossBlockUsed: false });
  assert.equal(state.effectCounters.permanentWeaponHits, 8);
});

test('Spear gets Alchemist use points but no permanent collision, Wizard, Milk heal, or Wind effect', () => {
  const state = create(engine.WEAPON_CATALOG.map(w => w.id), { area: 'forest', round: 4, inventory: { spear: 1 }, playerHp: 50 });
  state.enemies.forEach(e => { e.hp = e.maxHp = 10; });
  state.effectCounters.permanentWeaponHits = 2;
  state.effectCounters.projectileCollisions = 2;
  const event = engine.useConsumable(state, 'spear', { rng: () => 0.5 });
  assert.deepEqual(event.hits.map(e => e.damage), [4, 3, 2]);
  assert.equal(event.scoreDelta, 19);
  assert.equal(state.score, 19);
  assert.equal(state.ammo, 9);
  assert.deepEqual(state.effectCounters, { permanentWeaponHits: 2, projectileCollisions: 2, consumablesUsed: 1 });
  assert.equal(state.roundEffects.windHomingUsed, false);
  assert.equal(state.playerHp, 45);
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
  const state = create(['wizard-orb']);
  const id = sturdyEnemy(state);
  const rolls = Array.from({ length: 4 }, () => engine.resolveProjectile(state, { hitIds: [id], rng: () => 0 }).damage);
  assert.deepEqual(rolls, [0, 0, 1, 1]);
  assert.equal(state.zeroRollsThisRound, 2);
});

test('fusion prompts have no side effects; declining keeps copies; C cannot merge with B', () => {
  const state = create();
  state.terminal = 'round-clear';
  const choice = { ...weapon('adventurer-candy'), choiceId: 'weapon:test' };
  state.rewardChoices = { weapons: [choice], consumables: [] };
  const before = structuredClone(state);
  const prompt = engine.applyRewardChoice(state, 'weapon', choice.choiceId);
  assert.equal(prompt.reason, 'fusion-decision-required');
  assert.equal(prompt.fusionCandidate.grade, 'C');
  assert.deepEqual(state, before);
  assert.equal(engine.applyRewardChoice(state, 'weapon', choice.choiceId, { mergeDuplicate: false }).accepted, true);
  assert.deepEqual(state.weapons.map(w => w.grade), ['C', 'C']);
  const other = create([], { weapons: [weapon('adventurer-candy', 'B')] });
  const added = engine.grantWeapon(other, weapon('adventurer-candy', 'C'));
  assert.equal(added.fused, false);
  assert.deepEqual(other.weapons.map(w => w.grade), ['B', 'C']);
});

test('camp duplicate offers a stable fusion choice without rerolling or silently upgrading', () => {
  const state = create(['alchemist-candy']);
  state.area = 'forest'; state.round = 5; state.pendingCamp = true;
  const first = engine.chooseCampReward(state, 'weapon', { rng: () => 0.5 });
  assert.equal(first.pendingCamp, true);
  assert.equal(first.requiresFusionChoice, true);
  assert.equal(state.weapons[0].grade, 'C');
  const plannedNames = state.pendingCampReward.items.map(item => item.name);
  const beforeRejectedChoice = structuredClone(state);
  assert.equal(engine.chooseCampReward(state, 'heal').reason, 'camp-choice-locked');
  assert.deepEqual(state, beforeRejectedChoice);
  let result = engine.chooseCampReward(state, 'weapon', { mergeDuplicate: true, rng: () => 0 });
  if (result.requiresFusionChoice) result = engine.chooseCampReward(state, 'weapon', { mergeDuplicate: false, rng: () => 0 });
  assert.equal(result.area, 'snow');
  assert.equal(state.weapons.some(w => w.grade === 'B'), true);
  assert.deepEqual(result.effect.weapons.map(item => item.name), plannedNames);
});

test('Chaos waves use 9–13 regular monsters and round three has the three independent bosses', () => {
  assert.equal(engine.createRoundEnemies('chaos', 1, { rng: () => 0 }).length, 9);
  const many = engine.createRoundEnemies('chaos', 2, { rng: () => 0.999 });
  assert.equal(many.length, 13);
  assert.equal(many.every(e => e.kind === 'washing-robot' && e.hp === 4), true);
  const bosses = engine.createRoundEnemies('chaos', 3);
  assert.deepEqual(bosses.map(e => [e.kind, e.hp, e.maxHp, e.attackCount]), [
    ['pointy-boar', 15, 15, 0], ['cowardly-snowman', 18, 18, 0], ['oven-robot', 23, 26, 0]
  ]);
  for (const round of [0, 4, NaN]) assert.throws(() => engine.createRoundEnemies('chaos', round), RangeError);
});

test('Chaos bosses use their own third-attack specials and Oven Robot heals only to 26', () => {
  const state = create(['adventurer-candy'], { area: 'chaos', round: 3 });
  const attacks = Array.from({ length: 9 }, () => engine.resolveEnemyTurn(state, () => 0));
  assert.deepEqual(attacks.slice(6).map(e => e.special), ['boar-charge', 'frozen-breath', 'oven-overheat']);
  assert.deepEqual(state.enemies.map(e => e.attackCount), [3, 3, 3]);
  assert.equal(state.enemies[2].hp, 26);
  assert.equal(state.ammo, 8);
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
  assert.equal(state.ammo, 9);
  assert.deepEqual(state.inventory, inventory);
  assert.equal(engine.startBonusRoute(state).accepted, false);
  const item = Object.keys(state.inventory).find(key => state.inventory[key] > 0);
  engine.useConsumable(state, item, { rng: () => 0 });
  assert.equal(engine.getRunSummary(state, 3000).finalScore, main.finalScore);
  assert.equal(state.score, main.score);
});

test('Chaos projectile and item damage use normal scoring in bonusScore only', () => {
  const state = create([], { area: 'chaos', round: 1, score: 50, weapons: [weapon('wizard-orb', 'B')], inventory: { spear: 1 } });
  const shot = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 3, rng: () => 0 });
  assert.equal(shot.scoreDelta, 6);
  assert.equal(state.bonusScore, 6);
  engine.useConsumable(state, 'spear', { rng: () => 0.5 });
  assert.equal(state.bonusScore, 12); // remaining 1 HP, then 3 HP and 2 HP, at 1x
  assert.equal(state.score, 50);
});

test('Chaos transitions bypass every reward/camp, refresh ammo, and end at bonus-clear', () => {
  const state = create([], { area: 'chaos', round: 1 });
  const inventoryBefore = { ...state.inventory };
  const weaponsBefore = structuredClone(state.weapons);
  for (let round = 1; round <= 2; round++) {
    state.terminal = 'round-clear'; state.ammo = 1;
    assert.equal(engine.drawRewardChoices(state, () => 0), null);
    assert.equal(engine.advanceRound(state, { rng: () => 0 }).round, round + 1);
    assert.equal(state.ammo, 9);
    assert.equal(state.pendingCamp, false);
    assert.equal(state.rewardChoices, null);
  }
  const finish = engine.resolveProjectile(state, { hitIds: state.enemies.map(e => e.id), damage: 100, rng: () => 0 });
  assert.equal(finish.bonusCleared, true);
  assert.equal(state.terminal, 'bonus-clear');
  assert.equal(engine.drawRewardChoices(state), null);
  assert.equal(engine.resolveProjectile(state, { damage: 1 }).accepted, false);
  assert.deepEqual(state.inventory, inventoryBefore);
  assert.deepEqual(state.weapons, weaponsBefore);
});

test('Snow boss clear emits an unlock flag for projectile and Spear, but Forest does not', () => {
  for (const source of ['projectile', 'spear']) {
    const state = create([], { area: 'snow', round: 5, inventory: { spear: 1 } });
    state.enemies[0].hp = 1;
    const result = source === 'spear'
      ? engine.useConsumable(state, 'spear', { rng: () => 0 })
      : engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 1, rng: () => 0 });
    assert.equal(state.snowAreaCleared, true);
    assert.equal(result.snowAreaCleared, true);
  }
  const forest = create();
  engine.resolveProjectile(forest, { hitIds: [forest.enemies[0].id], damage: 4 });
  assert.equal(forest.snowAreaCleared, false);
});

test('duplicate Alchemist effects award +10 once per accepted item even if it heals zero', () => {
  const state = create(['alchemist-candy', 'alchemist-candy'], { inventory: { heal: 1 } });
  const result = engine.useConsumable(state, 'heal', { rng: () => 0 });
  assert.equal(result.effect.healed, 0);
  assert.equal(result.scoreDelta, 10);
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

test('Fireball waits through Spear and doubles the next permanent shot only', () => {
  const state = create(['adventurer-candy'], { area: 'forest', round: 4, inventory: { fireball: 1, spear: 1 } });
  state.enemies.forEach(e => { e.hp = e.maxHp = 20; });
  engine.useConsumable(state, 'fireball', { rng: () => 0 });
  engine.useConsumable(state, 'spear', { rng: () => 0 });
  assert.equal(state.fireballArmed, true);
  const shot = engine.resolveProjectile(state, { hitIds: [state.enemies[0].id], damage: 3, rng: () => 0 });
  assert.equal(shot.hits[0].damage, 6);
  assert.equal(state.fireballArmed, false);
});

test('normal Oven Robot heals to 18 and a dead player cannot launch another projectile', () => {
  const state = create([], { area: 'city', round: 5 });
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

test('a complete main run can choose rewards, clear both camps, and finish bonus without adding rewards', () => {
  const state = create(['adventurer-candy'], { inventory: { heal: 1 }, now: 0 });
  const visited = [];
  for (let action = 0; action < 15; action++) {
    visited.push(`${state.area}:${state.round}`);
    const shot = engine.resolveProjectile(state, { damage: 100, hitIds: state.enemies.map(e => e.id), rng: () => 0 });
    assert.equal(shot.roundCleared, true);
    const rewards = engine.drawRewardChoices(state, () => 0.5);
    assert.equal(engine.applyRewardChoice(state, 'weapon', rewards.weapons[0].choiceId, { mergeDuplicate: false }).accepted, true);
    if (rewards.consumables.length) {
      assert.equal(engine.applyRewardChoice(state, 'consumable', rewards.consumables[0].choiceId).accepted, true);
    }
    const next = engine.advanceRound(state, { rng: () => 0, now: 1000 + action });
    assert.equal(next.accepted, true);
    if (next.pendingCamp) assert.equal(engine.chooseCampReward(state, 'heal', { rng: () => 0 }).accepted, true);
  }
  assert.equal(visited.length, 15);
  assert.deepEqual(visited.filter(value => value.endsWith(':5')), ['forest:5', 'snow:5', 'city:5']);
  assert.equal(state.terminal, 'clear');
  assert.equal(state.snowAreaCleared, true);
  const main = engine.getRunSummary(state);
  const items = { ...state.inventory };
  const weapons = structuredClone(state.weapons);
  assert.equal(engine.startBonusRoute(state, { rng: () => 0 }).accepted, true);
  for (let round = 1; round <= 3; round++) {
    const result = engine.resolveProjectile(state, { damage: 100, hitIds: state.enemies.map(e => e.id), rng: () => 0 });
    assert.equal(result.roundCleared, true);
    if (round < 3) assert.equal(engine.advanceRound(state, { rng: () => 0 }).accepted, true);
  }
  assert.equal(state.terminal, 'bonus-clear');
  assert.equal(engine.getRunSummary(state).finalScore, main.finalScore);
  assert.ok(state.bonusScore > 0);
  assert.deepEqual(state.inventory, items);
  assert.deepEqual(state.weapons, weapons);
});
