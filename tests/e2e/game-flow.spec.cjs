const { test, expect, installGame, phase, ammo, hp, snapshot, start, grabMap, shoot, selectRewards } = require('./support.cjs');
const inventory = { fireball: 1, spear: 1, defense: 1, heal: 2 };
const { aimedShot } = require('./spear-support.cjs');

test('Heal gives its full benefit without retaliation and the next shot reopens preparation; empty use changes nothing', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory } });
  await start(page);
  await page.getByRole('button', { name: '회복 사용', exact: true }).click();
  await expect(hp(page)).toHaveText('65');
  let trace = await snapshot(page);
  expect(trace.run.inventory.heal).toBe(1);
  expect(trace.lastEvent.effect.healed).toBe(25);
  expect(trace.lastEvent.enemyAttack).toBeNull();
  expect(trace.run.playerHp).toBe(65);
  expect(trace.run.turnNumber).toBe(0);
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await phase(page, 'idle');
  await shoot(page, { short: true });
  await expect(hp(page)).toHaveText('60');
  await page.keyboard.press('4');
  await expect(hp(page)).toHaveText('85');
  trace = await snapshot(page);
  expect(trace.run.inventory.heal).toBe(0);
  expect(trace.run.turnNumber).toBe(2);
  await phase(page, 'idle');
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeDisabled();
  await page.keyboard.press('4');
  await expect(page.getByText('이 소모품을 모두 사용했어요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(trace.run);
  await expect(ammo(page)).toHaveText('2');
});

test('Defense blocks damage, Fireball arms/doubles the next shot, and both counts/visual effects follow the engine', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory }, enemyHp: 20 });
  await start(page);
  await page.keyboard.press('3');
  await expect(hp(page)).toHaveText('40');
  let trace = await snapshot(page);
  expect(trace.lastEvent.enemyAttack).toBeNull();
  expect(trace.run.defenseArmed).toBe(true);
  expect(trace.run.inventory.defense).toBe(0);
  await expect(page.getByTestId('player-shield')).toBeVisible();
  await expect(page.getByRole('button', { name: '불공 사용', exact: true })).toBeDisabled();
  await shoot(page, { short: true });
  expect((await snapshot(page)).lastEvent.enemyAttack.blocked).toBe(true);
  await page.getByRole('button', { name: '불공 사용', exact: true }).click();
  await expect(hp(page)).toHaveText('40');
  trace = await snapshot(page);
  expect(trace.run.fireballArmed).toBe(true);
  expect(trace.run.inventory.fireball).toBe(0);
  await shoot(page, await aimedShot({ piercing: false }));
  await expect(hp(page)).toHaveText('35');
  trace = await snapshot(page);
  expect(trace.lastEvent.damage).toBe(4);
  expect(trace.run.enemies[0].hp).toBe(16);
  expect(trace.run.fireballArmed).toBe(false);
  await expect(page.locator('.hit-effect--fireball')).toHaveText('−4');
});

test('Spear prepares safely, then only its actual Snow path targets take damage without cookie score bonus', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', playerHp: 60, inventory } });
  await start(page, '연금술사맛 쿠키');
  const before = (await snapshot(page)).run.enemies;
  await page.keyboard.press('2');
  expect((await snapshot(page)).run.enemies).toEqual(before);
  expect((await snapshot(page)).run.score).toBe(0);
  const aimed = await aimedShot({ area: 'snow' });
  await shoot(page, aimed);
  const trace = await snapshot(page);
  expect(trace.lastEvent.hits.map(hit => hit.id)).toEqual(aimed.shot.hitIds);
  expect(trace.lastEvent.hits.map(hit => hit.damage)).toEqual(aimed.shot.hitIds.map((_, i) => 4 - i));
  expect(trace.run.inventory.spear).toBe(0);
  expect(trace.run.score).toBe(trace.lastEvent.hits.reduce((sum, hit) => sum + hit.damage, 0));
  expect(trace.run.enemies.filter(enemy => !aimed.shot.hitIds.includes(enemy.id)).map(enemy => enemy.hp)).toEqual(before.filter(enemy => !aimed.shot.hitIds.includes(enemy.id)).map(enemy => enemy.hp));
  await expect(hp(page)).toHaveText(String(trace.run.playerHp));
  await expect(page.locator('.hit-effect--spear')).toHaveCount(trace.lastEvent.hits.filter(hit => !hit.defeated).length);
});

