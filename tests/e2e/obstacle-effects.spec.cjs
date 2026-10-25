const { test, expect, installGame, arena, phase, snapshot, start, dragPull } = require('./support.cjs');

test('grounded candy rolls along the sampled path, then resolves the miss one time', async ({ page }) => {
  await installGame(page, { layoutSeed: 4927 }); await start(page);
  await dragPull(page, { angleDeg: -5, powerRatio: .6 });
  await expect(page.getByTestId('trajectory-preview')).toBeVisible();
  await page.mouse.up(); await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-roll-start-distance', /\d/);
  await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  await expect(arena(page)).toHaveAttribute('data-shot-rolling', 'true');
  await expect(arena(page)).toHaveAttribute('data-roll-distance', /[1-9]/);
  expect(trace.lastEvent.obstacleEffect).toBeNull();
});

test('Chaos inversion remains armed on cancel and reverses both drag axes for the next shot only', async ({ page }) => {
  await installGame(page, { stateOverride: { area: 'chaos', round: 1, pendingAimInversion: true } });
  await start(page);
  await expect(arena(page)).toHaveAttribute('data-aim-inverted', 'true');
  await expect(page.locator('#aim-instructions')).toContainText('다음 한 발 조작 반전');

  await dragPull(page, { angleDeg: 45, powerRatio: .5 });
  const path = await page.getByTestId('trajectory-preview').getAttribute('d');
  const points = [...path.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(match => ({ x: Number(match[1]), y: Number(match[2]) }));
  expect(points.at(-1).x).toBeLessThan(points[0].x);
  expect(points.at(-1).y).toBeGreaterThan(points[0].y);
  await page.keyboard.press('Escape');
  await phase(page, 'idle');
  await expect(arena(page)).toHaveAttribute('data-aim-inverted', 'true');

  await dragPull(page, { angleDeg: 45, powerRatio: .5 }); await page.mouse.up();
  await phase(page, 'launching');
  await expect(arena(page)).not.toHaveAttribute('data-aim-inverted', 'true');
  const trace = await snapshot(page);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  expect(trace.run.pendingAimInversion).toBe(false);
});

test('real obstacle contacts apply each regional effect with fixed RNG', async ({ page }) => {
  const enemy = (id, kind = 'snake') => ({ id, kind, hp: 20, maxHp: 20, isBoss: false, attackCount: 0, alive: true });
  const cases = [
    { area: 'forest', random: .5, enemies: [enemy('forest-near'), enemy('forest-far', 'boar')],
      effect: 'log-strike', expectedHp: [17, 20], expectedScore: 3, expectedBonus: 0 },
    { area: 'snow', random: .5, enemies: [enemy('snow-target', 'snowball')],
      effect: 'ice-guard', expectedHp: [20], expectedScore: 0, expectedBonus: 0 },
    { area: 'city', random: .5, enemies: [enemy('city-a', 'washing-robot'), enemy('city-b', 'washing-robot'), enemy('city-c', 'washing-robot')],
      effect: 'jar-burst', expectedHp: [18, 18, 18], expectedScore: 6, expectedBonus: 0 },
    ...[0, .25, .5, .75].map((random, index) => ({ area: 'chaos', round: 1, bonusMode: true, random,
      enemies: [enemy(`chaos-${index}`)], effect: ['log-strike', 'ice-guard', 'jar-burst', 'aim-inversion'][index],
      expectedHp: [20 - ([3, 0, 2, 0][index])], expectedScore: 0, expectedBonus: [3, 0, 2, 0][index] }))
  ];
  for (const scenario of cases) {
    await installGame(page, { random: scenario.random, layoutSeed: 4927, stateOverride: {
      area: scenario.area, round: scenario.round || 1, bonusMode: Boolean(scenario.bonusMode),
      enemies: scenario.enemies
    } });
    await start(page);
    const options = scenario.area === 'forest'
      ? await require('./support.cjs').stackShot({ area: 'forest', seed: 4927, physical: true, enemies: scenario.enemies })
      : { angleDeg: 0, powerRatio: .8 };
    await dragPull(page, options); await page.mouse.up();
    await expect(arena(page)).toHaveAttribute('data-obstacle-id', /obstacle-\d/);
    await expect(arena(page)).toHaveAttribute('data-obstacle-effect', scenario.effect);
    const trace = await snapshot(page);
    expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
    expect(trace.lastEvent.obstacleEffect.kind).toBe(scenario.effect);
    expect(trace.lastEvent.obstacleEffects.length).toBeGreaterThan(0);
    expect(trace.run.toppledObstacleIds.length).toBeGreaterThan(0);
    const expectedHp = scenario.area === 'forest' ? scenario.enemies.map(item =>
      item.hp - (options.shot.contacts.some(c => c.logHit?.id === item.id) ? 3 : 0)) : scenario.expectedHp;
    expect(trace.run.enemies.map(item => item.hp)).toEqual(expectedHp);
    expect(trace.run.score).toBe(scenario.expectedScore);
    expect(trace.run.bonusScore).toBe(scenario.expectedBonus);
    if (scenario.effect === 'ice-guard') expect(trace.lastEvent.enemyAttack.damageReduction).toBe(.5);
    await page.reload();
  }
});

test('mobile reduced-motion ground roll still resolves and keeps the arena inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page, { layoutSeed: 4927 }); await start(page);
  await dragPull(page, { angleDeg: -5, powerRatio: .6 }); await page.mouse.up();
  await expect(arena(page)).toHaveAttribute('data-roll-start-distance', /\d/);
  await expect(arena(page)).toHaveAttribute('data-shot-rolling', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const trace = await snapshot(page);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
});
