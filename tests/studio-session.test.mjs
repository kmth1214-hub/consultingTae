import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioScenario, createStudioSession } from '../src/dev/createStudioSession.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { CHARACTERS } from '../src/game/gameData.js';
import { preparePhysicalFlight } from '../src/game/shotResolution.js';
import { planShot } from '../src/game/shotGeometry.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { buildWindField } from '../src/game/windField.js';

const options = { rng: () => .5, now: () => 1000 };
test('map preview and playable studio session share the exact seeded enemy and support layout', () => {
  for (const round of [1, 2, 3]) {
    const config = { area: 'forest', round, seed: 17, characterId: 'wizard' };
    const preview = createStudioScenario(config);
    const run = createStudioSession(config, options).getSnapshot().run;
    const playable = createStudioScenario(config);
    assert.deepEqual(run.enemies, preview.enemies);
    assert.deepEqual(playable.layout, preview.layout);
    assert.equal(preview.layout.launcher.y, playable.layout.launcher.y);
    assert.deepEqual(preview.layout.enemies.map(({ id, x, y, supportObstacleId }) =>
      ({ id, x, y, supportObstacleId })), playable.layout.enemies.map(({ id, x, y, supportObstacleId }) =>
      ({ id, x, y, supportObstacleId })));
    if (round === 2) assert.equal(preview.layout.enemies.filter(enemy => enemy.supportObstacleId).length, 1);
    else assert.equal(preview.layout.enemies.filter(enemy => enemy.supportObstacleId).length, 0);
  }
});
test('all twelve regional rounds enter the real battle immediately with a fresh test inventory and layout seed', () => {
  for (const area of ['forest', 'snow', 'city', 'chaos']) for (const round of [1, 2, 3]) {
    const session = createStudioSession({ area, round, seed: 4927 }, options);
    const snapshot = session.getSnapshot(), run = snapshot.run;
    assert.equal(snapshot.screen, 'battle');
    assert.equal(run.area, area); assert.equal(run.round, round);
    assert.equal(run.bonusMode, area === 'chaos');
    assert.equal(run.playerHp, 100); assert.equal(run.ammo, 3);
    assert.equal(run.layoutSeed, 4927);
    assert.equal(run.studioWorldScale, 1.5);
    assert.equal(run.studioDepthPreview, true);
    const preview = createStudioScenario({ area, round, seed: 4927 });
    assert.equal(preview.layout.worldScale, 1.5);
    assert.equal(preview.layout.candyRadius, 15);
    assert.equal(run.studioPrototype, area === 'forest' ? 'forest-elevated-v1' : 'regional-elevated-v1');
    assert.deepEqual(run.inventory, { fireball: 3, spear: 3, defense: 3, heal: 3 });
    if (area === 'chaos' && round < 3) {
      assert.ok(run.enemies.length >= 9 && run.enemies.length <= 13);
      assert.ok(run.enemies.every(e => ['frost-gear-snake', 'oven-snow-boar', 'jelly-cloud-robot'].includes(e.kind)
        && !e.isBoss && e.hp === 4));
    } else assert.deepEqual(run.enemies.map(e => [e.kind, e.isBoss, e.hp]),
      BattleEngine.createRoundEnemies(area, round, { rng: options.rng }).map(e => [e.kind, e.isBoss, e.hp]));
    assert.deepEqual(run.toppledObstacleIds, []);
  }
  assert.equal(BattleEngine.createRunState({ area: 'forest', round: 1, rng: options.rng }).studioDepthPreview, undefined);
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
      assert.equal(session.getSnapshot().run.ammo, 2);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('studio grade selection changes all three starting stones without changing the public starter grade', () => {
  for (const grade of ['C', 'B', 'A']) {
    const config = { area: 'forest', round: 2, characterId: 'adventurer', weaponGrade: grade, seed: 17 };
    const scenario = createStudioScenario(config);
    const run = createStudioSession(config, options).getSnapshot().run;
    assert.equal(scenario.weaponGrade, grade);
    assert.deepEqual(run.weapons.map(weapon => weapon.grade), [grade, grade, grade]);
    assert.equal(run.weapons.find(weapon => weapon.id === 'adventurer-candy').grade, grade);
    assert.deepEqual(scenario.run.weapons, run.weapons);
    assert.equal(BattleEngine.getWeaponDamageRange(grade).max, ({ C: 4, B: 6, A: 10 })[grade]);
  }
  assert.deepEqual(BattleEngine.createRunState({ area: 'forest', round: 1, rng: options.rng })
    .weapons.map(weapon => weapon.grade), ['C', 'C', 'C']);
});

test('studio City monsters alone gain a further 1.5 scale with matching hit colliders', () => {
  for (const round of [1, 2, 3]) {
    const config = { area: 'city', round, seed: 4927 };
    const { layout } = createStudioScenario(config);
    const run = createStudioSession(config, options).getSnapshot().run;
    const publicLayout = buildPlayableBattlefield({ area: 'city', round, seed: 4927,
      enemies: run.enemies, prototype: 'regional-elevated-v1', worldScale: 1.5 });
    assert.equal(run.studioEnemyScale, 1.5);
    assert.equal(layout.enemyScale, 1.5);
    assert.equal(layout.candyRadius, publicLayout.candyRadius);
    assert.equal(layout.launcher.width, publicLayout.launcher.width);
    for (const slot of layout.enemies) {
      const ordinary = publicLayout.enemies.find(item => item.id === slot.id);
      assert.equal(slot.size, ordinary.size * 1.5);
      assert.equal(slot.collider.radius, slot.size * .42);
      assert.equal(slot.collider.y, slot.y - slot.size * .52);
    }
    const pull = { direction: { x: .8, y: -.6 }, powerRatio: .65, ready: true };
    const loaded = run.weapons.find(weapon => weapon.instanceId === run.weaponQueue[0]);
    const windField = buildWindField({ area: 'city', round, layoutSeed: run.layoutSeed,
      shotOrdinal: run.playerShotsFired, layout });
    const expected = planShot({ layout, pull, enemies: run.enemies, flightStartMs: 1000,
      windField, deferAbility: false, prototype: run.studioPrototype,
      loadedCandyId: loaded.id, loadedCandyGrade: loaded.grade });
    const flight = preparePhysicalFlight(run, pull, 1, 1, 1000);
    assert.deepEqual(flight.path, expected.path);
    assert.deepEqual(flight.hitIds, expected.hitIds);
  }
  assert.equal(createStudioScenario({ area: 'snow', round: 1 }).layout.enemyScale, 1);
  assert.equal(BattleEngine.createRunState({ area: 'city', round: 1 }).studioEnemyScale, undefined);
});

test('boss special setup triggers the real third response; ordinary rounds and independent sessions stay fresh', () => {
  for (const [area, special] of [['forest', 'boar-charge'], ['snow', 'frozen-breath'], ['city', 'oven-overheat'], ['chaos', 'frozen-breath']]) {
    const config = { area, round: 3, bossSpecial: true, seed: 0xffffffff }, before = structuredClone(config);
    const session = createStudioSession(config, options);
    assert.ok(session.getSnapshot().run.enemies.filter(e => e.isBoss).every(e => e.attackCount === 2));
    const event = session.actions.fireShot();
    assert.equal(event.enemyAttack.attemptedSpecial, special);
    assert.ok(session.getSnapshot().enemyResponse);
    const again = createStudioSession(config, options);
    assert.equal(again.getSnapshot().run.ammo, 3);
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
    { seed: -1 }, { seed: 0x100000000 }, { seed: NaN }, { bossSpecial: 'yes' }, { weaponGrade: 'S' }]) {
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

test('studio combat and map preview solve a shot from the same enlarged world', () => {
  for (const area of ['forest', 'snow', 'city', 'chaos']) {
    const config = { area, round: 1, seed: 4927 };
    const scenario = createStudioScenario(config);
    const run = createStudioSession(config, options).getSnapshot().run;
    const pull = { direction: { x: .8, y: -.6 }, powerRatio: .65, ready: true };
    const predicted = planShot({ layout: scenario.layout, pull, enemies: scenario.enemies,
      prototype: run.studioPrototype ?? null });
    const actual = preparePhysicalFlight(run, pull, 1, 1);
    assert.ok(predicted && actual);
    assert.deepEqual(actual.path.start, predicted.path.start);
    assert.equal(actual.candyRadius, scenario.layout.candyRadius);
  }
});
