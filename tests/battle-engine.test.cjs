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

test('main regions keep regular rounds 1–2, put their boss in round 3, and reject other rounds', () => {
  for (const area of ['forest', 'snow', 'city']) {
    for (const round of [1, 2]) {
      assert.equal(engine.createRoundEnemies(area, round).every(enemy => !enemy.isBoss), true);
    }
    const bosses = engine.createRoundEnemies(area, 3);
    assert.equal(bosses.length, 1);
    assert.equal(bosses[0].isBoss, true);
  }
  for (const area of ['forest', 'snow', 'city']) {
    for (const round of [0, 4, 1.5]) assert.throws(() => engine.createRoundEnemies(area, round), RangeError);
  }
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

test('Forest log damages its actual physical target and adds scored hits to the event', () => {
  const state = engine.createRunState({ area: 'forest', round: 2, rng: () => 0 });
  const [dead, target] = state.enemies;
  dead.hp = 0; dead.alive = false;
  target.hp = 2;
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 0, weaponGrade: 'B', rng: () => 0,
    shotMeta: { impactKind: 'ground', directHitTime: 2, contacts: [{ obstacleId: 'forest-log', obstacleKind: 'log',
      time: .5, logHit: { id: target.id, time: 1 }, logEndPose: { x: 1500, y: 860, angle: Math.PI / 2 } }] } });
  assert.equal(event.obstacleEffect.kind, 'log-strike');
  assert.deepEqual(event.obstacleEffect.hits, [{ id: target.id, kind: target.kind, damage: 2, remainingHp: 0, defeated: true, scoreDelta: 4 }]);
  assert.equal(event.hits.length, 1);
  assert.equal(state.score, 4);
  assert.equal(event.roundCleared, true);
  assert.equal(event.enemyAttack, null);
});

test('Snow ice halves the next attack once and a blocked attack consumes the guard', () => {
  const state = engine.createRunState({ area: 'snow', round: 1, rng: () => 0 });
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 0, rng: () => .999,
    shotMeta: { impactKind: 'obstacle', obstacleId: 'ice-1', obstacleKind: 'ice', obstacleTargetIds: [], rolling: false, reverse: false } });
  assert.equal(event.obstacleEffect.damageReduction, .5);
  assert.equal(event.enemyAttack.damage, 4);
  assert.equal(event.enemyAttack.damageReduction, .5);
  assert.equal(state.nextAttackDamageMultiplier, null);

  state.nextAttackDamageMultiplier = .5;
  state.defenseArmed = true;
  const blocked = engine.resolveEnemyTurn(state, () => .999);
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.damage, 0);
  assert.equal(state.nextAttackDamageMultiplier, null);
});

test('City jars deal injected 1–2 damage to every living enemy and score the actual HP removed', () => {
  const state = engine.createRunState({ area: 'city', round: 1, rng: () => 0 });
  state.enemies = state.enemies.slice(0, 2);
  state.enemies[0].hp = 1;
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 0, weaponGrade: 'C', rng: () => .999,
    shotMeta: { impactKind: 'obstacle', obstacleId: 'jar-stack', obstacleKind: 'crate', obstacleTargetIds: [], rolling: false, reverse: false } });
  assert.equal(event.obstacleEffect.kind, 'jar-burst');
  assert.deepEqual(event.obstacleEffect.hits.map(hit => hit.damage), [1, 2]);
  assert.deepEqual(event.hits.map(hit => hit.scoreDelta), [1, 2]);
  assert.equal(state.score, 3);
});

