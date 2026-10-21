import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBattlefield } from '../src/game/battlefieldModel.js';
import { getCameraPose, worldToScreen, screenToWorld } from '../src/game/battlefieldCamera.js';

const layout = buildBattlefield({ area: 'forest', round: 1,
  enemies: [{ id: 'enemy', kind: 'snake', isBoss: false }] });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('overview, aim and follow use uniform invertible transforms in wide, portrait and short viewports', () => {
  for (const viewport of [{ width: 2007, height: 1037 }, { width: 2560, height: 1080 },
    { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 100, height: 20 }]) {
    for (const mode of ['overview', 'aim', 'follow', 'enemy']) {
      const pose = getCameraPose({ mode, viewport, layout, focus: { x: 2300, y: 300 }, attackerId: 'enemy' });
      assert.ok(pose.scale > 0);
      for (const p of [{ x: 284, y: 812 }, { x: 3000, y: -400 }, { x: 0, y: 900 }]) {
        const screen = worldToScreen(p, pose), restored = screenToWorld(screen, pose);
        close(restored.x, p.x); close(restored.y, p.y);
        close(worldToScreen({ x: p.x + 10, y: p.y + 10 }, pose).x - screen.x,
          worldToScreen({ x: p.x + 10, y: p.y + 10 }, pose).y - screen.y);
      }
      if (mode !== 'follow') close(worldToScreen({ x: 0, y: 900 }, pose).y, viewport.height * .78);
      if (mode === 'overview') {
        assert.equal(pose.x, 0);
        close(worldToScreen({ x: 3600, y: 900 }, pose).x, viewport.width);
      }
      if (mode === 'enemy') {
        assert.ok(worldToScreen({ x: 220, y: 900 }, pose).x >= 0);
        assert.ok(worldToScreen({ x: 2438 + 46, y: 900 }, pose).x <= viewport.width);
      }
      const overview = getCameraPose({ mode: 'overview', viewport, layout });
      assert.deepEqual(getCameraPose({ mode, viewport, layout, reducedMotion: true }), overview);
    }
  }
});

test('follow clamps world edges and ceiling, missing inputs return overview, invalid transforms are explicit', () => {
  const viewport = { width: 1600, height: 760 };
  const overview = getCameraPose({ mode: 'overview', viewport, layout });
  for (const input of [{ mode: 'follow' }, { mode: 'enemy', attackerId: 'missing' }]) {
    assert.deepEqual(getCameraPose({ ...input, viewport, layout }), overview);
  }
  const left = getCameraPose({ mode: 'follow', viewport, layout, focus: { x: -9999, y: -9999 } });
  close(left.x, 0); close(left.y, 1200);
  const right = getCameraPose({ mode: 'follow', viewport, layout, focus: { x: 9999, y: 9999 } });
  close(right.x, -(3600 - 1600));
  close(worldToScreen({ x: 0, y: 900 }, right).y, 760 * .78);
  for (const bad of [{ width: 0, height: 50 }, { width: 100, height: NaN }, { width: Infinity, height: 50 }]) {
    assert.equal(getCameraPose({ mode: 'aim', viewport: bad, layout }), null);
  }
  assert.equal(screenToWorld({ x: 0, y: 0 }, { x: 0, y: 0, scale: 0 }), null);
  assert.throws(() => worldToScreen({ x: NaN, y: 0 }, overview), TypeError);
});
