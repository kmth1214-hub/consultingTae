import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameSession } from '../src/game/gameSession.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { monsterPositions } from '../src/game/arenaLayout.js';
import {reserveAt,commitFlight,findPhysicalShot} from './helpers/physical-shot.mjs';

function memoryStorage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
// Only tests inject fixed damage; the shipped controller always uses the engine's weighted roll.
const clearingEngine = { ...BattleEngine,
  resolveProjectile: (run, options) => BattleEngine.resolveProjectile(run, { ...options, damage: 1000 }) };
function start(options = {}) {
  const session = createGameSession({ rng: () => .999, now: () => 1000, storage: memoryStorage(), ...options });
  session.actions.startCharacterSelect();
  session.actions.startRun('adventurer');
  return session;
}
function finishResponse(session) {
  const response = session.getSnapshot().enemyResponse;
  if (response) session.actions.completeEnemyResponse(response.id);
}
function clear(session) {
  const ids = session.getSnapshot().run.enemies.filter(enemy => enemy.alive).map(enemy => enemy.id);
  assert.equal(session.actions.fireShot({ hitIds: ids }).accepted, true);
}
function rewards(session) {
  const { actions } = session;
  let state = session.getSnapshot();
  assert.equal(actions.spinRewardSlot('stone').accepted, true);
  state = session.getSnapshot();
  if (state.run.area === 'chaos') {
    if (state.run.slotReward.consumableSpinsRemaining) assert.equal(actions.spinRewardSlot('consumable').accepted, true);
  } else if (!state.run.selectedRewards.consumable) {
    assert.equal(actions.selectReward('consumable', state.run.rewardChoices.consumables[0].choiceId).accepted, true);
  }
  assert.equal(actions.continueAfterReward().accepted, true);
}

test('account profile blocks play until loaded and never migrates a browser unlock', async () => {
  const storage = memoryStorage();
  storage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true }));
  let reads = 0;
  const session = createGameSession({ storage, profileClient: {
    get: async () => { reads++; if (reads === 1) throw new Error('offline');
      return { version: 1, snowAreaCleared: false }; },
    unlockSnow: async () => ({ version: 1, snowAreaCleared: true })
  } });
  assert.equal(session.getSnapshot().profile.snowAreaCleared, false);
  assert.equal(session.actions.startCharacterSelect().reason, 'profile-unavailable');
  assert.equal((await session.actions.loadAccountProfile()).accepted, false);
  assert.equal(session.getSnapshot().profileStatus, 'load-error');
  assert.equal((await session.actions.loadAccountProfile()).accepted, true);
  assert.equal(session.getSnapshot().profileStatus, 'ready');
  session.actions.startCharacterSelect();
  assert.equal(session.actions.startRun('milk').reason, 'locked');
});

test('Snow clear save failure holds next-region transition and retry unlocks without replay', async () => {
  let writes = 0;
  const session = createGameSession({ engine: clearingEngine, rng: () => .999, now: () => 1000,
    profileClient: { get: async () => ({ version: 1, snowAreaCleared: false }),
      unlockSnow: async () => { writes++; if (writes === 1) throw new Error('offline');
        return { version: 1, snowAreaCleared: true }; } } });
  await session.actions.loadAccountProfile();
  session.actions.startCharacterSelect();
  session.actions.startRun('adventurer');
  const run = session.getSnapshot().run;
  run.area = 'snow'; run.round = 3;
  const ids = run.enemies.map(enemy => enemy.id);
  session.actions.fireShot({ hitIds: ids });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(session.getSnapshot().profileStatus, 'save-error');
  assert.equal(session.getSnapshot().profileSaveRequired, true);
  assert.equal(session.actions.continueAfterReward().reason, 'profile-unavailable');
  assert.equal((await session.actions.retryProfileSave()).accepted, true);
  assert.equal(session.getSnapshot().profile.snowAreaCleared, true);
  assert.equal(session.getSnapshot().profileSaveRequired, false);
  assert.equal(writes, 2);
});

