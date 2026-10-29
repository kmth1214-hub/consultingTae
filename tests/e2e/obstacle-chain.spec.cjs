const { test, expect, installGame, start, dragPull, arena, phase, snapshot } = require('./support.cjs');

const cases = [
  { area: 'forest', seed: 5, angleDeg: 20, powerRatio: .825 },
  { area: 'snow', seed: 36, angleDeg: 25, powerRatio: .875 },
  { area: 'city', seed: 7, angleDeg: 35, powerRatio: .85 },
  { area: 'chaos', seed: 5, angleDeg: -5, powerRatio: .875 },
];
async function begin(page, options) {
  const [{ BattleEngine }, { buildPlayableBattlefield }, { planShot }, { createProjectilePlayback }] = await Promise.all([
    import('../../src/game/battleEngine.js'), import('../../src/game/battlefieldPlacement.js'),
    import('../../src/game/shotGeometry.js'), import('../../src/game/projectilePlayback.js')]);
  const enemies = BattleEngine.createRoundEnemies(options.area, 1, { rng: () => .5 });
  enemies.forEach(enemy => {
    enemy.hp = enemy.maxHp = 20;
    // Keep counterattack repair separate from the chain damage assertion.
    if (options.area === 'city') enemy.kind = 'washing-robot';
  });
  const layout = buildPlayableBattlefield({ area: options.area, round: 1, enemies, seed: options.seed,
    worldScale: 1.5, prototype: options.area === 'forest' ? 'forest-elevated-v1' : 'regional-elevated-v1' });
  const radians = options.angleDeg * Math.PI / 180;
  const shot = planShot({ layout, enemies, pull: { ready: true, powerRatio: options.powerRatio,
    direction: { x: Math.cos(radians), y: -Math.sin(radians) } } });
  expect(shot.contacts.some(c => c.trigger === 'obstacle')).toBe(true);
  await installGame(page, { layoutSeed: options.seed, stateOverride: { area: options.area, round: 1, enemies } });
  await start(page);
  await page.evaluate(() => {
    const resolve = window.BattleEngine.resolveProjectile;
    window.BattleEngine.resolveProjectile = (...args) => {
      window.__chainShotMeta = structuredClone(args[1].shotMeta);
      return resolve(...args);
    };
  });
  await dragPull(page, options);
  await page.clock.install({ time: new Date('2026-10-26T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await page.mouse.up();
  await phase(page, 'launching');
  return { shot, layout, clock: createProjectilePlayback(shot) };
}
const stack = (page, id) => page.locator(`.scene-scenery [data-obstacle-id="${id}"]`);
function playbackMs(clock, time) {
  let lo = 0, hi = clock.durationMs;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (clock.sampleTime(mid) < time) lo = mid; else hi = mid;
  }
  return Math.ceil(hi);
}

for (const options of cases) test(`${options.area} physical contact topples a neighbour after the candy stops, once per prop`, async ({ page }) => {
  const { shot, layout, clock } = await begin(page, options);
  const child = shot.contacts.find(c => c.trigger === 'obstacle');
  const childNode = stack(page, child.obstacleId);
  const beforeMs = playbackMs(clock, child.time - .04);
  await page.clock.runFor(beforeMs);
  await expect(childNode).toHaveAttribute('data-stack-state', 'standing');
  await expect(childNode).toHaveAttribute('data-contact-source', child.sourceObstacleId);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
  await page.clock.runFor(playbackMs(clock, child.time + .06) - beforeMs);
  await expect(childNode).toHaveAttribute('data-stack-state', 'falling');
  await expect(childNode).toHaveAttribute('data-chain-depth', '1');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'follow');
  if (options.area === 'snow') await expect(page.getByTestId('obstacle-frost').last()).toBeVisible();
  if (options.area === 'city') await expect(page.getByTestId('city-ground-chain').last()).toBeVisible();
  await page.screenshot({ path: `tmp/${options.area}-physical-chain.png` });
  await page.clock.runFor(Math.ceil(clock.durationMs - playbackMs(clock, child.time + .06)) + 40);
  await phase(page, 'reviewing');
  await expect(childNode).toHaveAttribute('data-motion-phase', 'settled');
  const committed = await snapshot(page);
  expect(committed.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
  const event = committed.events.find(e => e.name === 'resolveProjectile').result;
  const shotMeta = await page.evaluate(() => window.__chainShotMeta);
  expect(shotMeta.contacts.map(c => c.obstacleId)).toEqual(shot.contacts.map(c => c.obstacleId));
  expect(shotMeta.contacts.some(c => c.obstacleMotion || c.logMotion)).toBe(false);
  expect(committed.run.toppledObstacleIds).toEqual(shot.contacts.map(c => c.obstacleId));
  expect(event.obstacleEffects).toHaveLength(shot.contacts.length);
  const persisted = options.area === 'forest' ? committed.run.forestLogDebris : committed.run.obstacleDebris;
  expect(persisted).toHaveLength(shot.contacts.length);
  const untouched = layout.obstacles.filter(o => !shot.contacts.some(c => c.obstacleId === o.id));
  for (const prop of untouched) await expect(stack(page, prop.id)).toHaveAttribute('data-stack-state', 'standing');
  if (options.area === 'city') {
    expect(event.obstacleEffects.every(effect => effect.hits.length === committed.run.enemies.length
      && effect.hits.every(hit => hit.damage === 2))).toBe(true);
    expect(committed.run.enemies.map(e => e.hp)).toEqual(committed.run.enemies.map(e =>
      16 - (shot.hitIds.includes(e.id) ? 2 : 0)));
    expect(committed.run.score).toBe(committed.run.enemies.length * 4 + shot.hitIds.length * 2);
  }
  if (options.area === 'snow') expect(event.enemyAttack.damageReduction).toBe(.5);
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await page.clock.runFor(1000);
  await phase(page, 'reviewing');
  await page.clock.runFor(4000);
  await phase(page, 'idle');
  const settled = await childNode.getAttribute('transform');
  await dragPull(page, { angleDeg: 40, powerRatio: .2 });
  await expect(childNode).toHaveAttribute('transform', settled);
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('mobile reduced motion preserves chain outcomes, material identity and the result hold', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { shot } = await begin(page, cases[2]);
  await page.clock.runFor(100);
  await phase(page, 'reviewing');
  const nodes = page.locator('.stack--physical');
  await expect(nodes).toHaveCount(2);
  for (const node of await nodes.all()) {
    await expect(node).toHaveAttribute('data-obstacle-kind', 'crate');
    await expect(node).toHaveAttribute('data-motion-phase', 'settled');
    expect(await node.locator('.stack-body rect[rx="4"]').count()).toBe(2);
  }
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'tmp/city-physical-chain-mobile.png' });
  await page.clock.runFor(4000);
  await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.run.enemies.map(e => e.hp)).toEqual(trace.run.enemies.map(e =>
    16 - (shot.hitIds.includes(e.id) ? 2 : 0)));
});
