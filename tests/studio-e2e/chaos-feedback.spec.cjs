const { test, expect, installGame, phase, dragPull, snapshot, stackShot } = require('../e2e/support.cjs');

test('actual administrator Chaos play shows its committed guard effect and keeps the real damage reduction', async ({ page }) => {
  await installGame(page, { random: .3, layoutSeed: 4927 });
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('chaos');
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await phase(page, 'idle');
  const before = await snapshot(page);
  await dragPull(page, await stackShot({ area: 'chaos', seed: 4927, enemies: before.run.enemies }));
  await page.mouse.up();
  await expect(page.getByTestId('obstacle-frost').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('chaos-obstacle-notice').first()).toContainText('50% 감소');
  await page.screenshot({ path: 'tmp/studio-chaos-feedback.png' });
  await phase(page, 'idle');
  const event = (await snapshot(page)).events.find(e => e.name === 'resolveProjectile').result;
  expect(event.obstacleEffects.some(e => e.kind === 'ice-guard')).toBe(true);
  expect(event.enemyAttack.damageReduction).toBe(.5);
});
