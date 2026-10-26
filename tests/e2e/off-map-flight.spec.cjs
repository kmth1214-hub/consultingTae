const { test, expect, installGame, start, dragPull, arena, phase, snapshot } = require('./support.cjs');

async function pause(page) {
  await page.clock.install({ time: new Date('2026-10-26T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await page.clock.runFor(240);
}
async function until(page, predicate) {
  for (let step = 0; step < 100; step++) {
    if (await predicate()) return;
    await page.clock.runFor(64);
  }
  throw new Error('The real flight did not reach the expected boundary');
}
async function flightView(page) {
  return page.evaluate(() => {
    const projectile = document.querySelector('[data-testid="projectile"]');
    const world = document.querySelector('.arena-world');
    const arena = document.querySelector('.battle-arena');
    if (!projectile || !world || !arena) return null;
    const camera = new DOMMatrix(getComputedStyle(world).transform);
    const point = projectile.transform.baseVal.consolidate().matrix;
    const box = arena.getBoundingClientRect();
    const candyBox = projectile.getBoundingClientRect();
    return { phase: arena.dataset.aimPhase, x: point.e,
      cameraX: camera.e, scale: camera.a, width: box.width,
      outside: candyBox.left > box.right || candyBox.right < box.left,
      overflow: getComputedStyle(arena).overflow };
  });
}

for (const reverse of [false, true]) test(`${reverse ? 'reverse' : 'forward'} overdraw exits the scene while its camera stays inside and commits one miss`, async ({ page }) => {
  await installGame(page); await start(page); await pause(page);
  const origin = await dragPull(page, { angleDeg: reverse ? 135 : 45, powerRatio: .72 });
  await expect(page.getByRole('img', { name: '새총의 힘: 강하게 당김', exact: true })).toBeVisible();
  await expect(page.locator('.launcher')).not.toHaveClass(/is-overdrawn/);
  await dragPull(page, { angleDeg: reverse ? 135 : 45, powerRatio: 1, origin });
  await page.clock.runFor(240);
  await expect(page.getByRole('img', { name: '새총의 힘: 한계까지 당김', exact: true })).toBeVisible();
  await expect(page.locator('.launcher')).toHaveClass(/is-overdrawn/);
  const meter = await page.locator('.power-meter').evaluate(node => ({
    text: node.textContent, height: node.getBoundingClientRect().height,
    boost: node.querySelector('.power-meter-boost').getBoundingClientRect().height
  }));
  expect(meter.text).not.toMatch(/[0-9%°]/);
  expect(meter.boost / meter.height).toBeGreaterThan(.15);
  expect(meter.boost / meter.height).toBeLessThan(.25);
  if (!reverse) await page.screenshot({ path: 'tmp/off-map-power-draw.png' });
  await page.mouse.up(); await phase(page, 'launching');
  await until(page, async () => {
    const view = await flightView(page);
    return view?.phase === 'launching' && (reverse ? view.x < -500 : view.x > 4200);
  });
  const outside = await flightView(page);
  expect(outside.outside).toBe(true); expect(outside.overflow).toBe('hidden');
  const edge = reverse ? 0 : Math.min(0, outside.width - 3600 * outside.scale);
  expect(Math.abs(outside.cameraX - edge)).toBeLessThan(4);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
  if (!reverse) await page.screenshot({ path: 'tmp/off-map-flight-outside.png' });
  await until(page, async () => await arena(page).getAttribute('data-aim-phase') === 'reviewing');
  const committed = await snapshot(page);
  expect(committed.lastEvent.missed).toBe(true);
  expect(committed.lastEvent.hits).toEqual([]); expect(committed.lastEvent.obstacleEffects).toEqual([]);
  expect(committed.run.ammo).toBe(8); expect(committed.run.round).toBe(1);
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'bounds');
  await page.clock.runFor(4000); await phase(page, 'idle');
  const settled = await snapshot(page);
  expect(settled.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
  expect(settled.run.playerHp).toBe(95);
  await page.clock.runFor(5000);
  expect((await snapshot(page)).run).toEqual(settled.run);
});

test('portrait reduced-motion overdraw keeps the same off-map result and cancellation spends no candy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page); await start(page); await pause(page);
  await dragPull(page, { angleDeg: 45, powerRatio: 1 }); await page.keyboard.press('Escape');
  await page.mouse.up(); await phase(page, 'idle');
  expect((await snapshot(page)).run.ammo).toBe(9);
  await dragPull(page, { angleDeg: 45, powerRatio: 1 }); await page.mouse.up();
  await page.clock.runFor(100); await phase(page, 'reviewing');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'bounds');
  await page.clock.runFor(4000); await phase(page, 'idle');
  const state = await snapshot(page);
  expect(state.run.ammo).toBe(8); expect(state.lastEvent.hits).toEqual([]);
  expect(state.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});
