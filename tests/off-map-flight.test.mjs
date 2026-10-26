import test from 'node:test';
import assert from 'node:assert/strict';
import { BATTLEFIELD, buildBattlefield, getLaunchSpeed } from '../src/game/battlefieldModel.js';
import { getBallisticPath } from '../src/game/shotGeometry.js';
import { getCameraPose, worldToScreen } from '../src/game/battlefieldCamera.js';
import { createGameSession } from '../src/game/gameSession.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { pullAt } from './helpers/physical-shot.mjs';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const layout = buildBattlefield({ area: 'forest', round: 1, enemies: [] });
const start = { x: 284, y: 812 };

test('ordinary pulls keep their previous energy while the upper draw extends usable launch speed', () => {
  for (const p of [0, .2, .5, .7, .8]) close(getLaunchSpeed(p), 240 + 1720 * p);
  close(getLaunchSpeed(1), 2600);
  assert.ok(getLaunchSpeed(.9) > 240 + 1720 * .9);
  for (let step = 1; step <= 100; step++) assert.ok(getLaunchSpeed(step / 100) > getLaunchSpeed((step - 1) / 100));
  assert.equal(getLaunchSpeed(-1), 240); assert.equal(getLaunchSpeed(2), 2600);
  for (const value of [NaN, Infinity, undefined, '1']) assert.equal(getLaunchSpeed(value), null);
});

test('full forward and reverse flights pass the scene boundary along their actual parabola', () => {
  for (const sign of [1, -1]) {
    const direction = { x: sign * Math.SQRT1_2, y: -Math.SQRT1_2 };
    const path = getBallisticPath({ start, direction, powerRatio: 1, layout });
    const vy = -2600 * Math.SQRT1_2;
    const landingTime = (-vy + Math.sqrt(vy * vy + 2400 * (890 - start.y))) / 1200;
    close(path.durationSeconds, landingTime);
    close(path.end.x, start.x + sign * 2600 * Math.SQRT1_2 * landingTime);
    close(path.end.y, 890); assert.equal(path.endKind, 'bounds');
    assert.ok(sign > 0 ? path.end.x > layout.width + 2000 : path.end.x < -2000);
    const outside = path.samples.filter(p => sign > 0 ? p.x > layout.width : p.x < 0);
    assert.ok(outside.length > 30);
    for (const p of path.samples) {
      close(p.x, start.x + direction.x * 2600 * p.time);
      close(p.y, start.y + direction.y * 2600 * p.time + 600 * p.time ** 2);
      assert.ok(p.time <= BATTLEFIELD.maxSeconds);
    }
  }
});

test('the camera ceiling is not a physical wall; a high shot returns to the battlefield floor', () => {
  const path = getBallisticPath({ start, direction: { x: 0, y: -1 }, powerRatio: 1, layout });
  assert.ok(path.samples.some(p => p.y < layout.minY - 500));
  assert.equal(path.endKind, 'ground'); close(path.end.x, start.x); close(path.end.y, 890);
  const returning = getBallisticPath({ start: { x: 4000, y: 200 }, direction: { x: -1, y: 0 }, powerRatio: 1, layout });
  assert.ok(returning); assert.equal(returning.endKind, 'ground');
  assert.equal(getBallisticPath({ start: { x: 284, y: 891 }, direction: { x: 1, y: 0 }, powerRatio: 1, layout }), null);
});

test('an off-map focus leaves the camera clamped and the candy outside the viewport', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const x of [-3000, 6000]) {
      const pose = getCameraPose({ mode: 'follow', viewport, layout, focus: { x, y: 500 } });
      const viewWidth = viewport.width / pose.scale;
      close(pose.x, x < 0 ? 0 : -Math.max(0, layout.width - viewWidth) * pose.scale);
      const screen = worldToScreen({ x, y: 500 }, pose);
      assert.ok(x < 0 ? screen.x < 0 : screen.x > viewport.width);
    }
  }
});

for (const area of ['forest', 'snow', 'city', 'chaos']) test(`${area}: a real off-map shot misses and can commit only one ammo and counterattack`, () => {
  let resolutions = 0;
  const session = createGameSession({ rng: () => .5, layoutRng: () => 0,
    storage: { getItem: () => null, setItem() {} }, engine: { ...BattleEngine,
      createRunState: options => BattleEngine.createRunState({ ...options, area }),
      resolveProjectile: (...args) => { resolutions++; return BattleEngine.resolveProjectile(...args); } } });
  session.actions.startCharacterSelect(); session.actions.startRun('adventurer');
  const before = structuredClone(session.getSnapshot().run);
  const reserved = session.actions.beginShot({ launchId: 1, pull: pullAt(45, 1) });
  assert.equal(reserved.accepted, true); assert.equal(reserved.flight.impactKind, 'bounds');
  assert.ok(reserved.flight.path.end.x > 5000); assert.equal(reserved.flight.rollStartDistance, null);
  assert.deepEqual(reserved.flight.contacts, []); assert.deepEqual(reserved.flight.hitIds, []);
  const commit = () => session.actions.fireShot({ shotId: reserved.shotId, encounterId: reserved.encounterId, reviewResult: true });
  const event = commit(); assert.equal(event.accepted, true); assert.equal(event.missed, true);
  assert.ok(event.enemyAttack); assert.equal(session.getSnapshot().run.ammo, before.ammo - 1);
  assert.deepEqual(session.getSnapshot().run.enemies, before.enemies); assert.equal(resolutions, 1);
  let snapshot = session.getSnapshot(); session.actions.completeShotReview(snapshot.shotReview.id);
  session.actions.completeEnemyResponse(snapshot.enemyResponse.id);
  const settled = structuredClone(session.getSnapshot().run);
  assert.equal(commit().accepted, false); assert.equal(resolutions, 1);
  assert.deepEqual(session.getSnapshot().run, settled); assert.equal(settled.round, 1);
});
