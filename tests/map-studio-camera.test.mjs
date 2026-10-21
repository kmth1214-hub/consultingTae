import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudioPose, panStudio, zoomStudioAt } from '../src/dev/mapStudioCamera.js';
import { screenToWorld, worldToScreen } from '../src/game/battlefieldCamera.js';

const viewport = { width: 1200, height: 600 };
const initial = { zoom: 1, center: { x: 1800, y: 600 } };

test('reset camera shows the full world with a uniform invertible matrix', () => {
  const pose = getStudioPose({ viewport, camera: initial });
  assert.equal(pose.scale, 1 / 3);
  assert.deepEqual(worldToScreen({ x: 1800, y: 600 }, pose), { x: 600, y: 300 });
  assert.deepEqual(screenToWorld({ x: 600, y: 300 }, pose), { x: 1800, y: 600 });
  assert.equal(getStudioPose({ viewport: { width: 0, height: 600 }, camera: initial }), null);
});

test('drag follows pointer direction at a fixed origin and clamps to the expanded review bounds', () => {
  const moved = panStudio({ camera: initial, viewport, delta: { x: -100, y: 30 } });
  assert.ok(moved.center.x > initial.center.x);
  assert.ok(moved.center.y < initial.center.y);
  const extreme = panStudio({ camera: initial, viewport, delta: { x: 1e8, y: -1e8 } });
  assert.ok(extreme.center.x >= -600 && extreme.center.x <= 4200);
  assert.ok(extreme.center.y >= -200 && extreme.center.y <= 1800);
});

test('cursor-anchored zoom preserves the world point, clamps zoom limits and resets to the full scene', () => {
  const pointer = { x: 820, y: 180 };
  const beforePose = getStudioPose({ viewport, camera: initial });
  const worldBefore = screenToWorld(pointer, beforePose);
  const zoomed = zoomStudioAt({ camera: initial, viewport, nextZoom: 2, point: pointer });
  const worldAfter = screenToWorld(pointer, getStudioPose({ viewport, camera: zoomed }));
  assert.ok(Math.abs(worldBefore.x - worldAfter.x) < 1e-8);
  assert.ok(Math.abs(worldBefore.y - worldAfter.y) < 1e-8);
  assert.equal(zoomStudioAt({ camera: initial, viewport, nextZoom: 99, point: pointer }).zoom, 6);
  assert.equal(zoomStudioAt({ camera: initial, viewport, nextZoom: .1, point: pointer }).zoom, 1);
  assert.deepEqual(initial, { zoom: 1, center: { x: 1800, y: 600 } });
  const short = getStudioPose({ viewport: { width: 400, height: 900 }, camera: initial });
  assert.ok(Number.isFinite(short.scale));
});
