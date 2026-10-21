const { test, expect, installGame, phase, ammo, hp, snapshot, start, grabMap, shoot, selectRewards } = require('./support.cjs');
const inventory = { fireball: 1, spear: 1, defense: 1, heal: 2 };

test('Heal button and key spend real inventory, restore HP and resolve an enemy turn; empty use changes nothing', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory } });
  await start(page);
  await page.getByRole('button', { name: '회복 사용', exact: true }).click();
  await expect(hp(page)).toHaveText('60');
  let trace = await snapshot(page);
  expect(trace.run.inventory.heal).toBe(1);
  expect(trace.lastEvent.effect.healed).toBe(25);
  expect(trace.lastEvent.enemyAttack.damage).toBe(5);
  expect(trace.run.playerHp).toBe(60);
  await page.keyboard.press('4');
  await expect(hp(page)).toHaveText('80');
  trace = await snapshot(page);
  expect(trace.run.inventory.heal).toBe(0);
  expect(trace.run.turnNumber).toBe(4);
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeDisabled();
  await page.keyboard.press('4');
  await expect(page.getByText('이 소모품을 모두 사용했어요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(trace.run);
  await expect(ammo(page)).toHaveText('9');
});

test('Defense blocks damage, Fireball arms/doubles the next shot, and both counts/visual effects follow the engine', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory }, enemyHp: 20 });
  await start(page);
  await page.keyboard.press('3');
  await expect(hp(page)).toHaveText('40');
  let trace = await snapshot(page);
  expect(trace.lastEvent.enemyAttack.blocked).toBe(true);
  expect(trace.run.inventory.defense).toBe(0);
  await expect(page.locator('.launcher')).toHaveClass(/has-shield/);
  await page.getByRole('button', { name: '불공 사용', exact: true }).click();
  await expect(hp(page)).toHaveText('35');
  trace = await snapshot(page);
  expect(trace.run.fireballArmed).toBe(true);
  expect(trace.run.inventory.fireball).toBe(0);
  await shoot(page);
  trace = await snapshot(page);
  expect(trace.lastEvent.damage).toBe(4);
  expect(trace.run.enemies[0].hp).toBe(16);
  expect(trace.run.fireballArmed).toBe(false);
  await expect(page.locator('.hit-effect--fireball')).toHaveText('−4');
});

test('Spear hits three real Snow enemies and Alchemist receives item-use points', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', playerHp: 60, inventory } });
  await start(page, '연금술사맛 쿠키');
  await page.keyboard.press('2');
  const trace = await snapshot(page);
  expect(trace.lastEvent.hits.map(hit => hit.damage)).toEqual([4, 3, 2]);
  expect(trace.run.inventory.spear).toBe(0);
  expect(trace.run.score).toBe(19);
  expect(trace.run.enemies.slice(0, 3).map(enemy => enemy.hp)).toEqual([0, 1, 2]);
  await expect(hp(page)).toHaveText(String(trace.run.playerHp));
  await expect(page.locator('.hit-effect--spear')).toHaveCount(2);
});

