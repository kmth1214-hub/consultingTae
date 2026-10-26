const { test, expect, installGame, phase, arena, dragPull, snapshot, stackShot } = require('../e2e/support.cjs');

async function enter(page, { area = 'forest', round = 1, characterId = 'adventurer', special = false } = {}) {
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption(area);
  await page.getByLabel('테스트 라운드').selectOption(String(round));
  await page.getByLabel('테스트 쿠키').selectOption(characterId);
  if (special) await page.getByLabel('보스 특수 공격부터 확인').check();
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await expect(page.locator('[data-dev-tool="studio-battle-play"]')).toBeVisible();
  await phase(page, 'idle');
}

for (const [area, name] of [['forest', '숲'], ['snow', '눈'], ['city', '도시'], ['chaos', '혼돈']]) {
  test(`${area} can be played directly with the real round and counterattack`, async ({ page }) => {
    await installGame(page, { layoutSeed: 4927 });
    await enter(page, { area, round: 2 });
    await expect(page.getByRole('heading', { name: new RegExp(`${name} 지역 2 / 3`) })).toBeVisible();
    const before = await snapshot(page);
    expect(before.run.area).toBe(area); expect(before.run.round).toBe(2);
    expect(before.run.inventory).toEqual({ fireball: 3, spear: 3, defense: 3, heal: 3 });
    await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
    await expect(page.getByTestId('enemy-attack')).toBeVisible({ timeout: 10000 });
    await phase(page, 'idle');
    const after = await snapshot(page);
    expect(after.run.ammo).toBe(8);
    expect(after.run.playerHp).toBeLessThan(100);
    expect(after.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
  });
}

for (const area of ['snow', 'city']) test(`${area} obstacles play their real regional effect inside studio play`, async ({ page }) => {
  await installGame(page, { layoutSeed: 4927 });
  await enter(page, { area });
  const shot = await stackShot({ area, seed: 4927 });
  await dragPull(page, shot); await page.mouse.up();
  await expect(page.getByTestId(area === 'snow' ? 'obstacle-frost' : 'city-ground-chain').first()).toBeVisible();
  await page.screenshot({ path: `tmp/studio-play-${area}-effect.png` });
  await phase(page, 'idle');
  const trace = await snapshot(page);
  const event = trace.events.find(e => e.name === 'resolveProjectile').result;
  expect(event.obstacleEffects.some(effect => effect.kind === (area === 'snow' ? 'ice-guard' : 'jar-burst'))).toBe(true);
  if (area === 'snow') expect(event.enemyAttack.damageReduction).toBe(.5);
  else expect(event.obstacleEffects.flatMap(effect => effect.hits).length).toBeGreaterThan(0);
});

test('boss special can be the very next attack, and clearing a test never unlocks or submits real records', async ({ page }) => {
  const api = [];
  page.on('request', request => { if (request.url().includes('/api/')) api.push(request.url()); });
  await installGame(page, { layoutSeed: 4927 });
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', '{"version":1,"snowAreaCleared":false}'));
  await enter(page, { area: 'snow', round: 3, special: true });
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-special', 'frozen-breath', { timeout: 10000 });
  expect((await snapshot(page)).lastEvent.enemyAttack.attemptedSpecial).toBe('frozen-breath');
  await phase(page, 'idle');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1'))))
    .toEqual({ version: 1, snowAreaCleared: false });
  expect(api).toEqual([]);
});

test('changing the selected region during flight discards old callbacks and starts a fresh real battle', async ({ page }) => {
  await installGame(page);
  await enter(page);
  await dragPull(page, { angleDeg: 45, powerRatio: 1 }); await page.mouse.up();
  await phase(page, 'launching');
  await page.getByLabel('플레이 지역').selectOption('city');
  await page.getByLabel('플레이 라운드').selectOption('3');
  expect((await snapshot(page)).run.area).toBe('forest');
  await page.getByRole('button', { name: '선택한 전투 시작', exact: true }).click();
  await phase(page, 'idle');
  await expect(page.getByRole('heading', { name: /도시 지역 3 \/ 3/ })).toBeVisible();
  await page.waitForTimeout(3000);
  const state = await snapshot(page);
  expect(state.run.area).toBe('city'); expect(state.run.round).toBe(3);
  expect(state.run.ammo).toBe(9); expect(state.run.playerHp).toBe(100);
  expect(state.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
});

test('same-layout replay, new layout and review return preserve the chosen map and camera preferences', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => .5;
    let seed = 5;
    const original = Crypto.prototype.getRandomValues;
    Crypto.prototype.getRandomValues = function (values) {
      if (values instanceof Uint32Array && values.length === 1) { values[0] = seed++; return values; }
      return original.call(this, values);
    };
  });
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('chaos');
  await page.getByLabel('길', { exact: true }).uncheck();
  await page.getByRole('button', { name: '확대', exact: true }).click();
  const zoom = await page.getByLabel('확대 비율').inputValue();
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await phase(page, 'idle');
  const play = page.locator('[data-dev-tool="studio-battle-play"]');
  await expect(play).toHaveAttribute('data-layout-seed', '5');
  const geometry = () => page.locator('.battle-arena .scene-scenery > g').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
  const before = await geometry();
  await page.getByRole('button', { name: '다시 시작', exact: true }).click(); await phase(page, 'idle');
  await expect(play).toHaveAttribute('data-layout-seed', '5'); expect(await geometry()).toEqual(before);
  await page.getByRole('button', { name: '새 배치로 시작', exact: true }).click(); await phase(page, 'idle');
  await expect(play).toHaveAttribute('data-layout-seed', '6'); expect(await geometry()).not.toEqual(before);
  await page.getByRole('button', { name: '지도 검토로 돌아가기', exact: true }).click();
  await expect(page.locator('.map-studio')).toBeVisible();
  await expect(play).toHaveCount(0);
  await expect(page.getByLabel('확대 비율')).toHaveValue(zoom);
  await expect(page.locator('.studio-viewport [data-scene-layer="route"]')).toBeHidden();
  const viewport = page.locator('.studio-viewport'), world = viewport.locator('> .arena-world');
  const transform = await world.getAttribute('style');
  await viewport.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => world.getAttribute('style')).not.toBe(transform);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

for (const area of ['snow', 'chaos']) test(`a cleared ${area} test stops at a studio result without camp, profile writes or leaderboard calls`, async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await installGame(page, { fastCombat: true });
  await enter(page, { area, round: area === 'snow' ? 3 : 1, characterId: 'wind' });
  await dragPull(page); await page.mouse.up();
  await expect(page.getByRole('heading', { name: '테스트 전투 완료', exact: true })).toBeVisible({ timeout: 10000 });
  expect((await snapshot(page)).run.round).toBe(area === 'snow' ? 3 : 1);
  await expect(page.locator('.leaderboard-screen')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: '같은 배치 다시 플레이', exact: true }).click();
  await phase(page, 'idle');
  expect((await snapshot(page)).run.ammo).toBe(9);
});

test('phone play supports locked cookies, real controls and a visible return without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page);
  await enter(page, { area: 'chaos', round: 3, characterId: 'milk' });
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-character-id', 'milk');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(arena(page)).toBeVisible();
  await page.getByRole('button', { name: '방어 사용', exact: true }).click();
  expect((await snapshot(page)).run.defenseArmed).toBe(true);
  await page.screenshot({ path: 'tmp/studio-play-phone.png' });
  await page.getByRole('button', { name: '지도 검토로 돌아가기', exact: true }).click();
  await expect(page.locator('.map-studio')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
