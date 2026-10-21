import test from 'node:test';
import assert from 'node:assert/strict';
import { applyScenePose, getSceneOffsets } from '../src/game/sceneParallax.js';

const viewport = { width: 1200, height: 720 };

test('overview keeps every scenery plane at its canonical alignment', () => {
  const pose = { x: 0, y: .78 * viewport.height - 900 * .333, scale: .333 };
  const offsets = getSceneOffsets({ pose, viewport });
  for (const point of Object.values(offsets)) assert.deepEqual(point, { x: 0, y: 0 });
  assert.deepEqual(offsets.route, { x: 0, y: 0 });
});

test('decorative depth moves at distinct rates and clamps at documented caps', () => {
  const offsets = getSceneOffsets({ pose: { x: -4200, y: -3800, scale: 1.5 }, viewport });
  const moderate = getSceneOffsets({ pose: { x: -300, y: -120, scale: 1.5 }, viewport });
  assert.ok(moderate.sky.x > moderate.distant.x);
  assert.ok(moderate.distant.x > moderate.midground.x);
  assert.ok(moderate.midground.x > moderate.route.x);
  assert.ok(offsets.sky.x >= offsets.distant.x);
  assert.ok(offsets.distant.x > offsets.midground.x);
  assert.ok(offsets.midground.x > offsets.route.x);
  assert.deepEqual(offsets.route, { x: 0, y: 0 });
  assert.deepEqual(offsets.sky, { x: 540, y: 150 });
  assert.deepEqual(offsets.distant, { x: 540, y: 150 });
  assert.deepEqual(offsets.midground, { x: 160, y: 40 });
  assert.deepEqual(offsets.foreground, { x: -45, y: -10 });
});

test('reduced motion and invalid inputs return fresh all-zero offsets without mutation', () => {
  const pose = { x: -200, y: 30, scale: 1.2 }, copy = { ...pose };
  const first = getSceneOffsets({ pose, viewport, reducedMotion: true });
  first.sky.x = 12;
  assert.equal(getSceneOffsets({ pose, viewport, reducedMotion: true }).sky.x, 0);
  assert.deepEqual(pose, copy);
  assert.deepEqual(getSceneOffsets({ pose: { x: NaN, y: 0, scale: 1 }, viewport }).route, { x: 0, y: 0 });
  assert.deepEqual(getSceneOffsets({ pose: { x: 0, y: 0, scale: 0 }, viewport }).foreground, { x: 0, y: 0 });
  assert.deepEqual(getSceneOffsets({ pose, viewport: { width: 0, height: 1 } }).sky, { x: 0, y: 0 });
});

test('one camera application preserves the canonical world matrix and updates the minimap viewport', () => {
  const properties = new Map();
  const arenaProperties = new Map();
  const arena = { style: { setProperty: (key, value) => arenaProperties.set(key, value) } };
  const world = { parentElement: arena, style: { width: '3600px', height: '1200px', setProperty: (key, value) => properties.set(key, value) } };
  const pose = { x: -600, y: -300, scale: 1.5 };
  applyScenePose(world, pose, viewport, false);
  assert.equal(world.style.transform, 'translate(-600px, -300px) scale(1.5)');
  assert.equal(properties.get('--camera-scale'), 1.5);
  assert.notEqual(properties.get('--scene-distant-x'), properties.get('--scene-route-x'));
  assert.equal(properties.get('--scene-route-x'), '0px');
  assert.equal(arenaProperties.get('--minimap-camera-left'), '11.11111111111111%');
  assert.equal(arenaProperties.get('--minimap-camera-width'), '22.22222222222222%');
});
