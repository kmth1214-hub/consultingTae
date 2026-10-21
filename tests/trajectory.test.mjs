import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrajectory, pointAtDistance, getHitIds, getHitDetails, getSlingshotDraw } from '../src/game/trajectory.js';

const input = { start: { x: 232, y: 558 }, targetX: 950, angleDeg: 42, powerPercent: 60, worldWidth: 1200, worldHeight: 800 };
const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const rectAt = (point, id, size = 24) => ({ id, left: point.x - size / 2, top: point.y - size / 2, width: size, height: size });

test('trajectory is finite, power changes range, angle changes elevation, and preview is 30% of arc length', () => {
  const path = getTrajectory(input);
  assert.ok(path.length > 0);
  assert.ok(path.samples.every(point => Number.isFinite(point.x + point.y)));
  assert.deepEqual(pointAtDistance(path, 0), { ...input.start, t: 0 });
  const end = pointAtDistance(path, path.length);
  assert.equal(end.x, path.end.x);
  assert.equal(end.y, path.end.y);
  assert.ok(getTrajectory({ ...input, powerPercent: 80 }).end.x > path.end.x);
  assert.ok(getTrajectory({ ...input, angleDeg: 60 }).control.y < path.control.y);
  const preview = pointAtDistance(path, path.length * .3);
  const numbers = path.previewD.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  assert.ok(Math.abs(numbers[4] - preview.x) < .001);
  assert.ok(Math.abs(numbers[5] - preview.y) < .001);
  assert.notEqual(preview.t, .3, 'parameter fraction would expose more/less than 30% of the actual arc');
});

test('hit order follows the trajectory and ignores DOM order, duplicate IDs, dead targets and misses', () => {
  const path = getTrajectory(input);
  const first = rectAt(pointAtDistance(path, path.length * .4), 'first');
  const second = rectAt(pointAtDistance(path, path.length * .8), 'second');
  const rects = [second, { ...first, id: 'dead', alive: false }, first, first, rectAt({ x: 0, y: 0 }, 'miss')];
  assert.deepEqual(getHitIds(path, rects, identity), ['first', 'second']);
  const details = getHitDetails(path, rects, identity);
  assert.ok(details[0].distance < details[1].distance);
});

test('screen-space hit tests stay correct under camera zoom, translation and viewport resizing', () => {
  const path = getTrajectory(input);
  const target = rectAt(pointAtDistance(path, path.length * .6), 'target');
  for (const scale of [.3, .9, 1.5, 2]) {
    const matrix = { a: scale, b: 0, c: 0, d: scale, e: -121, f: 83 };
    const rect = { ...target, left: target.left * scale + matrix.e, top: target.top * scale + matrix.f,
      width: target.width * scale, height: target.height * scale };
    assert.deepEqual(getHitIds(path, [rect], matrix), ['target']);
  }
});

test('invalid geometry falls back to a miss and valid extreme angles/power stay finite', () => {
  assert.equal(getTrajectory({ ...input, targetX: NaN }), null);
  assert.equal(getTrajectory({ ...input, worldWidth: 0 }), null);
  assert.deepEqual(getHitIds(null, [], identity), []);
  assert.deepEqual(getHitIds(getTrajectory(input), [], null), []);
  assert.deepEqual(getHitIds(getTrajectory(input), [], { ...identity, a: 0 }), []);
  for (const angleDeg of [10, 80]) for (const powerPercent of [20, 100])
    assert.ok(Number.isFinite(getTrajectory({ ...input, angleDeg, powerPercent }).length));
});

test('pouch moves opposite the launch angle as power grows and resets on release', () => {
  const weak = getSlingshotDraw(42, 20), strong = getSlingshotDraw(42, 100);
  assert.ok(strong.pouch.x < weak.pouch.x);
  assert.ok(strong.pouch.y > weak.pouch.y);
  assert.notDeepEqual(getSlingshotDraw(70, 100).pouch, strong.pouch);
  assert.deepEqual(getSlingshotDraw(70, 100, false).pouch, { x: 64, y: 54 });
});

test('the one-shot Wind ability curves to its selected target instead of visually missing a guaranteed hit', () => {
  const homingTarget = { id: 'wind-target', x: 950, y: 569 };
  const normal = getTrajectory({ ...input, powerPercent: 20 });
  const homing = getTrajectory({ ...input, powerPercent: 20, homingTarget });
  assert.ok(normal.end.x < homingTarget.x);
  assert.equal(homing.homingTargetId, homingTarget.id);
  assert.deepEqual(homing.end, { x: 950, y: 569 });
  assert.deepEqual(getHitIds(homing, [rectAt(homingTarget, homingTarget.id)], identity), ['wind-target']);
});
