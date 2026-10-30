const { test, expect, installGame, start, dragPull, phase, arena, snapshot } = require('./support.cjs');

test('Q arms one visible homing flight, hides only its aim preview, then enters cooldown', async ({ page }) => {
  const wind = { id: 'wind-candy', name: '바람궁수의 사탕', grade: 'C' };
  await installGame(page, { initial: { weapons: [wind, wind, wind] }, layoutSeed: 4927 });
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1',
    JSON.stringify({ version: 1, snowAreaCleared: true })));
  await start(page, '바람궁수 쿠키');
  await expect(page.getByTestId('wind-skill-status')).toContainText('Q 자동 유도 사용 가능');
  await page.keyboard.press('q');
  await expect(page.getByTestId('wind-skill-status')).toContainText('Q 자동 유도 준비');
  await dragPull(page, { angleDeg: 0, powerRatio: 1 });
  await expect(page.getByTestId('trajectory-preview')).toHaveCount(0);
  await expect(page.locator('.monster.is-targeted')).toHaveCount(1);
  await page.mouse.up();
  await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'enemy');
  await expect.poll(async () => (await snapshot(page)).events.filter(event => event.name === 'resolveProjectile').length).toBe(1);
  const trace=await snapshot(page);
  expect(trace.lastEvent.windMode).toBe('homing');
  expect(trace.run.windCooldownShots).toBe(3);
  expect(trace.run.windArmedMode).toBe(null);
});
