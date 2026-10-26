import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateForestLog, simulateObstacleMotion, sampleLogMotion } from '../src/game/forestLogPhysics.js';

const obstacle = { id: 'log', kind: 'log', x: 600, y: 744, width: 80, height: 156 };
const enemy = (id, x, y = 852, radius = 38) => ({ id, collider: { id, x, y, radius } });
const args = overrides => ({ obstacle, point: { x: 600, y: 790 }, velocity: { x: 1100, y: 150 },
  startTime: 1, layout: { width: 3600, groundY: 900 }, enemies: [], ...overrides });

test('physical body reaches a nearby target only, preserving first collision and absolute time', () => {
  const motion = simulateForestLog(args({ enemies: [enemy('near', 800), enemy('far', 900)] }));
  assert.equal(motion.hit.id, 'near');
  assert.ok(motion.hit.time > 1 && motion.hit.time < 1 + motion.durationSeconds);
  assert.equal(simulateForestLog(args({ enemies: [enemy('remote', 1400)] })).hit, null);
  assert.equal(simulateForestLog(args({ enemies: [enemy('above', 800, 400)] })).hit, null);
  assert.equal(simulateForestLog(args({ velocity: { x: -1100, y: 150 }, enemies: [enemy('left', 480)] })).hit.id, 'left');
});

test('impact height and velocity change travel; landing slide is finite and capped at one width', () => {
  const slow = simulateForestLog(args({ velocity: { x: 100, y: 0 } }));
  const fast = simulateForestLog(args({ velocity: { x: 4000, y: -400 } }));
  assert.ok(fast.endPose.x > slow.endPose.x + 100);
  assert.ok(fast.slideDistance <= obstacle.width + 1e-6);
  assert.ok(slow.slideDistance < fast.slideDistance);
  assert.equal(fast.samples.at(-1).phase, 'settled');
  assert.ok(Math.abs(fast.endPose.y - 860) < .001);
  const high = simulateForestLog(args({ point: { x: 600, y: 750 } }));
  const low = simulateForestLog(args({ point: { x: 600, y: 895 } }));
  assert.notEqual(high.samples[50].angle, low.samples[50].angle);
  assert.notEqual(high.endPose.x, low.endPose.x);
  assert.equal(simulateForestLog(args({ velocity: { x: 100, y: 0 }, enemies: [enemy('near', 800)] })).hit, null);
});

test('swept collision includes landing/slide contact and sampling uses the exact motion', () => {
  const free = simulateForestLog(args({ velocity: { x: 1800, y: -100 } }));
  const sliding = free.samples.find(p => p.phase === 'sliding');
  assert.ok(sliding);
  const target = enemy('landing', sliding.x + 80, 880, 10);
  const motion = simulateForestLog(args({ velocity: { x: 1800, y: -100 }, enemies: [target] }));
  assert.equal(motion.hit?.id, 'landing');
  assert.deepEqual(sampleLogMotion(motion, -5), motion.samples[0]);
  assert.deepEqual(sampleLogMotion(motion, 100), motion.samples.at(-1));
  const at = sampleLogMotion(motion, motion.startTime + .1);
  assert.ok(Number.isFinite(at.x) && Number.isFinite(at.angle));
  const before = structuredClone(motion);
  sampleLogMotion(motion, 1.7);
  assert.deepEqual(motion, before);
  assert.equal(simulateForestLog(args({ velocity: { x: NaN, y: 0 } })), null);
  assert.throws(() => sampleLogMotion(null, 1), TypeError);
});

test('world edges contain the whole moving body and inputs are not mutated', () => {
  const input = args({ obstacle: { ...obstacle, x: 3400 }, velocity: { x: 6000, y: -300 } });
  const copy = structuredClone(input), motion = simulateForestLog(input);
  for (const p of motion.samples) {
    const ex = Math.abs(Math.cos(p.angle)) * 40 + Math.abs(Math.sin(p.angle)) * 78;
    assert.ok(p.x >= ex - .001 && p.x + ex <= 3600 + .001);
  }
  assert.deepEqual(input, copy);
});

const stack = (id, x) => ({ id, x, y: 744, width: 80, height: 156,
  polygon: [{ x, y: 744 }, { x: x + 80, y: 744 }, { x: x + 80, y: 900 }, { x, y: 900 }] });

test('swept rotating stacks contact nearby boundaries once with absolute time and point velocity', () => {
  const input = args({ obstacle: stack('a', 600), obstacles: [stack('near', 760), stack('far', 1500)] });
  const copy = structuredClone(input), motion = simulateObstacleMotion(input);
  assert.deepEqual(motion.obstacleHits.map(h => h.id), ['near']);
  const contact = motion.obstacleHits[0];
  assert.ok(contact.time > 1 && contact.time < 1 + motion.durationSeconds);
  assert.ok(contact.point.x >= 760 && contact.point.x <= 840);
  assert.ok(contact.velocity.x > 0 && Number.isFinite(contact.velocity.y));
  const pose = sampleLogMotion(motion, contact.time);
  assert.ok(pose.x < 760, 'rotation reaches the neighbour before its centre does');
  assert.deepEqual(input, copy);
  const reverse = simulateObstacleMotion(args({ obstacle: stack('a', 600),
    velocity: { x: -1100, y: 150 }, obstacles: [stack('left', 440)] }));
  assert.equal(reverse.obstacleHits[0].id, 'left');
  assert.ok(reverse.obstacleHits[0].velocity.x < 0);
});

test('motion does not hit empty polygon space; weak travel stops short and transfer is damped', () => {
  const target = stack('next', 760);
  assert.deepEqual(simulateObstacleMotion(args({ obstacle: stack('a', 600),
    velocity: { x: 50, y: 0 }, obstacles: [target] })).obstacleHits, []);
  const motion = simulateObstacleMotion(args({ obstacle: stack('a', 600), obstacles: [target] }));
  const highTarget = { ...target, polygon: target.polygon.map(p => ({ ...p, y: p.y - 500 })) };
  assert.deepEqual(simulateObstacleMotion(args({ obstacles: [highTarget] })).obstacleHits, []);
  const hit = motion.obstacleHits[0];
  const child = simulateObstacleMotion(args({ obstacle: target, point: hit.point,
    velocity: hit.velocity, startTime: hit.time, transfer: true }));
  const initialSpeed = (child.samples[1].x - child.samples[0].x) * 240;
  assert.ok(Math.abs(initialSpeed - hit.velocity.x * .65) < .001);
  assert.equal(simulateObstacleMotion(args({ obstacles: [{ id: 'bad', polygon: [] }] })), null);
});
