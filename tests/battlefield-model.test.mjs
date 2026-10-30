import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { BATTLEFIELD, buildBattlefield, getDragDraw } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield, isPlayableBattlefield, findForestLogOpportunity } from '../src/game/battlefieldPlacement.js';

test('seeded round layouts stay stable, avoid overlaps and remain playable at density extremes', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => { throw new Error('Layout must not roll RNG'); };
    for (const area of ['forest', 'snow', 'city', 'chaos']) {
      for (let round = 1; round <= 3; round++) {
        for (const rng of [() => 0, () => .5, () => .999]) {
          const enemies = BattleEngine.createRoundEnemies(area, round, { rng });
          const snapshot = structuredClone(enemies);
          const layout = buildPlayableBattlefield({ area, round, enemies, seed: 4927 });
          assert.deepEqual(enemies, snapshot);
          assert.deepEqual(buildPlayableBattlefield({ area, round, enemies, seed: 4927 }), layout);
          assert.ok(isPlayableBattlefield(layout, enemies));
          assert.equal(layout.enemies.length, enemies.length);
          assert.deepEqual(layout.enemies.map(e => e.id), enemies.map(e => e.id));
          assert.equal(layout.width, 3600);
          assert.deepEqual(layout.player, { x: 44, y: 748, width: 152, height: 152,
            impact: { x: 120, y: 824 }, contact: { x: 170, y: 900 } });
          assert.ok(layout.obstacles.length >= 2 && layout.obstacles.length <= 4);
          assert.equal(new Set(layout.obstacles.map(o => o.id)).size, layout.obstacles.length);
          for (const [i, enemy] of layout.enemies.entries()) {
            assert.equal(enemy.kind, enemies[i].kind);
            assert.equal(enemy.isBoss, enemies[i].isBoss);
            assert.equal('hp' in enemy, false);
            assert.equal('alive' in enemy, false);
            assert.equal(enemy.y, enemy.kind === 'clockwork-crow' ? 900 - 240 - (i % 2) * 80 : 900);
            assert.equal(enemy.size, enemy.kind === 'chaos-fused-boss' ? 414 : enemy.isBoss ? 276 : enemies.length <= 6 ? 92 : 60);
          }
          for (const [i, prop] of layout.obstacles.entries()) {
            assert.equal(prop.kind, area === 'chaos' ? ['log', 'ice', 'crate'][i % 3]
              : { forest: 'log', snow: 'ice', city: 'crate' }[area]);
            assert.equal(prop.id, `${area}-${round}-obstacle-${i}`);
            assert.equal(prop.width, 80);
            assert.ok(prop.height >= (enemies.length <= 6 ? 92 : 60) * 1.5);
            assert.ok(prop.height <= (enemies.length <= 6 ? 92 : 60) * 2);
            assert.equal(prop.y + prop.height, 900);
            assert.ok(prop.polygon.every(p => p.x >= prop.x && p.x <= prop.x + 80
              && p.y >= prop.y && p.y <= 900));
            for (const enemy of layout.enemies) assert.ok(prop.x + prop.width <= enemy.x - enemy.size / 2 - 8
              || prop.x >= enemy.x + enemy.size / 2 + 8, `${prop.id} overlaps ${enemy.id}`);
            for (const previous of layout.obstacles.slice(0, i)) {
              assert.ok(Math.abs(prop.x - previous.x) >= 145 - 1e-9);
            }
          }
          const dead = enemies.map((e, i) => ({ ...e, alive: i > 0, hp: i ? 2 : 0 }));
          assert.deepEqual(buildPlayableBattlefield({ area, round, enemies: dead, seed: 4927 }), layout);
        }
      }
    }
  } finally { Math.random = originalRandom; }
});

test('distinct round seeds change positions without changing enemy identity', () => {
  const enemies = BattleEngine.createRoundEnemies('city', 2, { rng: () => .5 });
  const first = buildPlayableBattlefield({ area: 'city', round: 2, enemies, seed: 1 });
  const second = buildPlayableBattlefield({ area: 'city', round: 2, enemies, seed: 2 });
  assert.deepEqual(first.enemies.map(enemy => enemy.id), second.enemies.map(enemy => enemy.id));
  assert.notDeepEqual(first.enemies.map(enemy => enemy.x), second.enemies.map(enemy => enemy.x));
  assert.notEqual(first.key, second.key);
});