test('shot review commits one result immediately and blocks inputs and enemy playback until explicitly released', () => {
  const session = start();
  session.actions.fireShot({ reviewResult: true });
  const held = session.getSnapshot(), id = held.shotReview.id;
  assert.equal(held.run.ammo, 2);
  assert.equal(held.screen, 'battle');
  assert.equal(held.enemyResponse.stage, 'windup');
  assert.equal(session.actions.fireShot().reason, 'reviewing');
  assert.equal(session.actions.useConsumable('defense').reason, 'reviewing');
  session.actions.setAim({ phase: 'dragging' });
  assert.equal(session.getSnapshot().aim.phase, 'idle');
  session.actions.advanceEnemyResponse(id, 'travel');
  session.actions.completeEnemyResponse(id);
  assert.equal(session.getSnapshot().enemyResponse.stage, 'windup');
  session.actions.completeShotReview(id + 1);
  assert.equal(session.getSnapshot().shotReview.id, id);
  session.actions.completeShotReview(id);
  assert.equal(session.getSnapshot().shotReview, null);
  assert.deepEqual(session.getSnapshot().run, held.run);
  const released = session.getSnapshot();
  session.actions.completeShotReview(id);
  assert.equal(session.getSnapshot(), released);
  session.actions.advanceEnemyResponse(id, 'travel');
  assert.equal(session.getSnapshot().enemyResponse.stage, 'travel');
});

test('a clearing shot remains on the battle result until review ends and old review ids cannot advance a new run', () => {
  const session = start({ engine: clearingEngine });
  const ids = session.getSnapshot().run.enemies.map(enemy => enemy.id);
  session.actions.fireShot({ hitIds: ids, reviewResult: true });
  const held = session.getSnapshot();
  assert.equal(held.screen, 'battle');
  assert.equal(held.run.terminal, 'round-clear');
  assert.equal(held.enemyResponse, null);
  assert.equal(held.run.enemies.some(enemy => enemy.alive), false);
  session.actions.completeShotReview(held.shotReview.id);
  assert.equal(session.getSnapshot().screen, 'reward');
  session.actions.startCharacterSelect();
  session.actions.startRun('adventurer');
  assert.equal(session.getSnapshot().shotReview, null);
  const fresh = session.getSnapshot();
  session.actions.completeShotReview(held.shotReview.id);
  session.actions.completeShotReview();
  assert.equal(session.getSnapshot(), fresh);
});

test('layout seed is drawn once at each round entry, independently of combat rolls', () => {
  const draws = [.125, .625];
  let layoutCalls = 0, combatCalls = 0;
  const session = start({ engine: clearingEngine,
    rng: () => { combatCalls++; return .999; },
    layoutRng: () => draws[layoutCalls++] });
  const firstSeed = session.getSnapshot().run.layoutSeed;
  assert.equal(firstSeed, 0x20000000);
  assert.equal(layoutCalls, 1);
  const afterStartRolls = combatCalls;
  session.actions.setAim({ angle: 45, power: 60, phase: 'dragging' });
  session.actions.resetAim();
  assert.equal(session.getSnapshot().run.layoutSeed, firstSeed);
  assert.equal(layoutCalls, 1);
  assert.equal(combatCalls, afterStartRolls);
  clear(session);
  assert.equal(session.getSnapshot().run.layoutSeed, firstSeed);
  rewards(session);
  assert.equal(session.getSnapshot().run.layoutSeed, 0xa0000000);
  assert.equal(layoutCalls, 2);
});

test('home selection enforces character locks and publishes fresh snapshots without mutating prior HUD data', () => {
  const session = createGameSession({ rng: () => .999, storage: memoryStorage() });
  assert.equal(session.getSnapshot().screen, 'home');
  assert.equal(session.actions.startRun('adventurer').accepted, false);
  session.actions.startCharacterSelect();
  assert.equal(session.actions.startRun('milk').reason, 'locked');
  assert.equal(session.actions.startRun('adventurer').accepted, true);
  const before = session.getSnapshot();
  assert.equal(before.run.area, 'forest');
  assert.equal(before.run.round, 1);
  let calls = 0;
  const unsubscribe = session.subscribe(() => calls++);
  session.actions.fireShot();
  assert.equal(session.getSnapshot().run.ammo, 2);
  assert.equal(before.run.ammo, 3);
  assert.notEqual(session.getSnapshot().run, before.run);
  assert.equal(calls, 1);
  unsubscribe();
  session.actions.dismissNotification();
  assert.equal(calls, 1);
});