test('Chaos chooses each obstacle effect from injected RNG, routes score to bonus, and consumes aim inversion on one shot', () => {
  const kinds = ['log-strike', 'ice-guard', 'jar-burst', 'aim-inversion'];
  for (let choice = 0; choice < 4; choice++) {
    const state = engine.createRunState({ area: 'chaos', round: 1, rng: () => 0 });
    state.enemies = [{ id: 'target', kind: 'snake', hp: 10, maxHp: 10, isBoss: false, attackCount: 0, alive: true }];
    const values = [choice / 4, .999, .999, .999];
    let index = 0;
    const rng = () => values[Math.min(index++, values.length - 1)];
    const event = engine.resolveProjectile(state, { hitIds: [], damage: 0, rng,
      shotMeta: { impactKind: 'obstacle', obstacleId: 'chaos-prop', obstacleKind: 'crate', obstacleTargetIds: ['target'], rolling: false, reverse: false } });
    assert.equal(event.obstacleEffect.kind, kinds[choice]);
    assert.equal(state.score, 0);
    if (choice === 0) assert.equal(state.bonusScore, 3);
    if (choice === 1) assert.equal(state.nextAttackDamageMultiplier, null); // consumed by this action's response
    if (choice === 2) assert.equal(state.bonusScore, 2);
    if (choice === 3) {
      assert.equal(state.pendingAimInversion, true);
      const next = engine.resolveProjectile(state, { hitIds: [], damage: 0, aimInversionApplied: true, rng: () => 0 });
      assert.equal(next.accepted, true);
      assert.equal(state.pendingAimInversion, false);
    }
  }
});

test('chained topples resolve once in path order before a direct hit and refresh next round', () => {
  const state = engine.createRunState({ area: 'forest', round: 2, rng: () => 0 });
  const [first, second] = state.enemies;
  first.hp = 12; first.maxHp = 12;
  second.hp = 12; second.maxHp = 12;
  const contacts = [
    { obstacleId: 'stack-a', obstacleKind: 'log', time: .1, logHit: { id: first.id, time: .4 }, logEndPose: {x:1000,y:860,angle:1.57} },
    { obstacleId: 'stack-b', obstacleKind: 'log', time: .2, logHit: { id: second.id, time: .5 }, logEndPose: {x:1500,y:860,angle:1.57} }
  ];
  const shotMeta = { impactKind: 'enemy', contacts, obstacleId: 'stack-a', obstacleKind: 'log',
    obstacleTargetIds: contacts[0].obstacleTargetIds, rolling: false, reverse: false };
  const event = engine.resolveProjectile(state, { hitIds: [first.id], damage: 2, rng: () => 0, shotMeta });
  assert.deepEqual(event.obstacleEffects.map(effect => effect.obstacleId), ['stack-a', 'stack-b']);
  assert.deepEqual(event.hits.map(hit => [hit.id, hit.damage]), [[first.id, 3], [second.id, 3], [first.id, 2]]);
  assert.deepEqual(state.toppledObstacleIds, ['stack-a', 'stack-b']);
  assert.equal(state.score, 8);
  assert.equal(state.ammo, 8);
  assert.ok(event.enemyAttack);
  const repeated = engine.resolveProjectile(state, { hitIds: [], damage: 0, rng: () => 0, shotMeta });
  assert.deepEqual(repeated.obstacleEffects, []);
  assert.equal(state.score, 8);
  assert.deepEqual(state.toppledObstacleIds, ['stack-a', 'stack-b']);
  state.terminal = 'round-clear';
  state.selectedRewards = { weapon: 'chosen', consumable: 'chosen' };
  assert.equal(engine.advanceRound(state, { rng: () => 0 }).accepted, true);
  assert.deepEqual(state.toppledObstacleIds, []);
  assert.deepEqual(state.forestLogDebris, []);
});

test('Forest misses cannot use nearest targets, and physical hits after a killing candy never retarget', () => {
  const state = engine.createRunState({ area: 'forest', round: 2, rng: () => 0 });
  const [first, second] = state.enemies;
  const miss = engine.resolveProjectile(state, { damage: 0, hitIds: [], rng: () => 0,
    shotMeta: { impactKind: 'obstacle', obstacleId: 'remote', obstacleKind: 'log', obstacleTargetIds: [first.id] } });
  assert.equal(miss.obstacleEffect.hits.length, 0);
  assert.equal(first.hp, 4);
  first.hp = 2;
  const event = engine.resolveProjectile(state, { damage: 2, hitIds: [first.id], rng: () => 0,
    shotMeta: { directHitTime: .5, contacts: [{ obstacleId: 'late', obstacleKind: 'log', time: .1,
      logHit: { id: first.id, time: 1 }, obstacleTargetIds: [second.id] }] } });
  assert.deepEqual(event.hits.map(hit => hit.id), [first.id]);
  assert.equal(second.hp, 4);
  assert.equal(event.obstacleEffect.hits.length, 0);
});

