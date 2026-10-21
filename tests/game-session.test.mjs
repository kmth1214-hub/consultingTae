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
  for (let i = 1; i <= 3; i++) {
    assert.equal(session.getSnapshot().run.round, i);
    clear(session);
    assert.equal(session.getSnapshot().screen, i === 3 ? 'bonus-results' : 'battle');
  }
  assert.equal(session.getSnapshot().summary.finalScore, finalScore);
  assert.ok(session.getSnapshot().summary.bonusScore > 0);
  assert.equal(session.getSnapshot().outcome, 'bonus-clear');
  assert.equal(session.actions.selectReward('weapon', 'old').accepted, false);
});

test('empty/aiming items reject without spending turns; nine misses route to defeat and can start afresh', () => {
  const session = start();
  const { actions } = session;
  assert.equal(actions.useConsumable('spear').reason, 'empty');
  actions.setAim({ phase: 'angle', angle: 200, power: -20 });
  assert.equal(session.getSnapshot().aim.angle, 80);
  assert.equal(session.getSnapshot().aim.power, 20);
  assert.equal(actions.useConsumable('heal').reason, 'aiming');
  assert.equal(session.getSnapshot().run.turnNumber, 0);
  actions.resetAim();
  for (let i = 0; i < 9; i++) actions.fireShot();
  assert.equal(session.getSnapshot().screen, 'main-results');
  assert.equal(session.getSnapshot().outcome, 'defeat');
  assert.equal(actions.fireShot().accepted, false);
  assert.equal(session.getSnapshot().run.ammo, 0);
  actions.startCharacterSelect();
  actions.startRun('wizard');
  assert.equal(session.getSnapshot().run.ammo, 9);
  assert.equal(session.getSnapshot().run.weapons[0].id, 'wizard-orb');
});

test('visual layout keeps dead-enemy slots stable', () => {
  const enemies = BattleEngine.createRoundEnemies('city', 4);
  const positions = monsterPositions(enemies);
  const defeated = structuredClone(enemies);
  defeated[0].alive = false;
  assert.deepEqual(monsterPositions(defeated).slice(1), positions.slice(1));
});
