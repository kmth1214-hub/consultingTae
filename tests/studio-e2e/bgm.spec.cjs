const { test, expect } = require('../e2e/support.cjs');

test('studio test play exposes the same music settings for every region and boss', async ({ page }) => {
  await page.goto('/__dev/maps');
  for (const area of ['forest', 'snow', 'city', 'chaos']) {
    await page.getByLabel('지역 선택').selectOption(area);
    await page.getByLabel('테스트 라운드').selectOption('3');
    await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
    await expect(page.locator('[data-dev-tool="studio-battle-play"]')).toBeVisible();
    await expect(page.getByRole('slider', { name: 'BGM 음량' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'BGM 음소거' })).toBeVisible();
    await page.getByRole('button', { name: '지도 검토로 돌아가기' }).click();
  }
});
