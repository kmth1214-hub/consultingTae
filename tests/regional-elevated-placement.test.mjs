import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { buildPlayableBattlefield, isPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { createGameSession } from '../src/game/gameSession.js';
import { createStudioScenario } from '../src/dev/createStudioSession.js';
import { getDragDraw, BATTLEFIELD } from '../src/game/battlefieldModel.js';
import { preparePhysicalFlight } from '../src/game/shotResolution.js';

const areas = ['forest', 'snow', 'city', 'chaos'];
const prototypeFor = area => area === 'forest' ? 'forest-elevated-v1' : 'regional-elevated-v1';

test('four regions place supported enemies at the intended rounds without blocking targets', () => {
  for (const area of areas) for (const round of [1, 2, 3]) for (const scale of [1, 1.5]) {
    const enemies = BattleEngine.createRoundEnemies(area, round, { rng: () => .5 });
    for (const seed of [0, 1, 4, 4927]) {
      const input = { area, round, enemies, seed, worldScale: scale, prototype: prototypeFor(area) };
      const layout = buildPlayableBattlefield(input);
      const supports = layout.obstacles.filter(item => item.supportsEnemyId);
      const riders = layout.enemies.filter(item => item.supportObstacleId);
      const expected = round === 3 ? 0 : area === 'chaos'
        ? enemies.length > 10 ? 3 : 2 : round === 2 ? 1 : 0;
      assert.equal(supports.length, expected, `${area}/${round}/${scale}/${seed}`);
      assert.equal(riders.length, expected);
      assert.equal(new Set(supports.map(item => item.elevation)).size, expected);
      assert.ok(isPlayableBattlefield(layout, enemies));
      assert.deepEqual(buildPlayableBattlefield(input), layout);
      for (const support of supports) {
        const rider = riders.find(item => item.id === support.supportsEnemyId);
        assert.equal(rider.supportObstacleId, support.id);
        assert.equal(rider.y, support.y);
        assert.equal(support.kind, area === 'chaos' ? ['log', 'ice', 'crate'][supports.indexOf(support)]
          : { forest: 'log', snow: 'ice', city: 'crate' }[area]);
      }
      if (round === 3) assert.ok(layout.enemies.every(item => item.isBoss && item.y === layout.groundY));
      assert.equal(layout.player.contact.y, layout.launcher.contact.y);
    }
  }
});

test('public session and studio preview use regional elevation without publishing private candy abilities', () => {
  for (const area of areas) {
    const session = createGameSession({ rng: () => .5, layoutRng: () => 0,
      storage: { getItem: () => null, setItem() {} },
      engine: { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options, area, round: 2 }) } });
    session.actions.startCharacterSelect();
    session.actions.startRun('adventurer');
    const run = session.getSnapshot().run;
    assert.equal(run.battlefieldPrototype, prototypeFor(area));
    assert.equal(run.battlefieldWorldScale, 1.5);
    assert.equal(run.studioPrototype, undefined);
    assert.deepEqual(run.enemyLandingPositions, {});
    assert.equal(buildPlayableBattlefield({ area, round: 2, enemies: run.enemies,
      seed: run.layoutSeed, prototype: run.battlefieldPrototype,
      worldScale: run.battlefieldWorldScale }).worldScale, 1.5);
    const studio = createStudioScenario({ area, round: 2, seed: 0 });
    assert.equal(studio.prototype, prototypeFor(area));
    assert.ok(studio.layout.enemies.some(item => item.supportObstacleId));
  }
});

test('public physical flights use the same enlarged bodies and launch anchor in all regions', () => {
  for (const area of areas) for (const round of [1, 2, 3]) {
    const session = createGameSession({ rng: () => .5, layoutRng: () => 0,
      storage: { getItem: () => null, setItem() {} },
      engine: { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options, area, round }) } });
    session.actions.startCharacterSelect();
    session.actions.startRun('adventurer');
    const run = session.getSnapshot().run;
    const input = { area, round, enemies: run.enemies, seed: run.layoutSeed,
      prototype: run.battlefieldPrototype, enemyLandingPositions: run.enemyLandingPositions };
    const original = buildPlayableBattlefield({ ...input, worldScale: 1 });
    const layout = buildPlayableBattlefield({ ...input, worldScale: run.battlefieldWorldScale });
    const pull = { ready: true, powerRatio: .7, direction: { x: .8, y: -.6 } };
    const flight = preparePhysicalFlight(run, pull, 1, 1);
    const draw = getDragDraw(pull, true, 1.5);
    assert.ok(flight, `${area}/${round} should produce a flight`);
    assert.equal(flight.candyRadius, 15);
    assert.deepEqual(flight.path.start, { x: layout.launcher.x + draw.pouch.x,
      y: layout.launcher.y + draw.pouch.y });
    assert.equal(layout.candyRadius * 2 * BATTLEFIELD.maxRollDiameters, 150);
    assert.equal(layout.player.width, original.player.width * 1.5);
    assert.equal(layout.launcher.width, original.launcher.width * 1.5);
    for (const [index, enemy] of layout.enemies.entries()) {
      assert.equal(enemy.size, original.enemies[index].size * 1.5);
      assert.equal(enemy.collider.radius, original.enemies[index].collider.radius * 1.5);
      if (enemy.isBoss) assert.equal(enemy.size / (92 * 1.5), enemy.kind === 'chaos-fused-boss' ? 4.5 : 3);
    }
    for (const obstacle of layout.obstacles) assert.equal(obstacle.width,
      (obstacle.supportsEnemyId ? 128 : 80) * 1.5);
  }
});
