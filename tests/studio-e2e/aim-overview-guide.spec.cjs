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

test('last shot guide appears only on the next studio aim and clears on restart', async ({ page }) => {
  test.setTimeout(60000);
  const arena = await enterStudio(page);
  await dragPull(page, { angleDeg: -5, powerRatio: .12 });
  await page.mouse.up();
  await phase(page, 'idle');
  await expect(page.getByTestId('last-shot-guide')).toHaveCount(0);
  await dragPull(page, { angleDeg: 25, powerRatio: .3 });
  await expect(page.getByTestId('last-shot-guide')).toBeAttached();
  await expect(page.getByTestId('last-shot-impact')).toBeAttached();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await phase(page, 'idle');
  await dragPull(page, { angleDeg: 25, powerRatio: .3 });
  await expect(page.getByTestId('last-shot-guide')).toHaveCount(0);
  await page.keyboard.press('Escape');
});
