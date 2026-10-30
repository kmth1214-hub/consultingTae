const { test, expect, installGame, start, arena, dragPull, snapshot } = require('./support.cjs');

test('the loaded stone identity is shared by HUD, sling pouch and flight', async ({ page }) => {
  await installGame(page);
  await start(page);
  const run = (await snapshot(page)).run;
  const loaded = run.weapons.find(weapon => weapon.instanceId === run.weaponQueue[0]);
  await expect(page.getByRole('complementary', { name: '장전된 스톤' })).toHaveAttribute('data-current-stone', loaded.id);
  await expect(page.getByTestId('loaded-candy').locator('[data-stone-id]')).toHaveAttribute('data-stone-id', loaded.id);
  await expect(page.getByRole('complementary', { name: '장전된 스톤' })).toContainText('남은 발사 3 / 3');
  await dragPull(page, { powerRatio: .6 });
  await page.mouse.up();
  await expect(arena(page).getByTestId('projectile')).toHaveAttribute('data-stone-id', loaded.id);
});

test('basic stone HUD is readable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 800 });
  const basic = { id: 'basic-stone', name: '기본 스톤', grade: 'C', effect: '공통 피해' };
  await installGame(page, { initial: { weapons: [basic, basic, basic] } });
  await start(page);
  const hud = page.getByRole('complementary', { name: '장전된 스톤' });
  await expect(hud).toContainText('기본 스톤');
  await expect(hud).toContainText('공통 피해');
  await expect(hud).toHaveAttribute('data-current-stone', 'basic-stone');
  const bounds = await hud.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(430);
});
