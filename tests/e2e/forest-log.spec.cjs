const { test, expect, installGame, start, dragPull, phase, arena, snapshot, stackShot } = require('./support.cjs');

test('a Forest log follows its physical path, hits once, and stays at its final position during the next aim', async ({ page }) => {
  await installGame(page, { enemyHp: 20 }); await start(page);
  const options = await stackShot({ physical: true });
  const contact = options.shot.contacts.find(c => c.logHit);
  const stack = page.locator(`.scene-scenery [data-obstacle-id="${contact.obstacleId}"]`);
  await page.screenshot({ path: 'tmp/forest-physics-overview.png' });
  await dragPull(page, options); await page.mouse.up();
  await expect(stack).toHaveAttribute('data-stack-state', 'falling');
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
  await page.screenshot({ path: 'tmp/forest-physics-flight.png' });
  await phase(page, 'idle');
  await expect(stack).toHaveAttribute('data-motion-phase', 'settled');
  const settled = await stack.getAttribute('transform');
  const trace = await snapshot(page);
  const actual = trace.run.forestLogDebris.find(c => c.obstacleId === contact.obstacleId);
  expect(settled).toContain(String(actual.x));
  expect(trace.lastEvent.obstacleEffects.flatMap(effect => effect.hits).map(hit => hit.damage)).toEqual([3]);
  expect(trace.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
  await dragPull(page, { powerRatio: .2 });
  await expect(stack).toHaveAttribute('transform', settled);
  await page.keyboard.press('Escape'); await page.mouse.up();
});

test('a thrown Forest log that misses has no remote damage or score', async ({ page }) => {
  await installGame(page); await start(page);
  await dragPull(page, await stackShot({ physical: false })); await page.mouse.up(); await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.run.enemies[0].hp).toBe(4);
  expect(trace.run.score).toBe(0);
  expect(trace.lastEvent.obstacleEffects.length).toBeGreaterThan(0);
  expect(trace.lastEvent.obstacleEffects.flatMap(effect => effect.hits)).toEqual([]);
  expect(trace.run.ammo).toBe(8);
});

test('physical Forest hit remains functional at a reduced-motion phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page, { enemyHp: 20 }); await start(page);
  await dragPull(page, await stackShot({ physical: true })); await page.mouse.up(); await phase(page, 'idle');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(17);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
});
