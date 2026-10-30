const { test, expect, installGame, arena, phase, snapshot, start, dragPull } = require('./support.cjs');

async function beginReview(page, fixture = {}, pull = { angleDeg: -5, powerRatio: .6 }) {
  await installGame(page, { layoutSeed: 4927, ...fixture });
  await start(page);
  await dragPull(page, pull);
  await page.clock.install({ time: new Date('2026-10-26T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await page.mouse.up();
  for (let i = 0; i < 200; i++) {
    await page.clock.runFor(16);
    if (await arena(page).getAttribute('data-shot-review') === 'true') break;
  }
  await expect(arena(page)).toHaveAttribute('data-shot-review', 'true');
  await phase(page, 'reviewing');
}

test('camera holds the committed landing result for two seconds before the enemy response', async ({ page }) => {
  await beginReview(page);
  const before = await snapshot(page);
  expect(before.run.ammo).toBe(2);
  expect(before.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'follow');
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await expect(page.getByTestId('projectile')).toHaveAttribute('data-flight-stage', 'settled');
  await expect(page.getByTestId('projectile')).toBeVisible();
  const resting = await page.getByTestId('projectile').getAttribute('transform');
  await page.clock.runFor(1000);
  await page.evaluate(() => dispatchEvent(new Event('blur')));
  await page.keyboard.press('3');
  const box = await arena(page).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.clock.runFor(950);
  await phase(page, 'reviewing');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'follow');
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  const held = await snapshot(page);
  expect(held.run).toEqual(before.run);
  expect(await page.getByTestId('projectile').getAttribute('transform')).toBe(resting);
  await page.screenshot({ path: 'tmp/shot-review-two-seconds.png' });
  await page.clock.runFor(100);
  await phase(page, 'responding');
  await expect(page.getByTestId('enemy-attack')).toBeVisible();
  await page.clock.runFor(2500);
  await phase(page, 'idle');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  expect((await snapshot(page)).events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
});

test('cleared enemies and score update immediately while the reward screen waits for review', async ({ page }) => {
  await beginReview(page, { fastCombat: true });
  const before = await snapshot(page);
  expect(before.run.enemies.every(enemy => !enemy.alive)).toBe(true);
  expect(before.run.score).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: '다음 전투의 보상', exact: true })).toHaveCount(0);
  await page.clock.runFor(1950);
  await phase(page, 'reviewing');
  await page.clock.runFor(100);
  await expect(page.getByRole('heading', { name: '다음 전투의 보상', exact: true })).toBeVisible();
  expect((await snapshot(page)).events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
});

test('reduced-motion mobile also gets two seconds to read the result without moving its camera', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await beginReview(page);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  await page.clock.runFor(1950);
  await phase(page, 'reviewing');
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.clock.runFor(100);
  await phase(page, 'responding');
  await page.clock.runFor(1000);
  await phase(page, 'idle');
});

test('pending Oven repair and ammo loss stay hidden until its counterattack impact', async ({ page }) => {
  await beginReview(page, { stateOverride: { area: 'city', round: 3, enemies: [{
    id: 'city-oven-robot', kind: 'oven-robot', isBoss: true, hp: 10, maxHp: 18, alive: true, attackCount: 2,
  }] } }, { angleDeg: -90, powerRatio: .08 });
  const committed = await snapshot(page);
  expect(committed.lastEvent.enemyAttack.healedEnemy).toBe(3);
  expect(committed.run.enemies[0].hp).toBe(13);
  const boss = page.locator('.monster[data-enemy-id="city-oven-robot"]');
  await expect(boss).toHaveAttribute('aria-label', /체력 10\/18/);
  await expect(page.locator('.battle-stats > span').nth(1).locator('strong')).toHaveText('2');
  await page.clock.runFor(2050);
  await phase(page, 'responding');
  await expect(boss).toHaveAttribute('aria-label', /체력 10\/18/);
  await page.clock.runFor(2500);
  await phase(page, 'idle');
  await expect(boss).toHaveAttribute('aria-label', /체력 13\/18/);
  await expect(page.locator('.battle-stats > span').nth(1).locator('strong')).toHaveText('1');
});
