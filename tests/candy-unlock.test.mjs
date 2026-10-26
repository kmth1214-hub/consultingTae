import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';
import { createStudioSession } from '../src/dev/createStudioSession.js';

const basic = ['adventurer-candy', 'alchemist-candy', 'wizard-orb'];
const locked = ['milk-candy', 'wind-candy'];
const storage = cleared => {
  const data = new Map([['cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: cleared })]]);
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('round and C/B camp rewards exclude both special candies until either historical or current Snow clear', () => {
  for (const unlock of ['none', 'profile', 'current']) {
    const offered = new Set(), campOffered = new Set();
    for (let step = 0; step < 100; step++) {
      // Vary the shuffle draws too, so every catalog entry can occupy the first slot.
      let value = step + 1;
      const rng = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0x100000000; };
      const makeRun = () => {
        const run = engine.createRunState({ snowRewardsUnlocked: unlock === 'profile', rng });
        run.snowAreaCleared = unlock === 'current';
        return run;
      };
      const run = makeRun(); run.terminal = 'round-clear';
      const choices = engine.drawRewardChoices(run, rng);
      assert.equal(choices.weapons.length, 3);
      assert.equal(new Set(choices.weapons.map(w => w.id)).size, 3);
      for (const weapon of choices.weapons) offered.add(weapon.id);
      for (const grade of ['C', 'B']) {
        const camp = makeRun(); camp.pendingCamp = true;
        let first = true;
        const campRng = () => { if (first) { first = false; return grade === 'B' ? 0 : .9; } return rng(); };
        let result = engine.chooseCampReward(camp, 'weapon', { rng: campRng });
        const pending = structuredClone(camp.pendingCampReward);
        while (result.requiresFusionChoice) {
          result = engine.chooseCampReward(camp, 'weapon', { mergeDuplicate: false, rng });
          if (camp.pendingCampReward) assert.deepEqual(camp.pendingCampReward.items, pending.items);
        }
        assert.equal(result.accepted, true);
        assert.equal(result.effect.weapons.length, grade === 'B' ? 1 : 2);
        assert.equal(result.effect.grade, grade);
        for (const weapon of result.effect.weapons) campOffered.add(weapon.weaponId);
        if (pending) assert.ok(pending.items.every(w => result.effect.weapons.some(g => g.weaponId === w.id)));
      }
    }
    const expected = unlock === 'none' ? basic : [...basic, ...locked];
    assert.deepEqual([...offered].sort(), expected.slice().sort());
    assert.deepEqual([...campOffered].sort(), expected.slice().sort());
  }
});

test('stale locked reward and camp entries cannot grant a special candy or mutate state', () => {
  for (const id of locked) {
    const weapon = engine.WEAPON_CATALOG.find(w => w.id === id);
    const run = engine.createRunState(); run.terminal = 'round-clear';
    engine.drawRewardChoices(run, () => .5);
    run.rewardChoices.weapons[0] = { ...weapon, choiceId: `weapon:${id}` };
    const before = structuredClone(run);
    assert.deepEqual(engine.applyRewardChoice(run, 'weapon', `weapon:${id}`, { mergeDuplicate: true }),
      { accepted: false, reason: 'candy-locked' });
    assert.deepEqual(run, before);
    run.pendingCamp = true;
    run.pendingCampReward = { grade: 'C', items: [{ ...weapon }], index: 0, grants: [] };
    const beforeCamp = structuredClone(run);
    assert.deepEqual(engine.chooseCampReward(run, 'weapon', { mergeDuplicate: true, rng() { throw new Error('rerolled'); } }),
      { accepted: false, reason: 'candy-locked' });
    assert.deepEqual(run, beforeCamp);
  }
});

test('stored unlock flows into a fresh run without marking this run as Snow cleared; basic starters remain available', () => {
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

test('the first actual Snow boss clear unlocks its immediate reward and persists for the next run', () => {
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
  assert.ok(result.run.rewardChoices.weapons.some(w => locked.includes(w.id)));
  assert.match(result.notification.message, /쿠키와 마법사탕이 해금/);
  const reloaded = createGameSession({ storage: local });
  reloaded.actions.startCharacterSelect(); reloaded.actions.startRun('wind');
  assert.equal(reloaded.getSnapshot().run.snowRewardsUnlocked, true);
  assert.equal(reloaded.getSnapshot().run.snowAreaCleared, false);
});

test('isolated administrator sessions retain all candy rewards without unlocking the real profile', () => {
  const session = createStudioSession({ area: 'forest', round: 1 }, { rng: () => .5 });
  const run = session.getSnapshot().run;
  assert.equal(run.snowRewardsUnlocked, true);
  assert.equal(run.snowAreaCleared, false);
  run.terminal = 'round-clear';
  assert.ok(engine.drawRewardChoices(run, () => .5).weapons.some(w => locked.includes(w.id)));
});