test('a new Chaos inversion from this topple remains armed after consuming the prior inversion', () => {
  const state = engine.createRunState({ area: 'chaos', round: 1, rng: () => 0 });
  state.pendingAimInversion = true;
  const event = engine.resolveProjectile(state, { hitIds: [], damage: 0,
    aimInversionApplied: true, rng: () => .999,
    shotMeta: { impactKind: 'ground', contacts: [{ obstacleId: 'chaos-new', obstacleKind: 'ice',
      obstacleTargetIds: [] }], obstacleId: 'chaos-new', obstacleKind: 'ice',
      obstacleTargetIds: [], rolling: false, reverse: true } });
  assert.equal(event.obstacleEffects[0].kind, 'aim-inversion');
  assert.equal(state.pendingAimInversion, true);
});

test('boss special attack replaces the normal attack on its third attack', () => {
  const state = engine.createRunState({ area: 'forest', round: 3 });
  const boss = state.enemies[0];
  state.playerHp = 100;
  engine.resolveEnemyTurn(state, () => 0);
  engine.resolveEnemyTurn(state, () => 0);
  const event = engine.resolveEnemyTurn(state, () => 0);
  assert.equal(boss.attackCount, 3);
  assert.equal(event.special, 'boar-charge');
  assert.equal(event.damage, 8);
});

test('Heal spends one item and restores 25 without advancing combat or inviting a counterattack', () => {
  const state = engine.createRunState({ playerHp: 60, inventory: { heal: 1 }, rng: () => 0.5 });
  const event = engine.useConsumable(state, 'heal', { rng: () => 0.5 });
  assert.equal(event.accepted, true);
  assert.equal(event.effect.healed, 25);
  assert.equal(state.playerHp, 85);
  assert.equal(engine.getConsumableCount(state, 'heal'), 0);
  assert.equal(state.turnNumber, 0);
  assert.equal(event.enemyAttack, null);
  assert.equal(state.consumableUsedSinceShot, true);
});

test('Defense stays armed until the next fired candy triggers the boss special', () => {
  const state = engine.createRunState({ area: 'forest', round: 3, inventory: { defense: 1 }, rng: () => 0.99 });
  state.enemies[0].attackCount = 2;
  const event = engine.useConsumable(state, 'defense', { rng: () => 0.99 });
  assert.equal(event.enemyAttack, null);
  assert.equal(state.defenseArmed, true);
  assert.equal(state.enemies[0].attackCount, 2);
  const shot = engine.resolveProjectile(state, { damage: 0, hitIds: [], rng: () => .99 });
  assert.equal(shot.enemyAttack.blocked, true);
  assert.equal(shot.enemyAttack.special, null);
  assert.equal(state.defenseArmed, false);
  assert.equal(state.playerHp, 100);
  assert.equal(state.enemies[0].attackCount, 3);
});

test('all consumables preserve the ammo queue, enemy order, boss count and turn; only Spear draws damage RNG', () => {
  for (const key of ['heal', 'defense', 'fireball', 'spear']) {
    const state = engine.createRunState({ area: 'forest', round: 3, playerHp: 50,
      inventory: { heal: 2, defense: 2, fireball: 2, spear: 2 }, rng: () => .5 });
    const queue = state.weaponQueue.slice(), current = state.currentWeaponId;
    let draws = 0;
    const result = engine.useConsumable(state, key, { rng: () => { draws++; return .5; } });
    assert.equal(result.accepted, true);
    assert.equal(result.enemyAttack, null);
    assert.equal(state.playerHp, key === 'heal' ? 75 : 50);
    assert.equal(state.turnNumber, 0);
    assert.equal(state.ammo, 9);
    assert.equal(state.enemyTurnIndex, 0);
    assert.equal(state.enemies[0].attackCount, 0);
    assert.deepEqual(state.weaponQueue, queue);
    assert.equal(state.currentWeaponId, current);
    assert.equal(state.effectCounters.consumablesUsed, 1);
    assert.equal(draws, key === 'spear' ? 1 : 0);
  }
});