test('studio scale enlarges world bodies and collision circles without changing the public layout', () => {
  for (const area of ['forest', 'snow', 'city', 'chaos']) for (const round of [1, 2, 3]) {
    const enemies = BattleEngine.createRoundEnemies(area, round, { rng: () => .5 });
    const input = { area, round, enemies, seed: 4927,
      ...(area === 'forest' ? { prototype: 'forest-elevated-v1' } : {}) };
    const original = buildPlayableBattlefield(input);
    const studio = buildPlayableBattlefield({ ...input, worldScale: 1.5 });
    assert.equal(studio.worldScale, 1.5);
    assert.equal(studio.candyRadius, 15);
    assert.equal(studio.width, original.width);
    assert.equal(studio.player.width, original.player.width * 1.5);
    assert.equal(studio.launcher.width, original.launcher.width * 1.5);
    assert.equal(studio.launcher.restPouch.x, original.launcher.restPouch.x * 1.5);
    assert.equal(studio.player.contact.y, studio.launcher.contact.y);
    assert.notEqual(studio.key, original.key);
    assert.equal(studio.enemies.length, original.enemies.length);
    assert.ok(isPlayableBattlefield(studio, enemies));
    for (const [index, slot] of studio.enemies.entries()) {
      assert.equal(slot.size, original.enemies[index].size * 1.5);
      assert.equal(slot.collider.radius, original.enemies[index].collider.radius * 1.5);
    }
    for (const obstacle of studio.obstacles) {
      assert.equal(obstacle.width, (obstacle.supportsEnemyId ? 128 : 80) * 1.5);
      assert.equal(obstacle.y + obstacle.height, studio.groundY);
    }
    assert.deepEqual(buildPlayableBattlefield({ ...input, worldScale: 1.5 }), studio);
    assert.deepEqual(buildPlayableBattlefield(input), original);
  }
  const input = { area: 'forest', round: 1, enemies: [] };
  for (const worldScale of [0, 1.2, 2, NaN])
    assert.throws(() => buildBattlefield({ ...input, worldScale }), TypeError);
});

test('studio-only Forest elevation keeps one rider on a reachable support and moves both launch anchors together', () => {
  const heights = new Set(), launchHeights = new Set();
  for (const round of [1, 2, 3]) for (const seed of [0, 1, 3, 4, 15, 4927]) {
    const enemies = BattleEngine.createRoundEnemies('forest', round, { rng: () => .5 });
    const input = { area: 'forest', round, enemies, seed };
    const baseline = buildPlayableBattlefield(input);
    assert.equal('prototype' in baseline, false);
    assert.equal('launcherPlatform' in baseline, false);
    const copy = structuredClone(enemies);
    const layout = buildPlayableBattlefield({ ...input, prototype: 'forest-elevated-v1' });
    assert.deepEqual(enemies, copy);
    assert.deepEqual(buildPlayableBattlefield({ ...input, prototype: 'forest-elevated-v1' }), layout);
    assert.deepEqual(buildPlayableBattlefield(input), baseline);
    assert.notEqual(layout.key, baseline.key);
    assert.ok(isPlayableBattlefield(layout, enemies));
    const riders = layout.enemies.filter(enemy => enemy.supportObstacleId);
    const supports = layout.obstacles.filter(obstacle => obstacle.supportsEnemyId);
    assert.equal(riders.length, round === 2 ? 1 : 0);
    assert.equal(supports.length, round === 2 ? 1 : 0);
    if (round === 2) {
      const rider = riders[0], support = supports[0];
      heights.add(support.elevation);
      assert.equal(support.supportsEnemyId, rider.id);
      assert.equal(rider.supportObstacleId, support.id);
      assert.equal(rider.y, support.y);
      assert.equal(rider.groundY, BATTLEFIELD.groundY);
      assert.equal(rider.collider.y, rider.y - rider.size * .52);
      assert.ok(support.width >= rider.size);
      assert.equal(layout.enemies.find(enemy => enemy.id !== rider.id).y, 900);
      assert.ok(!layout.obstacles.some(obstacle => obstacle.id === support.id && obstacle.kind !== 'log'));
    } else assert.ok(layout.enemies.every(enemy => enemy.y === 900));
    if (round === 1) assert.equal(layout.launcherPlatform, null);
    const lift = layout.launcherPlatform?.height ?? 0;
    launchHeights.add(lift);
    assert.equal(layout.player.y, baseline.player.y - lift);
    assert.equal(layout.launcher.y, baseline.launcher.y - lift);
    assert.equal(layout.player.impact.y, baseline.player.impact.y - lift);
    assert.equal(layout.launcher.impact.y, baseline.launcher.impact.y - lift);
    assert.equal(layout.player.contact.y, baseline.player.contact.y - lift);
    assert.equal(layout.launcher.contact.y, baseline.launcher.contact.y - lift);
    assert.deepEqual(layout.launcher.restPouch, baseline.launcher.restPouch);
    assert.equal(layout.obstacles.includes(layout.launcherPlatform), false);
  }
  assert.deepEqual([...heights].sort(), ['high', 'low', 'medium']);
  assert.deepEqual([...launchHeights].sort((a, b) => a - b), [0, 80]);
});

