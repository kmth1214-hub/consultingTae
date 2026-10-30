import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as E } from '../src/game/battleEngine.js';
import { BATTLEFIELD, buildBattlefield } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { planShot, pathPrefixD, shotDisruptionOptions } from '../src/game/shotGeometry.js';
import { preparePhysicalFlight } from '../src/game/shotResolution.js';
import { buildWindField } from '../src/game/windField.js';

const pull = { ready: true, direction: { x: 1, y: -.02 }, powerRatio: 1 };

test('only the studio Chaos regular rounds opt into the three disruption parameters', () => {
  const normal = shotDisruptionOptions(E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
    inventory: {} }));
  assert.deepEqual(normal, { maxPowerRatio: 1, previewFraction: .3, maxRollDiameters: 5 });
  for (const [effect, key, expected] of [
    ['pull', 'maxPowerRatio', .85], ['preview', 'previewFraction', .15],
    ['roll', 'maxRollDiameters', 3]
  ]) {
    const run = E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
      inventory: {}, studioMonsterPrototype: 'regional-monsters-v1' });
    run.pendingAimDisruption = effect;
    assert.equal(shotDisruptionOptions(run)[key], expected);
    run.round = 3;
    assert.deepEqual(shotDisruptionOptions(run), normal);
    run.round = 1; run.area = 'forest';
    assert.deepEqual(shotDisruptionOptions(run), normal);
  }
  assert.equal(BATTLEFIELD.maxRollDiameters, 5);
});

test('preview and committed flight use identical altered geometry and physical contacts', () => {
  for (const effect of ['pull', 'preview', 'roll']) {
    const run = E.createRunState({ area: 'chaos', round: 1, rng: () => 0,
      inventory: {}, studioMonsterPrototype: 'regional-monsters-v1' });
    run.layoutSeed = 7;
    run.pendingAimDisruption = effect;
    const layout = buildPlayableBattlefield({ area: run.area, round: run.round,
      enemies: run.enemies, seed: run.layoutSeed });
    const windField=buildWindField({area:run.area,round:run.round,layoutSeed:run.layoutSeed,
      shotOrdinal:run.playerShotsFired,layout});
    const preview = planShot({ layout, pull, enemies: run.enemies,
      windField,flightStartMs:1000,
      ...shotDisruptionOptions(run), toppledObstacleIds: run.toppledObstacleIds });
    const flight = preparePhysicalFlight(run, pull, 1, 1, 1000);
    assert.ok(preview && flight);
    assert.deepEqual(preview.path.samples, flight.path.samples);
    assert.equal(preview.previewD, flight.previewD);
    assert.deepEqual(preview.hitIds, flight.hitIds);
    assert.deepEqual(preview.contacts, flight.contacts);
    assert.equal(preview.rollDistance, flight.rollDistance);
  }
});

test('pull, preview and roll caps are physical while ordinary geometry keeps its defaults', () => {
  const layout = buildBattlefield({ area: 'chaos', round: 1, enemies: [] });
  const input = { layout, pull, enemies: [] };
  const defaultShot = planShot(input);
  const pulled = planShot({ ...input, maxPowerRatio: .85 });
  assert.ok(pulled.path.end.x < defaultShot.path.end.x);
  const shortened = planShot({ ...input, previewFraction: .15 });
  assert.deepEqual(shortened.path.samples, defaultShot.path.samples);
  assert.equal(shortened.previewD, pathPrefixD(shortened.path, shortened.path.length * .15));
  assert.equal(defaultShot.previewD, pathPrefixD(defaultShot.path, defaultShot.path.length * .3));
  const shorterRoll = planShot({ ...input, maxRollDiameters: 3 });
  assert.ok(shorterRoll.rollDistance <= layout.candyRadius * 2 * 3);
  assert.ok(defaultShot.rollDistance <= layout.candyRadius * 2 * 5);
  assert.ok(shorterRoll.rollDistance <= defaultShot.rollDistance);
});
