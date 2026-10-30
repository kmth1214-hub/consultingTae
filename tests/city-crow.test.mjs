import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BattleEngine } from '../src/game/battleEngine.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';

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