test('one preparation item is shared by all kinds until a successful shot, and rejected uses mutate nothing', () => {
  const state = engine.createRunState({ inventory: { heal: 2, defense: 2 }, rng: () => .5 });
  engine.useConsumable(state, 'heal', { rng: () => .5 });
  const before = structuredClone(state);
  for (const key of ['heal', 'defense']) {
    assert.equal(engine.useConsumable(state, key, { rng: () => { throw new Error('unexpected RNG'); } }).reason, 'item-used');
    assert.deepEqual(state, before);
  }
  assert.equal(engine.useConsumable(state, 'defense', { isAiming: true }).reason, 'aiming');
  assert.deepEqual(state, before);
  engine.resolveProjectile(state, { hitIds: [], damage: 0, rng: () => .5 });
  assert.equal(state.consumableUsedSinceShot, false);
  assert.equal(engine.useConsumable(state, 'defense', { rng: () => .5 }).accepted, true);
});

test('a Spear clear grants the next round a fresh preparation slot without retaliation', () => {
  const state = engine.createRunState({ area: 'chaos', round: 1, inventory: { spear: 2 }, rng: () => .5 });
  state.enemies = state.enemies.slice(0, 1);
  state.enemies[0].hp = 1;
  const event = engine.useConsumable(state, 'spear', { rng: () => .5 });
  assert.equal(event.roundCleared, true);
  assert.equal(event.enemyAttack, null);
  assert.equal(state.consumableUsedSinceShot, true);
  engine.advanceRound(state, { rng: () => .5 });
  assert.equal(state.round, 2);
  assert.equal(state.consumableUsedSinceShot, false);
});

test('Fireball doubles only the next permanent projectile and preserves a zero roll', () => {
  const state = engine.createRunState({ inventory: { fireball: 1 }, rng: () => 0.5 });
  engine.useConsumable(state, 'fireball', { rng: () => 0.5 });
  assert.equal(state.fireballArmed, true);
  const zero = engine.resolveProjectile(state, { damage: 0, hitIds: [state.enemies[0].id], rng: () => 0.5 });
  assert.equal(zero.damage, 0);
  assert.equal(state.fireballArmed, false);
  assert.equal(engine.getConsumableCount(state, 'fireball'), 0);
});

