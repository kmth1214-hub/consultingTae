const { test, expect, installGame, start, shoot, snapshot } = require('./support.cjs');

test('the lever pulls, three reels stop from left to right, and the reward appears last', async ({ page }) => {
  await installGame(page, { random: 0, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  const slot = page.locator('.slot-machine').first();
  const lever = slot.getByRole('button', { name: '돌리기' });
  const before = (await snapshot(page)).run.weapons.length;
  await lever.click();
  await expect(slot).toHaveAttribute('data-spin-phase', 'pull');
  await expect(lever).toBeDisabled();
  await expect(slot.locator('.slot-machine__result')).toHaveCount(0);
  await expect(page.locator('.continue-button')).toBeDisabled();
  expect((await snapshot(page)).run.weapons).toHaveLength(before + 1);
  await expect(slot).toHaveAttribute('data-spin-phase', 'rolling');
  await expect(slot.locator('[data-reel-state="rolling"]')).toHaveCount(3);
  await expect(slot).toHaveAttribute('data-stopped-reels', '1');
  await expect(slot.locator('[data-reel-state="rolling"]')).toHaveCount(2);
  await expect(slot).toHaveAttribute('data-stopped-reels', '2');
  await expect(slot.locator('[data-reel-state="rolling"]')).toHaveCount(1);
  await expect(slot).toHaveAttribute('data-spin-phase', 'idle');
  await expect(slot.locator('.slot-machine__result')).toHaveCount(1);
  const result = (await snapshot(page)).run.slotReward.stoneResults[0];
  const columns = await slot.locator('.slot-machine__reel').evaluateAll(reels => reels.map(reel =>
    [...reel.querySelectorAll('.slot-machine__cell')].map(cell => cell.title)));
  expect(columns).toEqual([0, 1, 2].map(column => [0, 1, 2].map(row =>
    ({ star: '별', leaf: '잎', moon: '달', crown: '왕관' })[result.symbols[row * 3 + column]])));
  expect((await snapshot(page)).events.filter(event => event.name === 'spinRewardSlot')).toHaveLength(1);
});

test('reduced motion shows the result immediately and the 320px layout stays within the page', async ({ page }) => {
  await installGame(page, { fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const slot = page.locator('.slot-machine');
  await slot.getByRole('button', { name: '돌리기' }).click();
  await expect(slot).toHaveAttribute('data-spin-phase', 'idle');
  await expect(slot.locator('.slot-machine__result')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('chaos locks the other lever until the first reel finishes', async ({ page }) => {
  await installGame(page, { initial: { area: 'chaos', round: 1 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  const stone = page.locator('.slot-machine').first();
  const consumable = page.locator('.slot-machine').nth(1);
  const consumableLever = consumable.getByRole('button', { name: '돌리기' });
  await stone.getByRole('button', { name: '돌리기' }).click();
  await expect(consumableLever).toBeDisabled();
  await expect(stone).toHaveAttribute('data-spin-phase', 'idle');
  await expect(consumableLever).toBeEnabled();
  await consumableLever.click();
  await expect(page.locator('.continue-button')).toBeDisabled();
  await expect(consumable).toHaveAttribute('data-spin-phase', 'idle');
  await expect(page.locator('.continue-button')).toBeEnabled();
});