test('reward slot blocks progression until spun, and duplicate spins cannot regrant', () => {
  const session = start({ engine: clearingEngine });
  clear(session);
  const { actions } = session;
  assert.equal(session.getSnapshot().screen, 'reward');
  assert.equal(actions.continueAfterReward().reason, 'rewards-incomplete');
  assert.equal(actions.selectReward('weapon', 'old').accepted, false);
  assert.equal(actions.spinRewardSlot('stone').accepted, true);
  assert.equal(session.getSnapshot().run.weapons.length, 4);
  assert.equal(actions.spinRewardSlot('stone').reason, 'already-selected');
  assert.equal(actions.continueAfterReward().accepted, false);
  actions.selectReward('consumable', session.getSnapshot().run.rewardChoices.consumables[0].choiceId);
  assert.equal(actions.continueAfterReward().accepted, true);
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().run.round, 2);
  assert.equal(session.getSnapshot().run.ammo, 4);
  assert.equal(actions.continueAfterReward().reason, 'invalid-state');
});

test('camp stone choice offers exactly two spins before next region', () => {
  let rolls = 0;
  const session = start({ engine: clearingEngine, rng: () => { rolls++; return .999; } });
  for (let i = 0; i < 3; i++) { clear(session); rewards(session); }
  assert.equal(session.getSnapshot().screen, 'camp');
  assert.equal(session.actions.chooseCampReward('weapon').accepted, true);
  assert.equal(session.getSnapshot().screen, 'camp-slot');
  assert.equal(session.actions.chooseCampReward('heal').accepted, false);
  assert.equal(session.actions.continueAfterCampSlot().accepted, false);
  assert.equal(session.actions.spinRewardSlot('stone').accepted, true);
  assert.equal(session.actions.spinRewardSlot('stone').accepted, true);
  assert.equal(session.actions.spinRewardSlot('stone').accepted, false);
  const beforeConfirm = session.getSnapshot().run.weapons.length, rollsBeforeConfirm = rolls;
  assert.equal(session.actions.continueAfterCampSlot().accepted, true);
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().run.area, 'snow');
  assert.equal(session.getSnapshot().run.ammo, beforeConfirm);
  assert.ok(rolls > rollsBeforeConfirm);
  const rollsAfterEntry = rolls;
  assert.equal(session.actions.continueAfterCampSlot().accepted, false);
  assert.equal(rolls, rollsAfterEntry);
});

test('camp healing enters the next region without extra stone spins', () => {
  const session = start({ engine: clearingEngine, rng: () => 0 });
  for (let i = 0; i < 3; i++) { clear(session); rewards(session); }
  const before = session.getSnapshot().run.weapons.length;
  assert.equal(session.actions.chooseCampReward('heal').accepted, true);
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().run.area, 'snow');
  assert.equal(session.getSnapshot().run.weapons.length, before);
  assert.equal(session.actions.chooseCampReward('weapon').accepted, false);
});

