const { test, expect, installGame, start } = require('./support.cjs');

test('battle music controls persist mute and volume across visits', async ({ page }) => {
  await installGame(page);
  await start(page);
  const mute = page.getByRole('button', { name: 'BGM 음소거' });
  const slider = page.getByRole('slider', { name: 'BGM 음량' });
  await expect(mute).toBeVisible();
  await expect(slider).toHaveValue('35');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('36');
  await mute.click();
  await expect(page.getByRole('button', { name: 'BGM 켜기' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cookie-expedition-bgm-v1'))))
    .toEqual({ volume: .36, muted: true });
  await page.reload();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
  await expect(page.getByRole('slider', { name: 'BGM 음량' })).toHaveValue('36');
  await expect(page.getByRole('button', { name: 'BGM 켜기' })).toHaveAttribute('aria-pressed', 'true');
});

for (const [area, label] of [['forest', '숲'], ['snow', '눈'], ['city', '도시'], ['chaos', '혼돈']]) {
  test(`${label} boss round keeps music controls and game playable`, async ({ page }) => {
    await installGame(page, { initial: { area, round: 3 } });
    await start(page);
    await expect(page.getByRole('heading', { name: new RegExp(`${label} 지역.*3 / 3`) })).toBeVisible();
    await expect(page.getByRole('slider', { name: 'BGM 음량' })).toBeVisible();
    await expect(page.getByRole('group', { name: '전투 맵', exact: true })).toHaveAttribute('data-aim-phase', 'idle');
  });
}

test('small-screen battle keeps music controls inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installGame(page);
  await start(page);
  const control = page.locator('.battle-bgm-controls');
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('slider', { name: 'BGM 음량' })).toBeVisible();
  await expect(page.getByRole('button', { name: '전체화면 전환' })).toBeVisible();
});
