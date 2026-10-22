import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { BATTLEFIELD, buildBattlefield, getDragDraw } from '../src/game/battlefieldModel.js';

test('real round slots and regional solids are deterministic without changing live enemies or RNG', () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => { throw new Error('Layout must not roll RNG'); };
    for (const area of ['forest', 'snow', 'city', 'chaos']) {
      for (let round = 1; round <= 3; round++) {
        for (const rng of [() => 0, () => .5, () => .999]) {
          const enemies = BattleEngine.createRoundEnemies(area, round, { rng });
          const snapshot = structuredClone(enemies);
          const layout = buildBattlefield({ area, round, enemies });
          assert.deepEqual(enemies, snapshot);
          assert.equal(layout.enemies.length, enemies.length);
          assert.deepEqual(layout.enemies.map(e => e.id), enemies.map(e => e.id));
          assert.equal(layout.width, 3600);
          assert.deepEqual(layout.player, { x: 44, y: 748, width: 152, height: 152,
            impact: { x: 120, y: 824 }, contact: { x: 170, y: 900 } });
          assert.ok(layout.obstacles.length >= 1);
          assert.equal(new Set(layout.obstacles.map(o => o.id)).size, layout.obstacles.length);
          for (const [i, enemy] of layout.enemies.entries()) {
            assert.equal(enemy.kind, enemies[i].kind);
            assert.equal(enemy.isBoss, enemies[i].isBoss);
            assert.equal('hp' in enemy, false);
            assert.equal('alive' in enemy, false);
            assert.equal(enemy.y, 900);
            assert.equal(enemy.size, enemy.isBoss ? 130 : enemies.length <= 6 ? 92 : 60);
          }
          for (const [i, prop] of layout.obstacles.entries()) {
            assert.equal(prop.kind, area === 'chaos' ? ['log', 'ice', 'crate'][i]
              : { forest: 'log', snow: 'ice', city: 'crate' }[area]);
            assert.equal(prop.id, `${area}-${round}-obstacle-${i}`);
            assert.equal(prop.width, 72);
            assert.equal(prop.y + prop.height, 900);
            assert.ok(prop.polygon.every(p => p.x >= prop.x && p.x <= prop.x + 72
              && p.y >= prop.y && p.y <= 900));
            for (const enemy of layout.enemies) assert.ok(prop.x + prop.width <= enemy.x - enemy.size / 2 - 8
              || prop.x >= enemy.x + enemy.size / 2 + 8, `${prop.id} overlaps ${enemy.id}`);
            for (const previous of layout.obstacles.slice(0, i)) {
              assert.ok(Math.abs(prop.x - previous.x) >= 180 - 1e-9);
            }
          }
          const dead = enemies.map((e, i) => ({ ...e, alive: i > 0, hp: i ? 2 : 0 }));
          assert.deepEqual(buildBattlefield({ area, round, enemies: dead }), layout);
          if (enemies.length === 1) assert.equal(layout.enemies[0].x - 284, 3 * (950 - 232));
          else {
            assert.equal(layout.enemies[0].x, 1000);
            assert.equal(layout.enemies.at(-1).x, 2860);
          }
        }
      }
    }
  } finally { Math.random = originalRandom; }
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
