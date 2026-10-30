import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';
import { createStudioSession } from '../src/dev/createStudioSession.js';

const storage = cleared => {
  const data = new Map([['cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: cleared })]]);
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('slot rewards grant only the selected cookie stone or a basic stone, regardless of Snow unlock', () => {
  for (const unlocked of [false, true]) {
    for (const [characterId, exclusive] of [
      ['adventurer', 'adventurer-candy'], ['alchemist', 'alchemist-candy'],
      ['wizard', 'wizard-orb'], ['milk', 'milk-candy'], ['wind', 'wind-candy']
    ]) {
      const run = engine.createRunState({ characterId, snowRewardsUnlocked: unlocked });
      run.terminal = 'round-clear';
      assert.deepEqual(engine.drawRewardChoices(run, () => .5).weapons, []);
      const won = engine.spinRewardSlot(run, 'stone', () => 0);
      assert.equal(won.accepted, true);
      assert.equal(won.result.prizeId, exclusive);
      assert.equal(run.weapons.at(-1).id, exclusive);
      assert.equal(run.weapons.at(-1).grade, 'C');
      const missed = engine.createRunState({ characterId, snowRewardsUnlocked: unlocked });
      missed.terminal = 'round-clear';
      engine.drawRewardChoices(missed, () => .5);
      let index = 0;
      const symbols = [0, .25, .5, .75, .25, .5, .75, 0, .5];
      const lost = engine.spinRewardSlot(missed, 'stone', () => symbols[index++]);
      assert.equal(lost.result.prizeId, 'basic-stone');
    }
  }
});

test('legacy weapon reward selection cannot bypass the slot-only grant rule', () => {
  const run = engine.createRunState();
  run.terminal = 'round-clear';
  engine.drawRewardChoices(run, () => .5);
  const before = structuredClone(run);
  assert.equal(engine.applyRewardChoice(run, 'weapon', 'weapon:milk-candy').accepted, false);
  assert.deepEqual(run, before);
});

test('stored Snow unlock controls cookie selection in a fresh run', () => {
  for (const cleared of [false, true]) {
    const local = storage(cleared);
    for (const characterId of ['adventurer', 'alchemist', 'wizard', 'milk', 'wind']) {
      const session = createGameSession({ storage: local, rng: () => .5 });
      session.actions.startCharacterSelect();
      const result = session.actions.startRun(characterId);
      assert.equal(result.accepted, cleared || !['milk', 'wind'].includes(characterId));
      if (!result.accepted) continue;
      assert.equal(session.getSnapshot().run.snowRewardsUnlocked, cleared);
      assert.equal(session.getSnapshot().run.snowAreaCleared, false);
    }
  }
  assert.equal(engine.createRunState({ snowRewardsUnlocked: 'true' }).snowRewardsUnlocked, false);
});

test('first Snow boss clear persists cookie unlock without adding another cookie stone as a reward', () => {
  const local = storage(false);
  const session = createGameSession({ storage: local, rng: () => .5,
    engine: { ...engine, createRunState: options => engine.createRunState({ ...options, area: 'snow', round: 3 }),
      resolveProjectile: (run, options) => engine.resolveProjectile(run, { ...options, damage: 1000 }) } });
  session.actions.startCharacterSelect(); session.actions.startRun('adventurer');
  const initial = session.getSnapshot();
  session.actions.fireShot({ hitIds: initial.run.enemies.map(e => e.id) });
  const result = session.getSnapshot();
  assert.equal(result.screen, 'reward');
  assert.equal(result.run.snowRewardsUnlocked, false);
  assert.equal(result.run.snowAreaCleared, true);
  assert.equal(result.profile.snowAreaCleared, true);
  assert.deepEqual(result.run.rewardChoices.weapons, []);
  assert.match(result.notification.message, /쿠키와 마법사탕이 해금/);
  const reloaded = createGameSession({ storage: local });
  reloaded.actions.startCharacterSelect(); reloaded.actions.startRun('wind');
  assert.equal(reloaded.getSnapshot().run.snowRewardsUnlocked, true);
  assert.equal(reloaded.getSnapshot().run.snowAreaCleared, false);
});

test('isolated administrator session can select a locked cookie without altering the real profile', () => {
  const session = createStudioSession({ area: 'forest', round: 1, characterId: 'wind' }, { rng: () => .5 });
  const run = session.getSnapshot().run;
  assert.equal(run.snowRewardsUnlocked, true);
  assert.equal(run.snowAreaCleared, false);
  assert.equal(run.characterId, 'wind');
  assert.equal(run.weapons.some(weapon => weapon.id === 'wind-candy'), true);
});
