const { test, expect, installGame, shoot, selectRewards, snapshot, phase } = require('./support.cjs');

async function chooseStarter(page, name = '모험가맛 쿠키') {
  await page.getByRole('button', { name: new RegExp(`^${name} `) }).click();
  await phase(page, 'idle');
}
async function enterSelection(page) {
  await page.goto('/');
  await page.getByRole('button', { name: '모험 시작', exact: true }).click();
}

test('before Snow unlock only the first three cookies are selectable and slots use the unlocked pool', async ({ page }) => {
  await installGame(page, { initial: { round: 3 }, fastCombat: true, random: 0 });
  await enterSelection(page);
  for (const name of ['모험가맛', '연금술사맛', '마법사맛'])
    await expect(page.getByRole('button', { name: new RegExp(`^${name} 쿠키 `) })).toBeEnabled();
  for (const name of ['우유맛', '바람궁수'])
    await expect(page.getByRole('button', { name: new RegExp(`^${name} 쿠키 `) })).toBeDisabled();
  await chooseStarter(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await page.locator('.slot-machine').getByRole('button', { name: '돌리기' }).click();
  expect((await snapshot(page)).run.slotReward.stoneResults[0].prizeId).toBe('adventurer-candy');
  await page.locator('.reward-section').getByRole('button').first().click();
  await page.locator('.continue-button').click();
  await page.getByRole('button', { name: /스톤 슬롯 두 번/ }).click();
  await expect(page.locator('.continue-button')).toBeDisabled();
  const spin = page.locator('.slot-machine').getByRole('button', { name: '돌리기' });
  await spin.click();
  await spin.click();
  const result = (await snapshot(page)).run;
  expect(result.weapons.slice(-3).every(weapon => weapon.id === 'adventurer-candy')).toBe(true);
  expect(result.snowAreaCleared).toBe(false);
});

test('saved Snow unlock permits Milk and Wind and a Milk player can win Wind stone', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await installGame(page, { initial: { round: 3 }, fastCombat: true, random: .999 });
  await enterSelection(page);
  await expect(page.getByRole('button', { name: /^우유맛 쿠키 / })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^바람궁수 쿠키 / })).toBeEnabled();
  await chooseStarter(page, '우유맛 쿠키');
  expect((await snapshot(page)).run.snowAreaCleared).toBe(false);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await page.locator('.slot-machine').getByRole('button', { name: '돌리기' }).click();
  const result = (await snapshot(page)).run;
  expect(result.slotReward.stoneResults[0].prizeId).toBe('wind-candy');
  expect(result.weapons.at(-1).id).toBe('wind-candy');
});

test('first Snow boss clear persists the cookie unlock after reload', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', round: 3 }, fastCombat: true, random: .4 });
  await enterSelection(page);
  await chooseStarter(page);
  expect((await snapshot(page)).run.snowRewardsUnlocked).toBe(false);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  expect((await snapshot(page)).run.snowAreaCleared).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1'))))
    .toEqual({ version: 1, snowAreaCleared: true });
  await page.reload();
  await page.getByRole('button', { name: '모험 시작', exact: true }).click();
  await chooseStarter(page, '우유맛 쿠키');
  expect((await snapshot(page)).run.snowRewardsUnlocked).toBe(true);
  expect((await snapshot(page)).run.snowAreaCleared).toBe(false);
});
