import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnemyProjectileArc, sampleEnemyProjectile, enemyTrailD } from '../src/game/enemyProjectileMotion.js';

test('enemy throws use a high parabola with exact sockets, landing point and tangent', () => {
  const source = { x: 2500, y: 840 }, target = { x: 120, y: 824 };
  const arc = createEnemyProjectileArc({ source, target });
  assert.ok(Math.abs(arc.height - 435.6) < 1e-8);
  const first = sampleEnemyProjectile(arc, 0), last = sampleEnemyProjectile(arc, 1), middle = sampleEnemyProjectile(arc, .5);
  assert.deepEqual({ x: first.x, y: first.y }, source);
  assert.deepEqual({ x: last.x, y: last.y }, target);
  assert.equal(middle.x, 1310);
  assert.ok(Math.abs(middle.y - (832 - arc.height)) < 1e-8);
  assert.ok(first.angle < -90 && last.angle > 90, 'initial ascent and final descent face the player');
  for (const p of [.1, .3, .5, .8]) {
    const point = sampleEnemyProjectile(arc, p);
    const bezierY = (1 - p) ** 2 * source.y + 2 * (1 - p) * p * arc.control.y + p ** 2 * target.y;
    assert.ok(Math.abs(point.y - bezierY) < 1e-8);
  }
  assert.deepEqual(sampleEnemyProjectile(arc, -1), first);
  assert.deepEqual(sampleEnemyProjectile(arc, 2), last);
  assert.equal(createEnemyProjectileArc({ source: { x: 0, y: 0 }, target: { x: 9999, y: 10 } }).height, 440);
  assert.equal(createEnemyProjectileArc({ source: { x: 0, y: 0 }, target: { x: 1, y: 10 } }).height, 200);
});

test('wake is the exact travelled sub-curve, not a different guide path or future trajectory', () => {
  const arc = createEnemyProjectileArc({ source: { x: 0, y: 100 }, target: { x: 2000, y: 150 }, height: 300 });
  assert.equal(enemyTrailD(arc, 0), '');
  const d = enemyTrailD(arc, .65), numbers = d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  const [sx, sy, cx, cy, ex, ey] = numbers;
  const start = sampleEnemyProjectile(arc, .49), end = sampleEnemyProjectile(arc, .65);
  assert.deepEqual([sx, sy, ex, ey], [start.x, start.y, end.x, end.y]);
  const midpoint = sampleEnemyProjectile(arc, .57);
  assert.ok(Math.abs((sx + 2 * cx + ex) / 4 - midpoint.x) < 1e-8);
  assert.ok(Math.abs((sy + 2 * cy + ey) / 4 - midpoint.y) < 1e-8);
});

test('beam and vertical routes remain finite, reject invalid inputs and do not mutate data', () => {
  const options = { source: { x: 10, y: 30 }, target: { x: 10, y: 500 }, height: 0 };
  const before = structuredClone(options), arc = createEnemyProjectileArc(options);
  assert.equal(sampleEnemyProjectile(arc, .5).y, 265);
  assert.equal(sampleEnemyProjectile(arc, .5).angle, 90);
  sampleEnemyProjectile(arc, .2); enemyTrailD(arc, .6);
  assert.deepEqual(options, before);
  assert.throws(() => createEnemyProjectileArc({ ...options, source: { x: NaN, y: 0 } }), TypeError);
  assert.throws(() => createEnemyProjectileArc({ ...options, height: -1 }), TypeError);
  assert.throws(() => sampleEnemyProjectile(arc, NaN), TypeError);
  assert.throws(() => enemyTrailD(arc, .6, 0), TypeError);
});
