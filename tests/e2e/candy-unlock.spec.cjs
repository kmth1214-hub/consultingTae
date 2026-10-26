const { test, expect, installGame, shoot, selectRewards, snapshot, phase } = require('./support.cjs');
const basics = ['adventurer-candy', 'alchemist-candy', 'wizard-orb'];

async function chooseStarter(page, name = '모험가맛 쿠키') {
  await page.getByRole('button', { name: new RegExp(`^${name} `) }).click();
  await phase(page, 'idle');
}
async function enterSelection(page) {
  await page.goto('/');
  await page.getByRole('button', { name: '모험 시작', exact: true }).click();
}
async function finishCamp(page) {
  await page.getByRole('button', { name: /새로운 마법사탕/ }).click();
  while (await page.getByRole('heading', { name: '같은 등급의 사탕을 발견했어요', exact: true }).isVisible())
    await page.getByRole('button', { name: '따로 보유', exact: true }).click();
  await expect(page.getByRole('heading', { name: '새로운 사탕을 얻었어요', exact: true })).toBeVisible();
}

test('before Snow unlock the three basic cookies remain playable and round plus camp only grant basic candies', async ({ page }) => {
  await installGame(page, { initial: { round: 3 }, fastCombat: true, random: .2 });
  await enterSelection(page);
  for (const name of ['모험가맛', '연금술사맛', '마법사맛'])
    await expect(page.getByRole('button', { name: new RegExp(`^${name} 쿠키 `) })).toBeEnabled();
  for (const name of ['우유맛', '바람궁수'])
    await expect(page.getByRole('button', { name: new RegExp(`^${name} 쿠키 `) })).toBeDisabled();
  await expect(page.getByText(/해금 전 보상은 기본 3종 사탕/)).toBeVisible();
  await chooseStarter(page);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  const trace = await snapshot(page);
  expect(trace.run.rewardChoices.weapons.map(w => w.id).sort()).toEqual(basics.slice().sort());
  await expect(page.locator('.reward-section').first().getByRole('button')).toHaveCount(3);
  await expect(page.locator('.reward-screen .muted')).toContainText('기본 3종');
  await page.screenshot({ path: 'tmp/candy-locked-rewards.png' });
  await selectRewards(page);
  await expect(page.getByText(/마법사탕 보상은 기본 3종에서/)).toBeVisible();
  await finishCamp(page);
  const result = (await snapshot(page)).lastEvent;
  expect(result.effect.weapons.every(w => basics.includes(w.weaponId))).toBe(true);
  expect((await snapshot(page)).run.snowAreaCleared).toBe(false);
});

test('a saved Snow unlock immediately enables special cookies and both round and camp special candy rewards', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await installGame(page, { initial: { round: 3 }, fastCombat: true, random: .2 });
  await enterSelection(page);
  await expect(page.getByRole('button', { name: /^우유맛 쿠키 / })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^바람궁수 쿠키 / })).toBeEnabled();
  await chooseStarter(page);
  expect((await snapshot(page)).run.snowAreaCleared).toBe(false);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  const ids = (await snapshot(page)).run.rewardChoices.weapons.map(w => w.id);
  expect(ids).toEqual(expect.arrayContaining(['milk-candy', 'wind-candy']));
  await expect(page.locator('.reward-section').first().getByRole('button', { name: /우유맛 마법사탕/ })).toBeVisible();
  await expect(page.locator('.reward-section').first().getByRole('button', { name: /바람궁수 마법사탕/ })).toBeVisible();
  await selectRewards(page);
  await expect(page.getByText('모든 종류의 마법사탕을 획득할 수 있어요.', { exact: true })).toBeVisible();
  await finishCamp(page);
  expect((await snapshot(page)).lastEvent.effect.weapons.some(w => w.weaponId === 'wind-candy')).toBe(true);
});

test('first Snow boss clear unlocks special candy on that reward screen and persists after reload', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', round: 3 }, fastCombat: true, random: .4 });
  await enterSelection(page); await chooseStarter(page);
  expect((await snapshot(page)).run.snowRewardsUnlocked).toBe(false);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  const result = (await snapshot(page)).run;
  expect(result.snowAreaCleared).toBe(true);
  expect(result.rewardChoices.weapons.map(w => w.id)).toEqual(expect.arrayContaining(['milk-candy', 'wind-candy']));
  await expect(page.locator('.reward-screen .muted')).toHaveText('우유맛·바람궁수 사탕도 보상 후보에 포함돼요.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1')))).toEqual({ version: 1, snowAreaCleared: true });
  await page.reload();
  await page.getByRole('button', { name: '모험 시작', exact: true }).click();
  await chooseStarter(page, '우유맛 쿠키');
  expect((await snapshot(page)).run.snowRewardsUnlocked).toBe(true);
  expect((await snapshot(page)).run.snowAreaCleared).toBe(false);
});