test('frozen and aiming item lockout cannot spend an item or a turn', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 40, inventory }, stateOverride: { consumablesBlocked: true, consumablesBlockedTurns: 1 } });
  await start(page);
  const before = (await snapshot(page)).run;
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeDisabled();
  await page.keyboard.press('4');
  await expect(page.getByText('얼음 숨결 때문에 이번 턴에는 소모품을 쓸 수 없어요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(before);
  await shoot(page, { short: true });
  await expect(page.getByRole('button', { name: '회복 사용', exact: true })).toBeEnabled();
  const after = (await snapshot(page)).run;
  await grabMap(page);
  await page.keyboard.press('4');
  await expect(page.getByText('조준을 마친 뒤 소모품을 사용하세요.', { exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(after);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

test('round reward requires one stone slot spin and a consumable choice, then adds one C stone', async ({ page }) => {
  await installGame(page, { fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  const before = (await snapshot(page)).run;
  await expect(page.locator('.reward-screen .eyebrow')).toContainText('1 / 3');
  await expect(page.locator('.continue-button')).toBeDisabled();
  await page.locator('.slot-machine').first().getByRole('button', { name: '돌리기' }).click();
  const afterSpin = (await snapshot(page)).run;
  expect(afterSpin.weapons).toHaveLength(before.weapons.length + 1);
  expect(afterSpin.weapons.at(-1).grade).toBe('C');
  await expect(page.locator('.continue-button')).toBeDisabled();
  await page.locator('.reward-section').getByRole('button').first().click();
  await page.locator('.continue-button').click();
  await phase(page, 'idle');
  const next = (await snapshot(page)).run;
  expect(next.round).toBe(2);
  expect(next.maxAmmo).toBe(before.maxAmmo + 1);
  expect(next.ammo).toBe(next.maxAmmo);
  await expect(ammo(page)).toHaveText(String(next.maxAmmo));
});

test('Forest boss rewards lead to camp; healing continues to Snow with refreshed ammo', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 3, playerHp: 30 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await expect(page.locator('.reward-screen .eyebrow')).toContainText('3 / 3');
  await expect(page.locator('.continue-button')).toHaveText('야영지로 이동');
  await selectRewards(page);
  await expect(page.getByRole('heading', { name: '잠깐, 모닥불 곁에서', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /따뜻한 휴식/ }).click();
  await phase(page, 'idle');
  const { run } = await snapshot(page);
  expect(run.area).toBe('snow');
  expect(run.round).toBe(1);
  expect(run.playerHp).toBe(90);
  await expect(hp(page)).toHaveText('90');
  expect(run.maxAmmo).toBe(run.weapons.length);
  expect(run.ammo).toBe(run.maxAmmo);
  await expect(ammo(page)).toHaveText(String(run.maxAmmo));
});

test('camp stone option requires two spins and carries both stones into Snow', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 3 }, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await selectRewards(page);
  const before = (await snapshot(page)).run.weapons.length;
  await page.getByRole('button', { name: /스톤 슬롯 두 번/ }).click();
  await expect(page.getByRole('heading', { name: '스톤 슬롯 두 번' })).toBeVisible();
  const spin = page.locator('.slot-machine').getByRole('button', { name: '돌리기' });
  await expect(page.locator('.continue-button')).toBeDisabled();
  await spin.click();
  await expect(page.locator('.continue-button')).toBeDisabled();
  await spin.click();
  const granted = (await snapshot(page)).run.weapons;
  expect(granted).toHaveLength(before + 2);
  expect(granted.slice(-2).every(weapon => weapon.grade === 'C')).toBe(true);
  await page.getByRole('button', { name: '다음 지역으로 →', exact: true }).click();
  await phase(page, 'idle');
  expect((await snapshot(page)).run.area).toBe('snow');
  expect((await snapshot(page)).run.weapons).toEqual(granted);
  const { run } = await snapshot(page);
  expect(run.maxAmmo).toBe(granted.length);
  await expect(ammo(page)).toHaveText(String(run.maxAmmo));
});

test('two-spin camp result fits a phone and waits for both spins', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page, { random: 0, initial: { area: 'forest', round: 3 }, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await selectRewards(page);
  await page.getByRole('button', { name: /스톤 슬롯 두 번/ }).click();
  await expect(page.locator('.continue-button')).toBeDisabled();
  const spin = page.locator('.slot-machine').getByRole('button', { name: '돌리기' });
  await spin.click();
  await expect(page.locator('.continue-button')).toBeDisabled();
  await spin.click();
  await expect(page.locator('.slot-machine__result')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: '다음 지역으로 →', exact: true }).click();
  await phase(page, 'idle');
  expect((await snapshot(page)).run.area).toBe('snow');
});

test('Snow boss unlock persists immediately across refresh without restoring the active run', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', round: 3 }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  expect((await snapshot(page)).run.snowAreaCleared).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1')))).toEqual({ version: 1, snowAreaCleared: true });
  await page.reload();
  await expect(page.getByRole('button', { name: '모험 시작' })).toBeVisible();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await expect(page.getByRole('button', { name: /^우유맛 쿠키/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^바람궁수 쿠키/ })).toBeEnabled();
});

