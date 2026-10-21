const { test, expect, installGame, start, shoot, dragPull, phase, arena, snapshot } = require('./support.cjs');

for (const [area, material] of [['forest', 'log'], ['snow', 'ice'], ['city', 'crate'], ['chaos', 'log']]) {
  test(`${area} solid material stops a real mouse-launched candy at its registered obstacle`, async ({ page }) => {
    await installGame(page, { initial: { area } });
    await start(page);
    await dragPull(page, { angleDeg: 0, powerRatio: 1 });
    await page.mouse.up();
    await phase(page, 'launching');
    const battle = arena(page);
    await expect(battle).toHaveAttribute('data-impact-kind', 'obstacle');
    const impactKind = await battle.getAttribute('data-impact-kind');
    const obstacleId = await battle.getAttribute('data-obstacle-id');
    const obstacle = page.locator(`.scene-scenery [data-obstacle-id="${obstacleId}"]`);
    await expect(obstacle).toHaveCount(1);
    await expect(obstacle).toHaveAttribute('data-obstacle-kind', material);
    await page.screenshot({ path: `tmp/wide-t05-${area}-obstacle-1440.jpg` });
    await phase(page, 'idle');
    const trace = await snapshot(page);
    expect(impactKind).toBe('obstacle');
    expect(trace.lastEvent.hits).toEqual([]);
    expect(trace.run.enemies.every(enemy => enemy.hp === enemy.maxHp)).toBe(true);
    expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  });
}

function insidePolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

test('the same straight full-power pull stops for an ordinary cookie and curves past solids for Wind', async ({ page }) => {
  await installGame(page);
  await start(page);
  await dragPull(page, { angleDeg: 0, powerRatio: 1 });
  await page.mouse.up();
  await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'obstacle');
  const ordinaryImpactKind = await arena(page).getAttribute('data-impact-kind');
  await phase(page, 'idle');
  const ordinary = await snapshot(page);
  expect(ordinaryImpactKind).toBe('obstacle');
  expect(ordinary.run.enemies[0].hp).toBe(4);

  const windPage = await page.context().newPage();
  const browserErrors = [];
  windPage.on('pageerror', error => browserErrors.push(error.message));
  windPage.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  await installGame(windPage, { allWeapons: true });
  await windPage.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await start(windPage, '바람궁수 쿠키');
  await dragPull(windPage, { angleDeg: 0, powerRatio: 1 });
  await expect(windPage.locator('.monster.is-targeted')).toHaveCount(1);
  await windPage.mouse.up();
  await phase(windPage, 'launching');
  await expect(arena(windPage)).toHaveAttribute('data-impact-kind', 'enemy');
  const windImpactKind = await arena(windPage).getAttribute('data-impact-kind');
  await expect(windPage.getByTestId('projectile')).toBeVisible();
  await windPage.screenshot({ path: 'tmp/wide-t05-wind-curve-1440.jpg' });
  const trajectory = await windPage.getByTestId('projectile').evaluate(async element => {
    const points = [];
    const obstacles = [...document.querySelectorAll('.scene-scenery g[data-obstacle-id]')].map(group => {
      const polygon = group.querySelector(':scope > polygon');
      return polygon ? polygon.getAttribute('points').trim().split(/\s+/).map(pair => {
        const [x, y] = pair.split(',').map(Number); return { x, y };
      }) : [];
    }).filter(polygon => polygon.length);
    await new Promise(resolve => {
      const started = performance.now();
      const sample = () => {
        const match = element.getAttribute('transform')?.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/);
        if (match) points.push({ x: Number(match[1]), y: Number(match[2]) });
        if (!element.isConnected || performance.now() - started > 5000) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return { points, obstacles };
  });
  await phase(windPage, 'idle');
  const homing = await snapshot(windPage);
  expect(windImpactKind).toBe('enemy');
  expect(homing.run.roundEffects.windHomingUsed).toBe(true);
  expect(homing.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  expect(trajectory.points.length).toBeGreaterThan(10);
  expect(trajectory.obstacles.length).toBeGreaterThan(0);
  for (const point of trajectory.points) {
    expect(trajectory.obstacles.some(polygon => insidePolygon(point, polygon))).toBe(false);
  }
  expect(browserErrors).toEqual([]);
});
