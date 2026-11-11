const { test, expect, installGame, phase, dragPull } = require('../e2e/support.cjs');

async function enterStudio(page) {
  await installGame(page);
  await page.goto('/__dev/maps');
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await phase(page, 'idle');
  return page.locator('.battle-arena');
}

test('hold V shows the whole map during a studio drag without changing the shot', async ({ page }) => {
  const arena = await enterStudio(page);
  await dragPull(page, { angleDeg: 35, powerRatio: .45 });
  await expect(arena).toHaveAttribute('data-camera-mode', 'aim');
  const trajectory = await page.getByTestId('trajectory-preview').getAttribute('d');
  await page.keyboard.down('v');
  await expect(arena).toHaveAttribute('data-camera-mode', 'overview');
  await expect(page.getByTestId('trajectory-preview')).toHaveAttribute('d', trajectory);
  await page.keyboard.up('v');
  await expect(arena).toHaveAttribute('data-camera-mode', 'aim');
  await page.mouse.up();
  await expect(arena).toHaveAttribute('data-aim-phase', 'launching');
});