test('9 main rounds, two camps, immediate Snow unlock, frozen result, and 3 bonus rounds follow screen routing', () => {
  const storage = memoryStorage();
  const session = start({ engine: clearingEngine, storage });
  let rewardScreens = 0;
  let camps = 0;
  for (let i = 0; i < 9; i++) {
    clear(session);
    assert.equal(session.getSnapshot().screen, 'reward');
    rewardScreens++;
    if (i === 5) {
      assert.equal(session.getSnapshot().profile.snowAreaCleared, true);
      const reload = createGameSession({ storage });
      assert.equal(reload.getSnapshot().screen, 'home');
      assert.equal(reload.getSnapshot().run, null);
      reload.actions.startCharacterSelect();
      assert.equal(reload.actions.startRun('wind').accepted, true);
    }
    rewards(session);
    if (session.getSnapshot().screen === 'camp') { camps++; session.actions.chooseCampReward('heal'); }
  }
  assert.equal(rewardScreens, 9);
  assert.equal(camps, 2);
  assert.equal(session.getSnapshot().screen, 'main-results');
  assert.equal(session.getSnapshot().outcome, 'clear');
  const finalScore = session.getSnapshot().summary.finalScore;
  assert.equal(session.actions.enterBonusRoute().accepted, true);
  assert.equal(session.getSnapshot().run.area, 'chaos');
  assert.equal(session.actions.enterBonusRoute().accepted, false);
  const item = Object.keys(session.getSnapshot().run.inventory).find(key => session.getSnapshot().run.inventory[key]);
  session.actions.useConsumable(item);
  finishResponse(session);
  for (let i = 1; i <= 3; i++) {
    assert.equal(session.getSnapshot().run.round, i);
    clear(session);
    assert.equal(session.getSnapshot().screen, i === 3 ? 'bonus-results' : 'reward');
    if (i < 3) rewards(session);
  }
  assert.equal(session.getSnapshot().summary.finalScore, finalScore);
  assert.ok(session.getSnapshot().summary.bonusScore > 0);
  assert.equal(session.getSnapshot().outcome, 'bonus-clear');
  assert.equal(session.actions.openLeaderboard().accepted, false);
  assert.equal(session.actions.selectReward('weapon', 'old').accepted, false);
});

test('empty/aiming items reject without spending turns; three misses route to defeat and can start afresh', () => {
  const session = start();
  const { actions } = session;
  assert.equal(actions.useConsumable('spear').reason, 'empty');
  actions.setAim({ phase: 'dragging', angle: 200, power: -20 });
  assert.equal(session.getSnapshot().aim.angle, -160);
  assert.equal(session.getSnapshot().aim.power, 0);
  assert.equal(actions.fireShot().reason, 'aiming');
  assert.equal(actions.useConsumable('heal').reason, 'aiming');
  assert.equal(session.getSnapshot().run.turnNumber, 0);
  actions.resetAim();
  for (let i = 0; i < 3; i++) { actions.fireShot(); finishResponse(session); }
  assert.equal(session.getSnapshot().screen, 'main-results');
  assert.equal(session.getSnapshot().outcome, 'defeat');
  const resultRun = structuredClone(session.getSnapshot().run);
  const resultSummary = structuredClone(session.getSnapshot().summary);
  assert.equal(actions.openLeaderboard().accepted, true);
  assert.equal(session.getSnapshot().screen, 'leaderboard');
  assert.equal(session.getSnapshot().leaderboardReturnScreen, 'main-results');
  assert.equal(actions.closeLeaderboard().accepted, true);
  assert.equal(session.getSnapshot().screen, 'main-results');
  assert.deepEqual(session.getSnapshot().run, resultRun);
  assert.deepEqual(session.getSnapshot().summary, resultSummary);
  assert.equal(actions.fireShot().accepted, false);
  assert.equal(session.getSnapshot().run.ammo, 0);
  actions.startCharacterSelect();
  actions.startRun('wizard');
  assert.equal(session.getSnapshot().run.ammo, 3);
  assert.equal(session.getSnapshot().run.weapons[0].id, 'wizard-orb');
});

test('leaderboard opened from home returns to home and rejects entry from battle', () => {
  const session = createGameSession({ storage: memoryStorage() });
  assert.equal(session.actions.openLeaderboard().accepted, true);
  assert.equal(session.getSnapshot().leaderboardReturnScreen, 'home');
  assert.equal(session.actions.closeLeaderboard().accepted, true);
  assert.equal(session.getSnapshot().screen, 'home');
  session.actions.startCharacterSelect();
  session.actions.startRun('adventurer');
  assert.equal(session.actions.openLeaderboard().accepted, false);
  assert.equal(session.getSnapshot().screen, 'battle');
});

