const { test, expect, installGame, start, dragPull, phase, arena, snapshot, stackShot } = require('./support.cjs');

for (const [area, material] of [['forest', 'log'], ['snow', 'ice'], ['city', 'crate'], ['chaos', 'log']]) {
  test(`${area} stack topples, keeps its regional effect, and remains as debris`, async ({ page }) => {
    await installGame(page, { initial: { area }, layoutSeed: 4927 });
    await start(page);
    await dragPull(page, await stackShot({ area, seed: 4927, physical: area === 'forest' }));
    await page.mouse.up();
    await phase(page, 'launching');
    const battle = arena(page);
    await expect(battle).toHaveAttribute('data-obstacle-id', /(?:obstacle|support)-\d/);
    const obstacleId = await battle.getAttribute('data-obstacle-id');
    const stack = page.locator(`.scene-scenery [data-obstacle-id="${obstacleId}"]`);
    await expect(stack).toHaveAttribute('data-obstacle-kind', material);
    await expect(stack).toHaveAttribute('data-stack-state', /falling|toppled/);
    await expect(stack).toHaveAttribute('data-stack-state', 'toppled');
    await expect.poll(async () => (await snapshot(page)).events.filter(event => event.name === 'resolveProjectile').length).toBe(1);
    const trace = await snapshot(page);
    expect(trace.run.toppledObstacleIds).toContain(obstacleId);
    expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
    const expectedEffect = { forest: 'log-strike', snow: 'ice-guard', city: 'jar-burst', chaos: 'jar-burst' }[area];
    expect(trace.lastEvent.obstacleEffects[0].kind).toBe(expectedEffect);
    const effectHits = trace.lastEvent.obstacleEffects.flatMap(effect => effect.hits);
    if (area === 'forest') expect(effectHits[0].damage).toBe(3);
    if (area === 'snow') expect(trace.lastEvent.enemyAttack.damageReduction).toBe(.5);
    if (area === 'city' || area === 'chaos') {
      expect(effectHits.map(hit => hit.damage)).toEqual(trace.run.enemies.map(() => 2));
    }
    expect(area === 'chaos' ? trace.run.bonusScore : trace.run.score)
      .toBeGreaterThanOrEqual(effectHits.reduce((sum, hit) => sum + hit.scoreDelta, 0));
  });
}

test('ordinary candy topples a stack while Wind homing flies to its enemy without toppling', async ({ page }) => {
  await installGame(page, { layoutSeed: 4927 });
  await start(page);
  await dragPull(page, await stackShot({ seed: 4927, physical: true }));
  await page.mouse.up();
  await expect(arena(page)).toHaveAttribute('data-obstacle-id', /obstacle-\d/);
  await expect.poll(async () => (await snapshot(page)).events.filter(event => event.name === 'resolveProjectile').length).toBe(1);
  const ordinary = await snapshot(page);
  expect(ordinary.lastEvent.obstacleEffects.length).toBeGreaterThan(0);

  const windPage = await page.context().newPage();
  const browserErrors = [];
  windPage.on('pageerror', error => browserErrors.push(error.message));
  windPage.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await installGame(windPage, { allWeapons: true, layoutSeed: 4927 });
  await windPage.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await start(windPage, '바람궁수 쿠키');
  await dragPull(windPage, { angleDeg: 0, powerRatio: 1 });
  await expect(windPage.locator('.monster.is-targeted')).toHaveCount(1);
  await windPage.mouse.up();
  await expect(arena(windPage)).toHaveAttribute('data-impact-kind', 'enemy');
  await expect.poll(async () => (await snapshot(windPage)).events.filter(event => event.name === 'resolveProjectile').length).toBe(1);
  const homing = await snapshot(windPage);
  expect(homing.run.roundEffects.windHomingUsed).toBe(true);
  expect(homing.run.toppledObstacleIds).toEqual([]);
  expect(homing.lastEvent.obstacleEffects).toEqual([]);
  expect(homing.lastEvent.hits.length).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});
