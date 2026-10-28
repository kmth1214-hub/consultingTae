const { test, expect, installGame, start } = require('./support.cjs');

test('production direct links fail closed without mounting the development studio or game session', async ({ page }) => {
  for (const route of ['/__dev/maps', '/__dev/maps/']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeVisible();
    await expect(page.getByRole('link', { name: '게임으로 돌아가기' })).toHaveAttribute('href', '/');
    await expect(page.locator('[data-dev-tool="regional-map-studio-v1"]')).toHaveCount(0);
    await expect(page.locator('.battle-arena, .studio-controls')).toHaveCount(0);
    expect(await page.evaluate(() => window.__gameTest)).toBeUndefined();
  }
});

test('query and hash strings cannot enable the studio and the ordinary game home still loads', async ({ page }) => {
  await page.goto('/?admin=true&studio=true#/__dev/maps');
  await expect(page.locator('.app--home')).toBeVisible();
  await expect(page.locator('[data-dev-tool="regional-map-studio-v1"]')).toHaveCount(0);
  await expect(page.locator('.battle-arena')).toHaveCount(0);
  expect(await page.evaluate(() => window.__gameTest)).toBeUndefined();
});

for (const area of ['snow', 'city']) test(`ordinary ${area} battle keeps its original monster art`, async ({ page }) => {
  await installGame(page, { initial: { area, round: 3 } });
  await start(page);
  await expect(page.locator('.monster--boss .monster-art')).toBeVisible();
  await expect(page.locator('[data-monster-art]')).toHaveCount(0);
  await expect(page.getByTestId('boss-armor')).toHaveCount(1);
});