test('visual layout keeps dead-enemy slots stable', () => {
  const enemies = BattleEngine.createRoundEnemies('city', 2);
  const positions = monsterPositions(enemies);
  const defeated = structuredClone(enemies);
  defeated[0].alive = false;
  assert.deepEqual(monsterPositions(defeated).slice(1), positions.slice(1));
});

test('session supports full-vector angles and only the new phases; invalid metadata cannot spend a turn', () => {
  const session = start();
  const { actions } = session;
  assert.deepEqual(session.getSnapshot().aim, { angle: 0, power: 0, phase: 'idle', selectedTargetId: null });
  for (const [angle, expected] of [[-90, -90], [135, 135], [180, -180], [540, -180], [-540, -180]]) {
    actions.setAim({ angle, power: 125, phase: 'dragging' });
    assert.equal(session.getSnapshot().aim.angle, expected);
    assert.equal(session.getSnapshot().aim.power, 100);
  }
  actions.setAim({ phase: 'direction', angle: NaN, power: NaN });
  assert.equal(session.getSnapshot().aim.phase, 'dragging');
  assert.equal(actions.fireShot().reason, 'aiming');
  actions.setAim({ phase: 'launching', power: 0 });
  const before = structuredClone(session.getSnapshot().run);
  assert.equal(actions.useConsumable('defense').reason, 'aiming');
  const validMissMeta = { impactKind: 'ground', obstacleId: null, obstacleKind: null, obstacleTargetIds: [], rolling: false, reverse: false };
  assert.equal(actions.fireShot({ shotMeta: { ...validMissMeta, impactKind: 'unknown' } }).accepted, false);
  for (const malformed of [
    { ...validMissMeta, rolling: 'false' },
    { ...validMissMeta, obstacleKind: 'log' },
    { ...validMissMeta, obstacleTargetIds: ['same', 'same'] },
    { ...validMissMeta, contacts: [{ obstacleId: 'stack', obstacleKind: 'log',
      point: { x: 1, y: 2 }, distance: 4, time: .1, rolling: false, obstacleTargetIds: [] }] },
    { ...validMissMeta, contacts: [{ obstacleId: 'stack', obstacleKind: 'log',
      point: { x: 1, y: 2 }, distance: 4, time: .1, rolling: false, obstacleTargetIds: [] },
      { obstacleId: 'stack', obstacleKind: 'log', point: { x: 2, y: 2 },
        distance: 5, time: .2, rolling: false, obstacleTargetIds: [] }] },
    { ...validMissMeta, impactKind: 'obstacle', obstacleId: 'log-1' },
    { ...validMissMeta, impactKind: 'obstacle', obstacleId: 'log-1', obstacleKind: 'log', obstacleTargetIds: [2] }
  ]) {
    const snapshot = structuredClone(session.getSnapshot().run);
    assert.equal(actions.fireShot({ shotMeta: malformed }).reason, 'invalid-state');
    assert.deepEqual(session.getSnapshot().run, snapshot);
  }
  assert.deepEqual(session.getSnapshot().run, before);
  actions.resetAim();
  const physical=findPhysicalShot(session,shot=>shot.contacts.length>0);
  assert.equal(commitFlight(session,physical).accepted,true);
  const shotMeta=structuredClone(session.getSnapshot().lastEvent.shotMeta);
  const committedId=shotMeta.obstacleId,targets=shotMeta.obstacleTargetIds.slice();
  assert.equal(session.getSnapshot().lastEvent.obstacleEffect.kind, 'log-strike');
  shotMeta.obstacleId = 'changed';
  shotMeta.obstacleTargetIds.push('changed');
  assert.equal(session.getSnapshot().lastEvent.shotMeta.obstacleId, committedId);
  assert.deepEqual(session.getSnapshot().lastEvent.shotMeta.obstacleTargetIds, targets);
  assert.equal('shotMeta' in session.getSnapshot().run, false);
  const responseId = session.getSnapshot().enemyResponse.id;
  const committed = structuredClone(session.getSnapshot().run);
  actions.completeEnemyResponse(responseId); actions.completeEnemyResponse(responseId);
  assert.deepEqual(session.getSnapshot().run, committed);
  assert.ok(['enemy','ground','bounds','obstacle','timeout'].includes(session.getSnapshot().lastEvent.shotMeta.impactKind));
});

