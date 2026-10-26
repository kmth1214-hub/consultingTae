import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { buildBattlefield } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield, isPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { getCameraPose, worldToScreen, screenToWorld } from '../src/game/battlefieldCamera.js';

test('boss bodies and colliders use three times the regular baseline and leave clear space for props and each other', () => {
  for (const area of ['forest', 'snow', 'city', 'chaos']) for (const seed of [0, 1, 14, 4927, 0xffffffff]) {
    const enemies = BattleEngine.createRoundEnemies(area, 3);
    const layout = buildPlayableBattlefield({ area, round: 3, enemies, seed });
    assert.equal(isPlayableBattlefield(layout, enemies), true);
    for (const boss of layout.enemies) {
      assert.equal(boss.size, 92 * (boss.kind === 'chaos-fused-boss' ? 4.5 : 3));
      assert.equal(boss.collider.radius, boss.size * .42);
      assert.equal(boss.collider.y, layout.groundY - boss.size * .52);
      for (const prop of layout.obstacles) assert.ok(prop.x + prop.width < boss.x - boss.size / 2
        || prop.x > boss.x + boss.size / 2);
      for (const other of layout.enemies.filter(e => e.id !== boss.id))
        assert.ok(Math.abs(boss.x - other.x) > (boss.size + other.size) / 2);
    }
  }
  const regular = buildBattlefield({ area: 'forest', round: 1, enemies: BattleEngine.createRoundEnemies('forest', 1) });
  assert.equal(regular.enemies[0].size, 92);
  assert.deepEqual(['forest', 'snow', 'city'].map(area => BattleEngine.createRunState({ area, round: 3 }).enemies[0].hp), [10, 12, 15]);
});

test('boss overview and response cameras keep bodies plus nameplates within short, portrait and wide viewports', () => {
  const layout = buildBattlefield({ area: 'chaos', round: 3, enemies: BattleEngine.createRoundEnemies('chaos', 3) });
  for (const viewport of [{width:1440,height:900}, {width:390,height:760}, {width:2560,height:320}]) {
    for (const mode of ['overview', 'enemy']) for (const boss of layout.enemies) {
      const pose = getCameraPose({ mode, layout, viewport, attackerId: boss.id });
      const top = worldToScreen({ x:boss.x, y:boss.y-boss.size-30 }, pose);
      const feet = worldToScreen({ x:boss.x, y:boss.y }, pose);
      assert.ok(top.y > 40, 'space for boss nameplate');
      assert.ok(feet.y < viewport.height);
      const point = screenToWorld(top, pose);
      assert.ok(Math.abs(point.y-(boss.y-boss.size-30)) < 1e-8);
      for (const edge of [-1,1]) {
        const p = worldToScreen({ x:boss.x + edge * boss.size/2, y:boss.y }, pose);
        assert.ok(p.x >= 0 && p.x <= viewport.width);
      }
    }
  }
});
