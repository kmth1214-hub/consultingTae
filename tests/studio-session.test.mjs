import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioSession } from '../src/dev/createStudioSession.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { CHARACTERS } from '../src/game/gameData.js';

const options = { rng: () => .5, now: () => 1000 };
test('all twelve regional rounds enter the real battle immediately with a fresh test inventory and layout seed', () => {
  for (const area of ['forest', 'snow', 'city', 'chaos']) for (const round of [1, 2, 3]) {
    const session = createStudioSession({ area, round, seed: 4927 }, options);
    const snapshot = session.getSnapshot(), run = snapshot.run;
    assert.equal(snapshot.screen, 'battle');
    assert.equal(run.area, area); assert.equal(run.round, round);
    assert.equal(run.bonusMode, area === 'chaos');
    assert.equal(run.playerHp, 100); assert.equal(run.ammo, 9);
    assert.equal(run.layoutSeed, 4927);
    assert.deepEqual(run.inventory, { fireball: 3, spear: 3, defense: 3, heal: 3 });
    if (area === 'chaos' && round < 3) {
      assert.ok(run.enemies.length >= 9 && run.enemies.length <= 13);
      assert.ok(run.enemies.every(e => ['snake', 'boar', 'dry-ice', 'snowball', 'washing-robot'].includes(e.kind)
        && !e.isBoss && e.hp === 4));
    } else assert.deepEqual(run.enemies.map(e => [e.kind, e.isBoss, e.hp]),
      BattleEngine.createRoundEnemies(area, round, { rng: options.rng }).map(e => [e.kind, e.isBoss, e.hp]));
    assert.deepEqual(run.toppledObstacleIds, []);
  }
});

test('every cookie can be tested, even locked cookies, without reading or writing browser storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('browser persistence accessed'); } });
  try {
    for (const character of CHARACTERS) {
      const session = createStudioSession({ area: 'snow', round: 3, characterId: character.id }, options);
      assert.equal(session.getSnapshot().run.characterId, character.id);
      assert.equal(session.getSnapshot().selectedCharacter.id, character.id);
      const target = session.getSnapshot().run.enemies[0].id;
      session.actions.fireShot({ hitIds: [target] });
      assert.equal(session.getSnapshot().run.ammo, 8);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('boss special setup triggers the real third response; ordinary rounds and independent sessions stay fresh', () => {
  for (const [area, special] of [['forest', 'boar-charge'], ['snow', 'frozen-breath'], ['city', 'oven-overheat'], ['chaos', 'boar-charge']]) {
    const config = { area, round: 3, bossSpecial: true, seed: 0xffffffff }, before = structuredClone(config);
    const session = createStudioSession(config, options);
    assert.ok(session.getSnapshot().run.enemies.filter(e => e.isBoss).every(e => e.attackCount === 2));
    const event = session.actions.fireShot();
    assert.equal(event.enemyAttack.attemptedSpecial, special);
    assert.ok(session.getSnapshot().enemyResponse);
    const again = createStudioSession(config, options);
    assert.equal(again.getSnapshot().run.ammo, 9);
    assert.equal(again.getSnapshot().run.layoutSeed, 0xffffffff);
    assert.equal(again.getSnapshot().enemyResponse, null);
    assert.deepEqual(config, before);
  }
  const regular = createStudioSession({ area: 'snow', round: 1, bossSpecial: true }, options);
  assert.ok(regular.getSnapshot().run.enemies.every(e => e.attackCount === 0));
});

test('invalid studio settings fail before the engine is called and do not modify the shared engine', () => {
  const original = BattleEngine.createRunState;
  let calls = 0;
  const engine = { ...BattleEngine, createRunState() { calls++; throw new Error('should not run'); } };
  for (const patch of [{ area: 'missing' }, { round: 0 }, { round: 4 }, { round: 1.5 }, { characterId: 'missing' },
    { seed: -1 }, { seed: 0x100000000 }, { seed: NaN }, { bossSpecial: 'yes' }]) {
    assert.throws(() => createStudioSession({ area: 'forest', round: 1, ...patch }, { engine }), RangeError);
  }
  assert.equal(calls, 0);
  assert.equal(BattleEngine.createRunState, original);
});

test('a cleared Chaos test keeps its chosen round rather than following automatic bonus progression', () => {
  const session = createStudioSession({ area: 'chaos', round: 1 }, { ...options,
    engine: { ...BattleEngine, resolveProjectile(run, config) {
      return BattleEngine.resolveProjectile(run, { ...config, damage: 1000,
        hitIds: run.enemies.filter(e => e.alive).map(e => e.id) });
    } }
  });
  session.actions.fireShot({ reviewResult: true });
  assert.equal(session.getSnapshot().run.terminal, 'round-clear');
  assert.equal(session.getSnapshot().run.round, 1);
  session.actions.completeShotReview(session.getSnapshot().shotReview.id);
  assert.equal(session.getSnapshot().run.round, 1);
  assert.equal(session.getSnapshot().run.terminal, 'round-clear');
  assert.equal(session.getSnapshot().shotReview, null);
});

test('same-layout Chaos replay reproduces the random monster roster independently of combat RNG', () => {
  const config = { area: 'chaos', round: 2, seed: 42 };
  const first = createStudioSession(config, { rng: () => 0 }).getSnapshot().run;
  const second = createStudioSession(config, { rng: () => .999 }).getSnapshot().run;
  assert.deepEqual(second.enemies, first.enemies);
  const third = createStudioSession({ ...config, seed: 43 }, options).getSnapshot().run;
  assert.notDeepEqual(third.enemies, first.enemies);
});