test('Wind only homes after Q and a reverse shot cannot force a stale target', () => {
  const engine = { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options,
    characterId:'wind', weapons: Array.from({ length: 4 }, () => ({ id: 'wind-candy', grade: 'C' })) }) };
  const session = start({ engine, rng: () => .5 });
  const { actions } = session, target = session.getSnapshot().run.enemies[0].id;
  actions.setAim({ selectedTargetId: target });
  commitFlight(session,reserveAt(session,90,1),{selectedTargetId:target});
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, false);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 4);
  finishResponse(session);
  actions.setAim({ selectedTargetId: target, phase: 'launching' });
  commitFlight(session,reserveAt(session,180,1),{selectedTargetId:target});
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, false);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 4);
  finishResponse(session);
  assert.equal(actions.armWindSkill().mode,'homing');
  commitFlight(session,reserveAt(session,0,.5));
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, true);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 2);
  finishResponse(session);
  commitFlight(session,reserveAt(session,90,1));
  assert.equal(session.getSnapshot().run.enemies[0].hp, 2);
});

test('Forest physical contact summaries require valid times and targets before spending a turn', () => {
  const session = start({ rng: () => .5 });
  const target = session.getSnapshot().run.enemies[0].id;
  const contact = { obstacleId: 'log', obstacleKind: 'log', point: { x: 500, y: 800 },
    distance: 300, time: .2, rolling: false, obstacleTargetIds: [target],
    logHit: { id: target, time: .6 }, logEndPose: { x: 700, y: 860, angle: Math.PI / 2 } };
  const meta = { impactKind: 'ground', obstacleId: 'log', obstacleKind: 'log', obstacleTargetIds: [target],
    rolling: false, reverse: false, directHitTime: .8, contacts: [contact] };
  for (const patch of [{ logHit: { id: 'missing', time: .6 } }, { logHit: { id: target, time: .1 } },
    { logEndPose: { x: Infinity, y: 860, angle: 1 } }]) {
    const before = structuredClone(session.getSnapshot().run);
    assert.equal(session.actions.fireShot({ shotMeta: { ...meta, contacts: [{ ...contact, ...patch }] } }).accepted, false);
    assert.deepEqual(session.getSnapshot().run, before);
  }
  const physical=findPhysicalShot(session,shot=>shot.contacts.filter(c=>c.logHit).length===1&&shot.hitIds.length===0);
  assert.equal(commitFlight(session,physical).accepted,true);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 1);
  const c=physical.flight.contacts.find(c=>c.logHit);
  assert.deepEqual(session.getSnapshot().run.forestLogDebris.find(d=>d.obstacleId===c.obstacleId), { obstacleId:c.obstacleId,...c.logEndPose });
});

test('a physical chain after candy settlement is accepted, but orphan/duplicate/invalid transfers cannot spend ammo', () => {
  const session = start({ rng: () => .5,layoutRng:()=>1/0x100000000 });
  const target = session.getSnapshot().run.enemies[0].id;
  const a = { obstacleId: 'a', obstacleKind: 'log', point: { x: 600, y: 850 },
    time: .2, distance: 400, rolling: false, obstacleTargetIds: [target], trigger: 'candy',
    sourceObstacleId: null, chainDepth: 0, direction: 1,
    logHit: null, logEndPose: { x: 700, y: 860, angle: 1.57 } };
  const b = { ...a, obstacleId: 'b', time: .6, distance: 450, trigger: 'obstacle', sourceObstacleId: 'a', chainDepth: 1,
    logHit: { id: target, time: .8 }, logEndPose: { x: 950, y: 860, angle: 1.57 } };
  const meta = { impactKind: 'ground', obstacleId: 'a', obstacleKind: 'log', obstacleTargetIds: [target],
    reverse: false, rolling: true, contacts: [a, b], directHitTime: .3 };
  for (const patch of [{ sourceObstacleId: 'missing' }, { chainDepth: 2 }, { trigger: 'bogus' },
    { direction: NaN }, { obstacleId: 'a' }, { obstacleEndPose: { x: NaN, y: 860, angle: 0 } }]) {
    const before = structuredClone(session.getSnapshot().run);
    assert.equal(session.actions.fireShot({ shotMeta: { ...meta, contacts: [a, { ...b, ...patch }] } }).accepted, false);
    assert.deepEqual(session.getSnapshot().run, before);
  }
  const physical=reserveAt(session,10,.925);
  assert.ok(physical.flight.contacts.some(c=>c.trigger==='obstacle'&&c.time>physical.flight.directHitTime));
  assert.equal(commitFlight(session,physical,{reviewResult:true}).accepted,true);
  const state = session.getSnapshot();
  assert.equal(state.run.enemies[0].hp,1);
  assert.equal(state.run.ammo, 2);
  assert.deepEqual(state.run.toppledObstacleIds, physical.flight.contacts.map(c=>c.obstacleId));
  assert.ok(state.shotReview);
});

