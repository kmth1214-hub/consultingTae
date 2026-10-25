const { test, expect, installGame, start, phase, dragPull, snapshot } = require('./support.cjs');
const card = page => page.getByRole('complementary', { name: '장전된 마법사탕' });

test('current and known next candy match the real queue, with owned abilities and Fireball stated separately', async ({ page }) => {
  await installGame(page, { allWeapons: true, enemyHp: 20, initial: { inventory: { fireball: 1 } } });
  await start(page);
  const initial = (await snapshot(page)).run;
  const weapon = id => initial.weapons.find(w => w.instanceId === id);
  await expect(card(page).locator('h2')).toHaveText(weapon(initial.currentWeaponId).name);
  await expect(card(page).locator('.candy-damage')).toContainText('0–4');
  await expect(card(page).locator('.next-candy')).toContainText(weapon(initial.weaponQueue[1]).name);
  await card(page).locator('summary').click();
  await expect(card(page).locator('.owned-passives li')).toHaveCount(5);
  await expect(card(page)).toContainText('보유한 사탕의 능력이 함께 적용돼요.');
  await page.screenshot({ path: 'tmp/candy-details-expanded.png' });
  await page.keyboard.press('1'); await phase(page, 'idle');
  await expect(card(page).locator('.candy-buffs')).toContainText('×2 (0–8');
  await dragPull(page, { powerRatio: .08 }); await page.mouse.up(); await phase(page, 'launching');
  await expect(card(page)).toHaveCount(0);
  await phase(page, 'idle');
  const after = (await snapshot(page)).run;
  await expect(card(page).locator('h2')).toHaveText(after.weapons.find(w => w.instanceId === after.currentWeaponId).name);
  await expect(card(page).locator('.candy-buffs')).toHaveCount(0);
});

test('phone candy details disclose all passives without overflow and unknown next stays honest', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page, { stateOverride: { zeroRollsThisRound: 2, fireballArmed: true, pendingAimInversion: true } });
  await start(page);
  await expect(card(page).locator('.candy-damage')).toContainText('1–4');
  await expect(card(page).locator('.next-candy')).toContainText('다음 사탕 미정');
  await expect(card(page).locator('.candy-status-chips')).toContainText('불공 ×2');
  await card(page).locator('summary').click();
  await expect(card(page).locator('.candy-buffs')).toContainText('×2 (2–8');
  await expect(card(page).locator('.candy-buffs')).toContainText('조작 반전');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const box = await card(page).boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'tmp/candy-details-mobile.png' });
});
