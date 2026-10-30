import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BattleEngine } from '../src/game/battleEngine.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { findPatrolContact, patrolX, planShot } from '../src/game/shotGeometry.js';

test('city rounds replace exactly two robots without changing enemy totals or health', () => {
  for (const [round, count] of [[1, 9], [2, 10]]) {
    const enemies = BattleEngine.createRoundEnemies('city', round, { rng: () => .5 });
    assert.equal(enemies.length, count);
    assert.equal(enemies.filter(enemy => enemy.kind === 'clockwork-crow').length, 2);
    assert.equal(enemies.filter(enemy => enemy.kind === 'washing-robot').length, count - 2);
    assert.ok(enemies.every(enemy => enemy.hp === 4 && enemy.maxHp === 4 && !enemy.isBoss));
  }
  assert.equal(BattleEngine.createRoundEnemies('city', 3)[0].kind, 'oven-robot');
  assert.equal(existsSync(new URL('../assets/monsters/clockwork-crow.png', import.meta.url)), true);
});

test('city crows are airborne, apart from obstacles and other enemies', () => {
  for (const round of [1, 2]) for (const seed of [0, 1, 37, 0x12345678]) {
    const enemies = BattleEngine.createRoundEnemies('city', round, { rng: () => .5 });
    const layout = buildPlayableBattlefield({ area: 'city', round, enemies, seed,
      prototype: 'regional-elevated-v1', worldScale: 1.5 });
    const birds = layout.enemies.filter(enemy => enemy.kind === 'clockwork-crow');
    assert.equal(birds.length, 2);
    for (const bird of birds) {
      assert.ok(bird.y < layout.groundY - bird.size);
      assert.equal(bird.supportObstacleId, undefined);
      assert.ok(layout.enemies.every(other => other.id === bird.id
        || Math.hypot(other.collider.x - bird.collider.x, other.collider.y - bird.collider.y)
          > bird.collider.radius + other.collider.radius));
      assert.ok(layout.obstacles.every(obstacle => obstacle.x + obstacle.width < bird.x - bird.size / 2
        || obstacle.x > bird.x + bird.size / 2));
    }
  }
});

test('patrol collider and rendered x share a clock; the same shot can hit or miss', () => {
  const enemies = BattleEngine.createRoundEnemies('city', 1, { rng: () => .5 });
  const layout = buildPlayableBattlefield({ area: 'city', round: 1, enemies, seed: 0,
    prototype: 'regional-elevated-v1', worldScale: 1.5 });
  const bird = layout.enemies.find(enemy => enemy.patrol);
  assert.ok(bird.patrol.range > bird.collider.radius + layout.candyRadius);
  assert.equal(patrolX(bird.patrol, 0), patrolX(bird.patrol, bird.patrol.periodMs));
  const path = { samples: [
    { x: bird.x, y: bird.collider.y, time: 0, distance: 0 },
    { x: bird.x + 1, y: bird.collider.y, time: .01, distance: 1 }
  ] };
  const centerTime = (1 - bird.patrol.phase) * bird.patrol.periodMs;
  assert.equal(findPatrolContact(path, bird, centerTime, 0, layout.candyRadius), 0);
  assert.equal(findPatrolContact(path, bird, centerTime + bird.patrol.periodMs / 4, 0,
    layout.candyRadius), null);

  const isolated = { ...layout, enemies: [bird], obstacles: [] };
  let changed = false;
  for (let angle = 0; angle <= 65 && !changed; angle += 5) for (let power = .1; power <= 1 && !changed; power += .025) {
    const radians = angle * Math.PI / 180;
    const pull = { ready: true, powerRatio: power,
      direction: { x: Math.cos(radians), y: -Math.sin(radians) } };
    const first = planShot({ layout: isolated, pull, enemies, flightStartMs: centerTime });
    const second = planShot({ layout: isolated, pull, enemies,
      flightStartMs: centerTime + bird.patrol.periodMs / 2 });
    changed = Boolean(first?.hitIds.includes(bird.id) !== second?.hitIds.includes(bird.id));
  }
  assert.equal(changed, true);
});

test('a swooping crow counterattacks once with normal city damage', () => {
  const run = BattleEngine.createRunState({ area: 'city', round: 1, rng: () => .5 });
  run.enemies = [{ id: 'bird', kind: 'clockwork-crow', hp: 4, maxHp: 4,
    alive: true, isBoss: false, attackCount: 0 }];
  const before = run.playerHp;
  const attack = BattleEngine.resolveEnemyTurn(run, () => .5);
  assert.equal(attack.enemyId, 'bird');
  assert.equal(attack.kind, 'clockwork-crow');
  assert.equal(attack.missed, false);
  assert.ok(attack.damage >= 1 && attack.damage <= 8);
  assert.equal(before - run.playerHp, attack.damage);
  assert.equal(run.turnNumber, 1);
});
