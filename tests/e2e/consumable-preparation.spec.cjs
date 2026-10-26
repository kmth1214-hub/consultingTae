const { test, expect, installGame, start, phase, snapshot, hp, dragPull, shoot, selectRewards } = require('./support.cjs');
const { aimedShot } = require('./spear-support.cjs');

for (const mobile of [false, true]) test(`${mobile ? 'phone reduced motion' : 'desktop'} preparation is safe, shared across items, and survives cancelled aim`, async ({ page }) => {
  if (mobile) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  await installGame(page, { initial: { playerHp: 40, inventory: { heal: 2, defense: 1, fireball: 1, spear: 1 } } });
  await start(page);
  await page.getByRole('button', { name: '회복 사용', exact: true }).click();
  await expect(hp(page)).toHaveText('65');
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await expect(page.locator('.item-lockout')).toHaveText('사용 완료 · 사탕 발사 후 다시 사용');
  const prepared = (await snapshot(page)).run;
  expect(prepared.turnNumber).toBe(0);
  expect(prepared.ammo).toBe(9);
  expect(prepared.consumableUsedSinceShot).toBe(true);
  for (const name of ['불공', '창', '방어', '회복'])
    await expect(page.getByRole('button', { name: `${name} 사용`, exact: true })).toBeDisabled();
  await page.keyboard.press('3');
  await expect(page.getByText('이번 발사 전에 소모품을 이미 사용했어요. 사탕을 발사하면 다시 사용할 수 있어요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(prepared);
  await dragPull(page, { powerRatio: .08 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await phase(page, 'idle');
  expect((await snapshot(page)).run).toEqual(prepared);
  await page.screenshot({ path: `tmp/preparation-${mobile ? 'mobile' : 'desktop'}.png` });
  await shoot(page, { short: true });
  await expect(hp(page)).toHaveText('60');
  await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeEnabled();
  await page.keyboard.press('3');
  const shield = (await snapshot(page)).run;
  expect(shield.defenseArmed).toBe(true);
  expect(shield.playerHp).toBe(60);
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await dragPull(page, { powerRatio: .08 }); await page.mouse.up();
  await phase(page, 'reviewing');
  await expect(page.getByTestId('player-shield')).toBeVisible();
  await phase(page, 'idle');
  const protectedShot = await snapshot(page);
  expect(protectedShot.lastEvent.enemyAttack.blockedBy).toBe('defense');
  expect(protectedShot.run.defenseArmed).toBe(false);
  await expect(hp(page)).toHaveText('60');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile ? 390 : 1440);
});

test('a prepared Spear requires a real hit to clear the round and the next round starts with a new preparation slot', async ({ page }) => {
  await installGame(page, { initial: { inventory: { spear: 1, heal: 1 } } });
  await start(page);
  await page.keyboard.press('2');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(4);
  await shoot(page, { ...await aimedShot(), finalHeading: '다음 한 발을 위한 선물' });
  await expect(page.getByRole('heading', { name: '다음 한 발을 위한 선물', exact: true })).toBeVisible();
  const cleared = await snapshot(page);
  expect(cleared.events.find(event => event.name === 'useConsumable').result.enemyAttack).toBeNull();
  expect(cleared.run.consumableUsedSinceShot).toBe(false);
  expect(cleared.run.turnNumber).toBe(1);
  await selectRewards(page);
  await phase(page, 'idle');
  expect((await snapshot(page)).run.consumableUsedSinceShot).toBe(false);
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeEnabled();
});