test('Spear hits up to three enemies with falling damage, even when a target survives', () => {
  const state = engine.createRunState({ area: 'city', round: 2, inventory: { spear: 2 }, rng: () => 0.5 });
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

test('reward choices are unique and progression waits for both categories', () => {
  const state = engine.createRunState({ ammo: 2, playerHp: 73, score: 15, now: 100 });
  state.terminal = 'round-clear';
  const choices = engine.drawRewardChoices(state, () => 0.5);
  assert.equal(new Set(choices.weapons.map((choice) => choice.id)).size, 3);
  assert.equal(new Set(choices.consumables.map((choice) => choice.id)).size, 3);
  assert.equal(engine.advanceRound(state).reason, 'rewards-incomplete');
  assert.equal(engine.applyRewardChoice(state, 'weapon', choices.weapons[0].choiceId, { mergeDuplicate: true }).accepted, true);
  assert.equal(engine.advanceRound(state).reason, 'rewards-incomplete');
  assert.equal(engine.applyRewardChoice(state, 'consumable', choices.consumables[0].choiceId).accepted, true);
  const next = engine.advanceRound(state, { now: 200, rng: () => 0.5 });
  assert.deepEqual([next.area, next.round], ['forest', 2]);
  assert.equal(state.ammo, 9);
  assert.equal(state.playerHp, 73);
  assert.equal(state.score, 15);
});

test('matching C and B copies require an explicit fusion decision, while A copies remain separate', () => {
  const state = engine.createRunState();
  state.terminal = 'round-clear';
  let choices = engine.drawRewardChoices(state, () => 0.1);
  let adventurer = choices.weapons.find((choice) => choice.id === 'adventurer-candy');
  if (!adventurer) { adventurer = Object.assign({},engine.WEAPON_CATALOG[0],{choiceId:'weapon:adventurer-candy'}); state.rewardChoices.weapons[0] = adventurer; }
  assert.equal(engine.applyRewardChoice(state, 'weapon', adventurer.choiceId).reason, 'fusion-decision-required');
  engine.applyRewardChoice(state, 'weapon', adventurer.choiceId, { mergeDuplicate: true });
  assert.equal(state.weapons[0].grade, 'B');
  assert.equal(engine.applyRewardChoice(state, 'weapon', adventurer.choiceId).reason, 'already-selected');
  choices=engine.drawRewardChoices(state,()=>0.1);adventurer=choices.weapons.find((choice)=>choice.id==='adventurer-candy');
  if(!adventurer){adventurer=Object.assign({},engine.WEAPON_CATALOG[0],{choiceId:'weapon:adventurer-candy'});state.rewardChoices.weapons[0]=adventurer;}
  adventurer.grade = 'B';
  engine.applyRewardChoice(state,'weapon',adventurer.choiceId, { mergeDuplicate: true });
  assert.equal(state.weapons[0].grade,'A');
  state.selectedRewards.weapon=null;choices=engine.drawRewardChoices(state,()=>0.1);adventurer=choices.weapons.find((choice)=>choice.id==='adventurer-candy');
  if(!adventurer){adventurer=Object.assign({},engine.WEAPON_CATALOG[0],{choiceId:'weapon:adventurer-candy'});state.rewardChoices.weapons[0]=adventurer;}
  adventurer.grade = 'A';
  engine.applyRewardChoice(state,'weapon',adventurer.choiceId);
  assert.equal(state.weapons.length,2);
});

test('camp healing enters Snow round 1 with refreshed ammo and preserved run progress', () => {
  const state = engine.createRunState({ playerHp: 50, ammo: 3, score: 100 });
  state.area = 'forest'; state.round = 3; state.terminal = 'round-clear';
  const choices = engine.drawRewardChoices(state, () => 0.5);
  engine.applyRewardChoice(state, 'weapon', choices.weapons[0].choiceId, { mergeDuplicate: true });
  engine.applyRewardChoice(state, 'consumable', choices.consumables[0].choiceId);
  assert.equal(engine.advanceRound(state).pendingCamp, true);
  const camp = engine.chooseCampReward(state, 'heal', { now: 500, rng: () => 0.5 });
  assert.deepEqual([camp.area, camp.round], ['snow', 1]);
  assert.equal(state.playerHp, 100);
  assert.equal(state.ammo, 9);
  assert.equal(state.score, 100);
  assert.equal(state.enemies.length, 5);
});

test('City boss reward completion produces a live clear summary', () => {
  const state = engine.createRunState({ area: 'city', round: 3, score: 432, now: 1000 });
  state.terminal = 'round-clear';
  const choices = engine.drawRewardChoices(state, () => 0.5);
  engine.applyRewardChoice(state, 'weapon', choices.weapons[0].choiceId, { mergeDuplicate: true });
  engine.applyRewardChoice(state, 'consumable', choices.consumables[0].choiceId);
  const result = engine.advanceRound(state, { now: 5000 });
  assert.equal(result.terminal, 'clear');
  assert.equal(result.summary.score, 432);
  assert.equal(result.summary.finalScore, 434); // one starter item plus the chosen reward
  assert.equal(result.summary.durationMs, 4000);
});

test('main progression rejects advancing an out-of-range round', () => {
  const state = engine.createRunState({ area: 'forest', round: 1 });
  state.round = 4;
  state.terminal = 'round-clear';
  assert.deepEqual(engine.advanceRound(state), { accepted: false, reason: 'invalid-round' });
});

test('a full consumable slot is excluded from reward choices and cannot exceed three', () => {
  const state = engine.createRunState({ inventory:{fireball:3,spear:3,defense:3,heal:3} });
  assert.equal(engine.addConsumable(state,'heal',1),0);
  state.terminal='round-clear';
  const choices=engine.drawRewardChoices(state,()=>0.5);
  assert.equal(choices.consumables.length,0);
  assert.equal(state.selectedRewards.consumable,'skip');
});

test('Oven Robot overheat that removes the final ammo ends the run immediately', () => {
  const state=engine.createRunState({area:'city',round:3,ammo:1,playerHp:100});
  state.enemies[0].attackCount=2;
  const event=engine.resolveEnemyTurn(state,()=>0.5);
  assert.equal(event.special,'oven-overheat');
  assert.equal(state.ammo,0);
  assert.equal(state.terminal,'defeat');
});
