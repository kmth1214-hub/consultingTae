const { test, expect, installGame, arena, phase, ammo, hp, snapshot, start, grabMap, charge, target, shoot } = require('./support.cjs');

test('production landing and character selection start the real default engine state without prototype navigation', async ({ page }) => {
  await installGame(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('오븐 밖으로');
  await expect(page.getByRole('button', { name: /로그인|리더보드|관리자|QR/ })).toHaveCount(0);
  await page.getByRole('button', { name: '모험 시작' }).click();
  await expect(page.getByRole('button', { name: /^우유맛 쿠키/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^바람궁수 쿠키/ })).toBeDisabled();
  await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
  await phase(page, 'idle');
  await expect(hp(page)).toHaveText('100');
  await expect(ammo(page)).toHaveText('9');
  const { run } = await snapshot(page);
  expect(run.area).toBe('forest');
  expect(run.round).toBe(1);
  expect(Object.values(run.inventory).reduce((a, b) => a + b, 0)).toBe(1);
  expect(run.weapons[0].id).toBe('adventurer-candy');
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/@vite/client')))).toBe(false);
  const bundleTexts = await page.locator('script[src]').evaluateAll(async nodes => Promise.all(nodes.map(node => fetch(node.src).then(response => response.text()))));
  expect(bundleTexts.join('')).not.toContain('__gameTest');
});

test('map drag previews a live 30% arc before Space, then real hit and miss update engine and HUD exactly once', async ({ page }) => {
  await installGame(page);
  await start(page);
  const initial = await grabMap(page);
  await page.mouse.move(initial.x, initial.y - 16);
  await expect(page.getByTestId('trajectory-preview')).toBeVisible();
  const first = await page.getByTestId('trajectory-preview').getAttribute('d');
  await page.mouse.move(initial.x, initial.y - 32);
  await expect(page.getByTestId('trajectory-preview')).not.toHaveAttribute('d', first);
  // Cancel the exploratory aim and use a fresh default-angle shot.
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await shoot(page);
  await expect(ammo(page)).toHaveText('8');
  await expect(hp(page)).toHaveText('95');
  let trace = await snapshot(page);
  expect(trace.run.ammo).toBe(8);
  expect(trace.lastEvent.hits[0].damage).toBe(2);
  expect(trace.run.enemies[0].hp).toBe(2);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(1);
  await shoot(page, { short: true, x: 500 });
  await expect(ammo(page)).toHaveText('7');
  await expect(hp(page)).toHaveText('90');
  trace = await snapshot(page);
  expect(trace.lastEvent.missed).toBe(true);
  expect(trace.run.enemies[0].hp).toBe(2);
  expect(trace.events.filter(event => event.name === 'resolveProjectile')).toHaveLength(2);
});

test('last-ammo miss enters defeat, excludes bonus entry, and retry creates a fresh normal run', async ({ page }) => {
  await installGame(page, { initial: { ammo: 1, playerHp: 30 } });
  await start(page);
  await shoot(page, { short: true, x: 500, finalHeading: '다음엔 조금 더 멀리' });
  await expect(page.getByRole('button', { name: '혼돈 지역 도전 →' })).toHaveCount(0);
  expect((await snapshot(page)).run.terminal).toBe('defeat');
  await page.getByRole('button', { name: '새 원정 시작' }).click();
  await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('9');
  await expect(hp(page)).toHaveText('100');
});
