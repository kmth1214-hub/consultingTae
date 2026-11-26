const { test, expect, installGame, start, dragPull, phase, snapshot } = require('./support.cjs');

for (const phone of [false, true]) test(`stone rack supports ${phone ? 'phone' : 'keyboard'} loading without spending ammo`, async ({ page }) => {
  if (phone) await page.setViewportSize({ width: 390, height: 844 });
  await installGame(page); await start(page);
  const rack = page.getByRole('complementary', { name: '스톤 보관함' });
  const buttons = rack.locator('[data-stone-instance]');
  await expect(buttons).toHaveCount(3);
  const id = await buttons.nth(2).getAttribute('data-stone-instance');
  if (phone) {
    await buttons.nth(2).click();
    await rack.getByRole('button', { name: '장전', exact: true }).click();
  } else {
    await page.keyboard.press('d'); await page.keyboard.press('d'); await page.keyboard.press('Space');
  }
  expect((await snapshot(page)).run.currentWeaponId).toBe(id);
  expect((await snapshot(page)).run.ammo).toBe(3);
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await phase(page, 'idle');
  const after = (await snapshot(page)).run;
  expect(after.ammo).toBe(2);
  expect(after.weaponQueue).not.toContain(id);
  await expect(buttons.nth(2)).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(phone ? 390 : 1440);
});

test('Space loads a rack stone at rest and activates Wizard split only after launch', async ({ page }) => {
  await installGame(page,{initial:{inventory:{}}});await start(page,'마법사맛 쿠키');
  await page.keyboard.press('d');await page.keyboard.press('Space');
  expect((await snapshot(page)).run.ammo).toBe(3);
  await page.keyboard.press('a');await page.keyboard.press('Space');
  const before=(await snapshot(page)).run;
  expect(before.weapons.find(stone=>stone.instanceId===before.currentWeaponId).id).toBe('wizard-orb');
  await dragPull(page,{angleDeg:80,powerRatio:1});await page.mouse.up();
  await phase(page,'launching');await page.keyboard.press('Space');
  await expect(page.getByTestId('wizard-child-orb')).toHaveCount(2);
  await phase(page,'idle');
  const after=await snapshot(page);
  expect(after.lastShotMeta.abilityActivation.source).toBe('space');
  expect(after.run.ammo).toBe(2);
});
