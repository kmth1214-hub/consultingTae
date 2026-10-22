const { test, expect, installGame, arena, phase, snapshot, start, dragPull } = require('./support.cjs');

test('grounded candy rolls along the sampled path, then resolves the miss one time', async ({ page }) => {
  await installGame(page); await start(page);
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
