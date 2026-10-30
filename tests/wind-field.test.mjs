import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWindField, crossedWindZone, sampleWindAcceleration } from '../src/game/windField.js';
import { getBallisticPath, planShot } from '../src/game/shotGeometry.js';
import { BATTLEFIELD } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { BattleEngine } from '../src/game/battleEngine.js';
import { preparePhysicalFlight, flightResultPayload } from '../src/game/shotResolution.js';

const layout = { width: 3600, height: 1200, groundY: 900, minY: -1200,
  candyRadius: 10, launcher: { x: 180, y: 770 }, enemies: [], obstacles: [] };
const pull = { ready: true, direction: { x: .93, y: -.36755952 }, powerRatio: .72 };

test('wind field is stable across normal shots and changes with Chaos ordinal', () => {
  for (const area of ['forest', 'snow', 'city']) {
    const a = buildWindField({ area, round: 2, layoutSeed: 237, shotOrdinal: 0, layout });
    const b = buildWindField({ area, round: 2, layoutSeed: 237, shotOrdinal: 7, layout });
    assert.deepEqual(a, b);
    assert.equal(a.zones.length, 2);
    assert.ok(a.zones[0].x + a.zones[0].width < a.zones[1].x);
  }
  const chaos = Array.from({ length: 6 }, (_, shotOrdinal) => buildWindField({
    area: 'chaos', round: 1, layoutSeed: 237, shotOrdinal, layout }).direction);
  assert.ok(new Set(chaos).size > 1);
});

test('zone crossing alters the physical path and preview uses that same path', () => {
  const field = buildWindField({ area: 'forest', round: 1, layoutSeed: 237, layout });
  const shot = planShot({ layout, pull, enemies: [], windField: field });
  const noWind = planShot({ layout, pull, enemies: [] });
  assert.equal(crossedWindZone(shot.path, field, shot.impactDistance), true);
  assert.notEqual(shot.path.end.x, noWind.path.end.x);
  assert.ok(shot.previewD.startsWith('M'));
  assert.equal(sampleWindAcceleration(field, { x: 10, y: 10 }), 0);
  const outside = getBallisticPath({ start: { x: 0, y: 50 }, direction: { x: -1, y: 0 },
    powerRatio: .5, layout, windField: field });
  const plain = getBallisticPath({ start: { x: 0, y: 50 }, direction: { x: -1, y: 0 },
    powerRatio: .5, layout });
  assert.equal(crossedWindZone(outside, field), false);
  assert.ok(Math.abs(outside.end.x - plain.end.x) < 1e-6);
});

test('reserved flight exposes only the crossed flag and accepted launch advances ordinal once', () => {
  const run = BattleEngine.createRunState({ rng: () => .5 });
  run.layoutSeed = 237; run.encounterId = 1; run.battlefieldPrototype = 'forest-elevated-v1';
  run.battlefieldWorldScale = 1.5; run.enemyLandingPositions = {};
  const flight = preparePhysicalFlight(run, pull, 1, 1, 1000);
  assert.equal(typeof flight.windCrossed, 'boolean');
  assert.equal(flightResultPayload(flight).shotMeta.windCrossed, flight.windCrossed);
  assert.equal(run.playerShotsFired, 0);
  const event = BattleEngine.resolveProjectile(run, { hitIds: flight.hitIds, shotMeta: flightResultPayload(flight).shotMeta,
    rng: () => .5 });
  assert.equal(event.accepted, true);
  assert.equal(run.playerShotsFired, 1);
  assert.equal(BATTLEFIELD.width, 3600);
  assert.ok(buildPlayableBattlefield({ area: 'forest', round: 1, enemies: run.enemies,
    seed: 237, prototype: 'forest-elevated-v1', worldScale: 1.5 }).width > 0);
});
