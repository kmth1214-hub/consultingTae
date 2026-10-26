import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectilePlayback } from '../src/game/projectilePlayback.js';
import { planShot, sampleAtDistance } from '../src/game/shotGeometry.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { BattleEngine } from '../src/game/battleEngine.js';

function realShot(angle = -5, power = .6) {
  const enemies = BattleEngine.createRoundEnemies('forest', 1, { rng: () => .5 });
  const layout = buildPlayableBattlefield({ area: 'forest', round: 1, seed: 4927, enemies });
  const radians = angle * Math.PI / 180;
  return planShot({ layout, enemies, pull: { ready: true, powerRatio: power,
    direction: { x: Math.cos(radians), y: -Math.sin(radians) } } });
}

test('readable playback extends actual ground time without altering geometry, flight timing or log follow-through', () => {
  const shot = realShot(), frozen = JSON.stringify(shot);
  const start = sampleAtDistance(shot.path, shot.rollStartDistance).time;
  const baseScale = shot.durationMs / shot.simulationSeconds;
  const clock = createProjectilePlayback(shot);
  const startMs = start * baseScale;
  assert.ok(Math.abs(clock.sampleTime(startMs) - start) < 1e-9);
  assert.ok(clock.durationMs - startMs >= 240);
  assert.ok(Math.abs(clock.sampleTime(startMs / 2) - start / 2) < 1e-9);
  const times = Array.from({ length: 1001 }, (_, i) => clock.sampleTime(i * clock.durationMs / 1000));
  assert.ok(times.every((time, i) => i === 0 || time >= times[i - 1]));
  assert.equal(clock.sampleTime(-100), 0);
  assert.equal(clock.sampleTime(clock.durationMs + 100), shot.simulationSeconds);
  assert.equal(JSON.stringify(shot), frozen);
  assert.ok(shot.rollDistance <= 100);
  const withTail = { ...shot, simulationSeconds: shot.simulationSeconds + 1, durationMs: shot.durationMs + 1000 };
  const tailClock = createProjectilePlayback(withTail);
  const tailMs = withTail.durationMs / withTail.simulationSeconds;
  assert.ok(Math.abs(tailClock.sampleTime(tailClock.durationMs - tailMs) - shot.directHitTime) < 1e-9);
});

test('reverse rolls retain their original direction and non-rolling/reduced-motion timing stays unchanged', () => {
  const reverse = realShot(185, .25), clock = createProjectilePlayback(reverse);
  assert.ok(reverse.rollDistance > 1);
  const start = sampleAtDistance(reverse.path, reverse.rollStartDistance);
  assert.ok(reverse.path.end.x < start.x);
  assert.ok(clock.durationMs > reverse.durationMs);
  const noRoll = realShot(90, 1);
  assert.equal(noRoll.rollStartDistance, null);
  const airClock = createProjectilePlayback(noRoll);
  assert.equal(airClock.durationMs, noRoll.durationMs);
  assert.equal(airClock.sampleTime(airClock.durationMs / 2), noRoll.simulationSeconds / 2);
  const reduced = createProjectilePlayback(reverse, { reducedMotion: true });
  assert.equal(reduced.durationMs, 80);
  assert.equal(reduced.sampleTime(40), reverse.simulationSeconds / 2);
});
