import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { buildPlayableBattlefield, isPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { createGameSession } from '../src/game/gameSession.js';
import { createStudioScenario } from '../src/dev/createStudioSession.js';

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
    assert.equal(run.studioPrototype, undefined);
    assert.deepEqual(run.enemyLandingPositions, {});
    const studio = createStudioScenario({ area, round: 2, seed: 0 });
    assert.equal(studio.prototype, prototypeFor(area));
    assert.ok(studio.layout.enemies.some(item => item.supportObstacleId));
  }
});