test('enemy response locks combat, advances monotonically and ignores stale/duplicate animation callbacks', () => {
  const session = start({ rng: () => .5 });
  const { actions } = session;
  actions.useConsumable('defense');
  assert.equal(session.getSnapshot().enemyResponse, null);
  assert.equal(session.getSnapshot().run.defenseArmed, true);
  actions.fireShot();
  let state = session.getSnapshot();
  const { id, attack } = state.enemyResponse;
  assert.equal(attack.blockedBy, 'defense');
  assert.equal(attack.playerHpBefore, 100);
  assert.equal(attack.playerHpAfter, 100);
  assert.equal(state.run.defenseArmed, false);
  const committed = structuredClone(state.run);
  assert.equal(actions.fireShot().reason, 'responding');
  assert.equal(actions.useConsumable('heal').reason, 'responding');
  actions.setAim({ phase: 'dragging' });
  assert.equal(session.getSnapshot().aim.phase, 'idle');
  actions.advanceEnemyResponse(id, 'impact');
  assert.equal(session.getSnapshot().enemyResponse.stage, 'windup');
  actions.advanceEnemyResponse(id, 'travel');
  actions.advanceEnemyResponse(id, 'impact');
  actions.advanceEnemyResponse(id, 'travel');
  assert.equal(session.getSnapshot().enemyResponse.stage, 'impact');
  actions.completeEnemyResponse(id + 1);
  assert.ok(session.getSnapshot().enemyResponse);
  actions.completeEnemyResponse(id);
  actions.completeEnemyResponse(id);
  assert.equal(session.getSnapshot().enemyResponse, null);
  assert.deepEqual(session.getSnapshot().run, committed);
  actions.fireShot();
  state = session.getSnapshot();
  assert.equal(state.run.playerHp, 95);
  assert.equal(state.enemyResponse.attack.blocked, false);
  actions.completeEnemyResponse(id);
  assert.ok(session.getSnapshot().enemyResponse);
});

test('lethal response preserves pre-impact HP metadata and delays result routing without applying damage twice', () => {
  const engine = { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options, playerHp: 1 }) };
  const session = start({ engine, rng: () => .5 });
  session.actions.fireShot();
  const before = session.getSnapshot();
  assert.equal(before.screen, 'battle');
  assert.equal(before.run.playerHp, 0);
  assert.equal(before.enemyResponse.attack.playerHpBefore, 1);
  assert.equal(before.enemyResponse.attack.playerHpAfter, 0);
  const committed = structuredClone(before.run);
  session.actions.completeEnemyResponse(before.enemyResponse.id);
  session.actions.completeEnemyResponse(before.enemyResponse.id);
  assert.equal(session.getSnapshot().screen, 'main-results');
  assert.equal(session.getSnapshot().outcome, 'defeat');
  assert.deepEqual(session.getSnapshot().run, committed);
  session.actions.startCharacterSelect();
  session.actions.startRun('wizard');
  session.actions.completeEnemyResponse(before.enemyResponse.id);
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().enemyResponse, null);
});