test('elevated Forest configuration rejects other regions, invalid flags, and an incomplete rider roster', () => {
  const enemies = BattleEngine.createRoundEnemies('forest', 2);
  for (const invalid of [
    { area: 'snow', round: 2, enemies, prototype: 'forest-elevated-v1' },
    { area: 'forest', round: 2, enemies, prototype: 'invalid' },
    { area: 'forest', round: 2, enemies: enemies.slice(0, 1), prototype: 'forest-elevated-v1' },
    { area: 'forest', round: 2, enemies: enemies.map(enemy => ({ ...enemy, isBoss: true })), prototype: 'forest-elevated-v1' },
  ]) assert.throws(() => buildBattlefield(invalid), TypeError);
});

test('each Forest seed has a real non-overlapping log hit opportunity, stable across rerenders', () => {
  for (const round of [1, 2, 3]) for (const seed of [0, 1, 13, 4927, 999999]) {
    const enemies = BattleEngine.createRoundEnemies('forest', round);
    const layout = buildPlayableBattlefield({ area: 'forest', round, enemies, seed });
    const witness = findForestLogOpportunity(layout);
    assert.ok(witness, `missing physical opportunity at ${round}/${seed}`);
    assert.ok(witness.shot.contacts.some(c => c.logMotion?.hit));
    assert.deepEqual(buildPlayableBattlefield({ area: 'forest', round, enemies, seed }), layout);
  }
});

test('builder rejects invalid identities and gives fresh empty layouts and frozen constants', () => {
  assert.ok(Object.isFrozen(BATTLEFIELD));
  const input = { area: 'forest', round: 1, enemies: [] };
  const a = buildBattlefield(input), b = buildBattlefield(input);
  assert.deepEqual(a.enemies, []);
  assert.deepEqual(a.obstacles, []);
  a.launcher.restPouch.x = 123;
  assert.equal(b.launcher.restPouch.x, 64);
  a.player.impact.x = 0;
  assert.equal(b.player.impact.x, 120);
  for (const invalid of [{ ...input, area: 'moon' }, { ...input, round: NaN },
    { ...input, enemies: [{ id: '', kind: 'snake', isBoss: false }] },
    { ...input, enemies: Array(2).fill({ id: 'same', kind: 'snake', isBoss: false }) }]) {
    assert.throws(() => buildBattlefield(invalid), TypeError);
  }
  assert.throws(() => buildPlayableBattlefield({ ...input, seed: -1 }), TypeError);
});

test('draw follows all normalized vectors, clamps power, resets and keeps candy above ground', () => {
  for (const direction of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 },
    { x: 0, y: 1 }, { x: 3, y: -4 }]) {
    const draw = getDragDraw({ direction, powerRatio: 2 });
    assert.equal(draw.tension, 72);
    assert.ok(Math.abs(Math.hypot(draw.pouch.x - 64, draw.pouch.y - 54) - 72) < 1e-9);
    assert.ok(758 + draw.pouch.y + 10 <= 900);
    assert.deepEqual(draw.left, { x: 34, y: 22 });
    assert.deepEqual(draw.right, { x: 91, y: 22 });
    assert.deepEqual(getDragDraw({ direction, powerRatio: 1 }, false).pouch, { x: 64, y: 54 });
  }
  assert.equal(getDragDraw({ direction: { x: 1, y: 0 }, powerRatio: -1 }).tension, 12);
  assert.throws(() => getDragDraw({ direction: { x: 0, y: 0 }, powerRatio: 0 }), TypeError);
});
