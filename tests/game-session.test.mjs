import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameSession } from '../src/game/gameSession.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { monsterPositions } from '../src/game/arenaLayout.js';

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
function rewards(session, merge = false) {
  const { actions } = session;
  let state = session.getSnapshot();
  actions.selectReward('weapon', state.run.rewardChoices.weapons[0].choiceId);
  if (session.getSnapshot().fusion) actions.resolveFusion(merge);
  state = session.getSnapshot();
  if (!state.run.selectedRewards.consumable) actions.selectReward('consumable', state.run.rewardChoices.consumables[0].choiceId);
  assert.equal(actions.continueAfterReward().accepted, true);
}

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
  assert.equal(session.getSnapshot().run.ammo, 8);
  assert.equal(before.run.ammo, 9);
  assert.notEqual(session.getSnapshot().run, before.run);
  assert.equal(calls, 1);
  unsubscribe();
  session.actions.dismissNotification();
  assert.equal(calls, 1);
});

test('reward fusion blocks progression, resolves explicitly, and rejects repeated reward clicks', () => {
  const session = start({ engine: clearingEngine });
  clear(session);
  const { actions } = session;
  const choice = session.getSnapshot().run.rewardChoices.weapons.find(item => item.id === 'adventurer-candy');
  assert.equal(session.getSnapshot().screen, 'reward');
  assert.equal(actions.continueAfterReward().reason, 'rewards-incomplete');
  assert.equal(actions.selectReward('weapon', choice.choiceId).reason, 'fusion-decision-required');
  assert.equal(session.getSnapshot().run.weapons[0].grade, 'C');
  assert.equal(actions.continueAfterReward().accepted, false);
  assert.equal(actions.resolveFusion(true).accepted, true);
  assert.equal(session.getSnapshot().run.weapons[0].grade, 'B');
  assert.equal(actions.selectReward('weapon', choice.choiceId).reason, 'already-selected');
  actions.selectReward('consumable', session.getSnapshot().run.rewardChoices.consumables[0].choiceId);
  actions.continueAfterReward();
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().run.round, 2);
  assert.equal(actions.continueAfterReward().reason, 'invalid-state');
});

test('camp weapon queue survives multiple fusion prompts without rerolling or allowing a switch', () => {
  let rolls = 0;
  const session = start({ engine: clearingEngine, rng: () => { rolls++; return .999; } });
  for (let i = 0; i < 5; i++) { clear(session); rewards(session); }
  assert.equal(session.getSnapshot().screen, 'camp');
  session.actions.chooseCampReward('weapon');
  assert.equal(session.getSnapshot().fusion.source, 'camp');
  const pending = structuredClone(session.getSnapshot().run.pendingCampReward);
  const rollsAtPrompt = rolls;
  assert.equal(session.actions.chooseCampReward('heal').accepted, false);
  assert.deepEqual(session.getSnapshot().run.pendingCampReward, pending);
  session.actions.resolveFusion(false);
  assert.equal(session.getSnapshot().fusion.source, 'camp');
  assert.equal(rolls, rollsAtPrompt);
  session.actions.resolveFusion(true);
  assert.equal(session.getSnapshot().screen, 'battle');
  assert.equal(session.getSnapshot().run.area, 'snow');
});

test('15 main rounds, two camps, immediate Snow unlock, frozen result, and 3 bonus rounds follow screen routing', () => {
  const storage = memoryStorage();
  const session = start({ engine: clearingEngine, storage });
  let rewardScreens = 0;
  let camps = 0;
  for (let i = 0; i < 15; i++) {
    clear(session);
    assert.equal(session.getSnapshot().screen, 'reward');
    rewardScreens++;
    if (i === 9) {
      assert.equal(session.getSnapshot().profile.snowAreaCleared, true);
      const reload = createGameSession({ storage });
      assert.equal(reload.getSnapshot().screen, 'home');
      assert.equal(reload.getSnapshot().run, null);
      reload.actions.startCharacterSelect();
      assert.equal(reload.actions.startRun('wind').accepted, true);
    }
    rewards(session, true);
    if (session.getSnapshot().screen === 'camp') { camps++; session.actions.chooseCampReward('heal'); }
  }
  assert.equal(rewardScreens, 15);
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
    assert.equal(session.getSnapshot().screen, i === 3 ? 'bonus-results' : 'battle');
  }
  assert.equal(session.getSnapshot().summary.finalScore, finalScore);
  assert.ok(session.getSnapshot().summary.bonusScore > 0);
  assert.equal(session.getSnapshot().outcome, 'bonus-clear');
  assert.equal(session.actions.openLeaderboard().accepted, false);
  assert.equal(session.actions.selectReward('weapon', 'old').accepted, false);
});

test('empty/aiming items reject without spending turns; nine misses route to defeat and can start afresh', () => {
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
  for (let i = 0; i < 9; i++) { actions.fireShot(); finishResponse(session); }
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
  assert.equal(session.getSnapshot().run.ammo, 9);
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
  const enemies = BattleEngine.createRoundEnemies('city', 4);
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
  assert.equal(actions.fireShot({ shotMeta: { impactKind: 'unknown', reverse: false, obstacleId: null } }).accepted, false);
  assert.deepEqual(session.getSnapshot().run, before);
  const shotMeta = { impactKind: 'obstacle', obstacleId: 'forest-1-obstacle-0', reverse: false };
  assert.equal(actions.fireShot({ selectedTargetId: null, shotMeta }).accepted, true);
  assert.deepEqual(session.getSnapshot().lastEvent.shotMeta, shotMeta);
  shotMeta.obstacleId = 'changed';
  assert.equal(session.getSnapshot().lastEvent.shotMeta.obstacleId, 'forest-1-obstacle-0');
  assert.equal('shotMeta' in session.getSnapshot().run, false);
  const responseId = session.getSnapshot().enemyResponse.id;
  const committed = structuredClone(session.getSnapshot().run);
  actions.completeEnemyResponse(responseId); actions.completeEnemyResponse(responseId);
  assert.deepEqual(session.getSnapshot().run, committed);
  assert.equal(session.getSnapshot().lastEvent.shotMeta.impactKind, 'obstacle');
});

test('explicit null and reverse override a stale Wind target without consuming homing, then forward Wind works once', () => {
  const engine = { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options,
    weapons: [{ id: 'wind-candy', grade: 'C' }] }) };
  const session = start({ engine, rng: () => .5 });
  const { actions } = session, target = session.getSnapshot().run.enemies[0].id;
  actions.setAim({ selectedTargetId: target });
  actions.fireShot({ selectedTargetId: null, shotMeta: { impactKind: 'obstacle', obstacleId: 'wall', reverse: false } });
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, false);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 4);
  finishResponse(session);
  actions.setAim({ selectedTargetId: target, phase: 'launching' });
  actions.fireShot({ selectedTargetId: target, shotMeta: { impactKind: 'bounds', obstacleId: null, reverse: true } });
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, false);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 4);
  finishResponse(session);
  actions.fireShot({ hitIds: [target], selectedTargetId: target });
  assert.equal(session.getSnapshot().run.roundEffects.windHomingUsed, true);
  assert.equal(session.getSnapshot().run.enemies[0].hp, 2);
  finishResponse(session);
  actions.fireShot({ hitIds: [], selectedTargetId: null });
  assert.equal(session.getSnapshot().run.enemies[0].hp, 2);
});

test('enemy response locks combat, advances monotonically and ignores stale/duplicate animation callbacks', () => {
  const session = start({ rng: () => .5 });
  const { actions } = session;
  actions.useConsumable('defense');
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
