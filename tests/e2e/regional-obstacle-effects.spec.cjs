const { test, expect, installGame, arena, phase, snapshot, start, dragPull } = require('./support.cjs');

const enemy = (id, kind) => ({ id, kind, hp: 20, maxHp: 20, isBoss: false, attackCount: 0, alive: true });
async function contactRegion(page, area) {
  const enemies = area === 'snow' ? [enemy('snow-target', 'snowball')]
    : ['a', 'b', 'c'].map(id => enemy(`city-${id}`, 'washing-robot'));
  await installGame(page, { layoutSeed: 4927, stateOverride: { area, round: 1, enemies } });
  await start(page);
  await dragPull(page, { angleDeg: 0, powerRatio: .8 });
  await page.mouse.up();
}

test('ice contact chills the viewport once without changing guard combat or blocking input', async ({ page }) => {
  await contactRegion(page, 'snow');
  const frost = page.getByTestId('obstacle-frost').first();
  await expect(frost).toBeVisible();
  const arenaBox = await arena(page).boundingBox(), frostBox = await frost.boundingBox();
  expect(Math.abs(frostBox.width - arenaBox.width)).toBeLessThan(3);
  expect(Math.abs(frostBox.height - arenaBox.height)).toBeLessThan(3);
  expect(await frost.evaluate(node => ({ events: getComputedStyle(node).pointerEvents,
    outsideCamera: !node.closest('.arena-world') }))).toEqual({ events: 'none', outsideCamera: true });
  await page.screenshot({ path: 'tmp/snow-obstacle-frost.png' });
  await expect(page.getByTestId('obstacle-frost')).toHaveCount(0);
  await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  expect(trace.lastEvent.enemyAttack.damageReduction).toBe(.5);
  expect(trace.run.enemies[0].hp).toBe(20);
  // A new aim remains usable and does not replay the completed effect.
  await dragPull(page, { powerRatio: .2 });
  await expect(page.getByTestId('obstacle-frost')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await phase(page, 'idle');
});

test('city contact makes staggered ground bursts and preserves all-enemy damage exactly once', async ({ page }) => {
  await contactRegion(page, 'city');
  const chain = page.getByTestId('city-ground-chain').first();
  await expect(chain).toBeVisible();
  const bursts = chain.locator('.city-ground-burst');
  await expect(bursts).toHaveCount(7);
  const positions = await bursts.evaluateAll(nodes => nodes.map(node => ({
    y: node.dataset.groundY, transform: node.getAttribute('transform'),
    delay: getComputedStyle(node.querySelector('.city-burst-plume')).animationDelay,
  })));
  expect(positions.every(item => item.y === '900' && / 900\)$/.test(item.transform))).toBe(true);
  expect(positions.map(item => item.delay)).toEqual(['0s', '0.11s', '0.22s', '0.33s', '0.44s', '0.55s', '0.66s']);
  expect(new Set(positions.map(item => item.transform)).size).toBe(7);
  // Capture the travelling sequence after several puffs have ignited.
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'tmp/city-obstacle-chain.png' });
  await expect(page.getByTestId('city-ground-chain')).toHaveCount(0);
  await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  expect(trace.run.enemies.map(item => item.hp)).toEqual([18, 18, 18]);
  expect(trace.run.score).toBe(6);
});

for (const area of ['snow', 'city']) test(`${area} mobile reduced-motion contact gives a static cue and cleans up`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await contactRegion(page, area);
  const effect = page.getByTestId(area === 'snow' ? 'obstacle-frost' : 'city-ground-chain').first();
  await expect(effect).toBeVisible();
  const animated = area === 'snow' ? effect : effect.locator('.city-burst-ring').first();
  expect(await animated.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  if (area === 'city') await expect(effect.locator('.city-burst-plume').first()).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: `tmp/${area}-obstacle-mobile.png` });
  await expect(effect).toHaveCount(0);
  await phase(page, 'idle');
  expect((await snapshot(page)).events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
});
