const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('the expanded roster can launch and activate a Cherry bomb with touch', async ({ page, context }) => {
  await page.addInitScript(() => { Math.random = () => .999; });
  await page.goto('/');
  await page.getByRole('button', { name: '모험 시작' }).tap();
  await expect(page.locator('.character-card')).toHaveCount(12);
  await expect(page.locator('.character-card:disabled')).toHaveCount(4);
  await page.getByRole('button', { name: /^체리맛 쿠키/ }).tap();
  const arena = page.getByRole('group', { name: '전투 맵' });
  await expect(arena.locator('.sling-loaded-candy [data-stone-id]')).toHaveAttribute('data-stone-id', 'cherry-bomb-stone');
  const bounds = await arena.boundingBox();
  const x = Math.round(bounds.x + bounds.width * .50);
  const y = Math.round(bounds.y + bounds.height * .57);
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (const delta of [58, 96]) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + delta }] });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const activate = page.getByRole('button', { name: '폭탄 설치' });
  await expect(activate).toBeVisible();
  await activate.tap();
  await expect(activate).toHaveCount(0);
  await expect(page.getByTestId('cherry-blast')).toHaveCount(1);
});