test('City clear offers optional Chaos; its first two rounds use both reward slots and keep scores separate', async ({ page }) => {
  test.setTimeout(60000);
  await installGame(page, { initial: { area: 'city', round: 3, playerHp: 80, inventory }, allWeapons: true, fastCombat: true });
  await start(page);
  await shoot(page, { short: true, finalHeading: '다음 전투의 보상' });
  await expect(page.locator('.reward-screen .eyebrow')).toContainText('3 / 3');
  await expect(page.locator('.continue-button')).toHaveText('원정 결과 보기');
  await selectRewards(page);
  await expect(page.getByRole('heading', { name: '오븐 밖, 끝까지!', exact: true })).toBeVisible();
  const main = (await snapshot(page)).run.mainRunSummary;
  await page.getByRole('button', { name: '혼돈 지역 도전 →', exact: true }).click();
  await phase(page, 'idle');
  await page.keyboard.press('4');
  for (let round = 1; round <= 3; round++) {
    await expect(page.getByRole('heading', { name: `혼돈 지역 ${round} / 3`, exact: true })).toBeVisible();
    await shoot(page, { short: true, finalHeading: round === 3 ? '혼돈까지 정복!' : '다음 전투의 보상' });
    if (round < 3) {
      await expect(page.locator('.slot-machine')).toHaveCount(2);
      await selectRewards(page);
      await phase(page, 'idle');
    }
  }
  const trace = await snapshot(page);
  expect(trace.run.terminal).toBe('bonus-clear');
  expect(trace.events.filter(event => event.name === 'spinRewardSlot')).toHaveLength(5);
  expect(trace.run.mainRunSummary.finalScore).toBe(main.finalScore);
  expect(trace.run.bonusScore).toBeGreaterThan(0);
  await expect(page.locator('.result-stats > div').filter({ has: page.getByText('본편 최종 점수', { exact: true }) }).locator('dd')).toHaveText(main.finalScore.toLocaleString());
  await expect(page.locator('.result-stats > div').filter({ has: page.getByText('보너스 점수', { exact: true }) }).locator('dd')).toHaveText(trace.run.bonusScore.toLocaleString());
  await expect(page.getByRole('button', { name: /QR|추가 보상|혼돈 지역 도전/ })).toHaveCount(0);
});