test('frozen and aiming item lockout cannot spend an item or a turn', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory }, stateOverride: { consumablesBlocked: true, consumablesBlockedTurns: 1 } });
  await start(page);
  const before = (await snapshot(page)).run;
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeDisabled();
  await page.keyboard.press('4');
  await expect(page.getByText('얼음 숨결 때문에 이번 턴에는 소모품을 쓸 수 없어요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(before);
  await shoot(page, { short: true, x: 500 });
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeEnabled();
  const after = (await snapshot(page)).run;
  await grabMap(page);
  await page.keyboard.press('4');
  await expect(page.getByText('조준을 마친 뒤 소모품을 사용하세요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(after);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

for (const merge of [false, true]) {
  test(`reward gating and explicit fusion ${merge ? 'confirmation' : 'decline'} preserve engine progression`, async ({ page }) => {
    await installGame(page, { allWeapons: true, fastCombat: true });
    await start(page);
    await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
    const before = (await snapshot(page)).run;
    await expect(page.locator('.continue-button')).toBeDisabled();
    await page.locator('.reward-section').nth(0).getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: '같은 등급의 사탕을 발견했어요', exact: true })).toBeVisible();
    expect((await snapshot(page)).run.weapons).toEqual(before.weapons);
    await expect(page.locator('.continue-button')).toBeDisabled();
    await page.getByRole('button', { name: merge ? /등급으로 합성/ : '따로 보유', exact: !merge }).click();
    let trace = await snapshot(page);
    expect(trace.run.weapons.length).toBe(before.weapons.length + (merge ? 0 : 1));
    expect(trace.run.weapons.some(weapon => weapon.grade === 'B')).toBe(merge);
    await expect(page.locator('.continue-button')).toBeDisabled();
    await page.locator('.reward-section').nth(1).getByRole('button').first().click();
    await page.locator('.continue-button').click();
    await phase(page, 'idle');
    await expect(page.getByRole('heading', { name: '숲 지역 2 / 5', exact: true })).toBeVisible();
    await expect(ammo(page)).toHaveText('9');
  });
}

test('Forest boss rewards lead to camp; healing continues to Snow with refreshed ammo', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 5, playerHp: 30 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  await selectRewards(page);
  await expect(page.getByRole('heading', { name: '잠깐, 모닥불 곁에서', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /따뜻한 휴식/ }).click();
  await phase(page, 'idle');
  const { run } = await snapshot(page);
  expect(run.area).toBe('snow');
  expect(run.round).toBe(1);
  expect(run.playerHp).toBe(90);
  await expect(hp(page)).toHaveText('90');
  await expect(ammo(page)).toHaveText('9');
});

test('camp weapon rewards can finish two consecutive fusion decisions without switching rewards', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 5 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  await selectRewards(page);
  await page.getByRole('button', { name: /새로운 마법사탕/ }).click();
  await expect(page.getByRole('heading', { name: '같은 등급의 사탕을 발견했어요', exact: true })).toBeVisible();
  const pending = (await snapshot(page)).run.pendingCampReward;
  expect(pending.items).toHaveLength(2);
  await expect(page.getByRole('button', { name: /따뜻한 휴식/ })).toBeDisabled();
  await page.getByRole('button', { name: '따로 보유', exact: true }).click();
  await expect(page.getByRole('heading', { name: '같은 등급의 사탕을 발견했어요', exact: true })).toBeVisible();
  expect((await snapshot(page)).run.pendingCampReward.items).toEqual(pending.items);
  await page.getByRole('button', { name: /등급으로 합성/ }).click();
  await phase(page, 'idle');
  expect((await snapshot(page)).run.area).toBe('snow');
});

test('Snow boss unlock persists immediately across refresh without restoring the active run', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', round: 5 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  expect((await snapshot(page)).run.snowAreaCleared).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1')))).toEqual({ version: 1, snowAreaCleared: true });
  await page.reload();
  await expect(page.getByRole('button', { name: '모험 시작' })).toBeVisible();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await expect(page.getByRole('button', { name: /^우유맛 쿠키/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^바람궁수 쿠키/ })).toBeEnabled();
});

test('City clear offers optional Chaos; three rounds bypass rewards and display independent bonus/main scores', async ({ page }) => {
  await installGame(page, { initial: { area: 'city', round: 5, playerHp: 80, inventory }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 한 발을 위한 선물' });
  await selectRewards(page);
  await expect(page.getByRole('heading', { name: '오븐 밖, 끝까지!', exact: true })).toBeVisible();
  const main = (await snapshot(page)).run.mainRunSummary;
  await page.getByRole('button', { name: '혼돈 지역 도전 →', exact: true }).click();
  await phase(page, 'idle');
  await page.keyboard.press('4');
  const rewardCalls = (await snapshot(page)).events.filter(event => event.name === 'drawRewardChoices').length;
  for (let round = 1; round <= 3; round++) {
    await expect(page.getByRole('heading', { name: `혼돈 지역 ${round} / 3`, exact: true })).toBeVisible();
    await shoot(page, { short: true, finalHeading: round === 3 ? '혼돈까지 정복!' : undefined });
  }
  const trace = await snapshot(page);
  expect(trace.run.terminal).toBe('bonus-clear');
  expect(trace.events.filter(event => event.name === 'drawRewardChoices')).toHaveLength(rewardCalls);
  expect(trace.run.mainRunSummary.finalScore).toBe(main.finalScore);
  expect(trace.run.bonusScore).toBeGreaterThan(0);
  await expect(page.locator('.result-stats > div').filter({ has: page.getByText('본편 최종 점수', { exact: true }) }).locator('dd')).toHaveText(main.finalScore.toLocaleString());
  await expect(page.locator('.result-stats > div').filter({ has: page.getByText('보너스 점수', { exact: true }) }).locator('dd')).toHaveText(trace.run.bonusScore.toLocaleString());
  await expect(page.getByRole('button', { name: /QR|추가 보상|혼돈 지역 도전/ })).toHaveCount(0);
});
