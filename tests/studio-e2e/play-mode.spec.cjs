const { test, expect, installGame, phase, arena, dragPull, snapshot, stackShot } = require('../e2e/support.cjs');
const { createStudioScenario } = require('../../src/dev/createStudioSession.js');
const { planShot } = require('../../src/game/shotGeometry.js');

const nonMusicStorageKeys = page => page.evaluate(() => Object.keys(localStorage)
  .filter(key => key !== 'cookie-expedition-bgm-v1'));

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

async function directForestShot(enemyHp = 4) {
  const scenario = createStudioScenario({ area: 'forest', round: 1, seed: 0 });
  const enemies = scenario.enemies.map(enemy => ({ ...enemy, hp: enemyHp, maxHp: 4 }));
  for (let angleDeg = 0; angleDeg <= 75; angleDeg += 2.5) for (let step = 1; step <= 40; step++) {
    const powerRatio = step / 40, radians = angleDeg * Math.PI / 180;
    const shot = planShot({ layout: scenario.layout, enemies, prototype: 'forest-elevated-v1',
      loadedCandyId: 'adventurer-candy', pull: { ready: true, powerRatio,
        direction: { x: Math.cos(radians), y: -Math.sin(radians) } } });
    if (shot?.hitIds.includes(enemies[0].id) && !shot.contacts.length) return { enemies, angleDeg, powerRatio };
  }
  throw new Error('No direct Forest hit for the studio impact test');
}

test('studio projectile art, roll shadow and slingshot follow the enlarged collision radius', async ({ page }) => {
  await installGame(page);
  await enter(page);
  await expect(page.locator('.battle-arena .launcher')).toHaveAttribute('data-world-scale', '1.5');
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  const projectile = page.getByTestId('projectile');
  await expect(projectile).toBeAttached();
  await expect(projectile.locator('g[transform="scale(1.5)"]')).toHaveCount(1);
  await expect(page.getByTestId('roll-shadow')).toHaveAttribute('rx', '19.5');
});

test('Chaos studio preview and play share the three painted fusion enemies', async ({ page }) => {
  await installGame(page);
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('chaos');
  for (const round of ['1', '2']) {
    await page.getByLabel('테스트 라운드').selectOption(round);
    const preview = page.locator('.studio-viewport');
    const ids = await preview.locator('.monster').evaluateAll(nodes => nodes.map(node => node.dataset.enemyId));
    expect(ids.length).toBeGreaterThanOrEqual(9);
    for (const kind of ['frost-gear-snake', 'oven-snow-boar', 'jelly-cloud-robot']) {
      const art = preview.locator(`img[data-monster-art="${kind}"]`).first();
      await expect(art).toBeVisible();
      await expect.poll(() => art.evaluate(node => node.naturalWidth)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: `tmp/studio-chaos-round-${round}-fusions.png` });
    await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
    await phase(page, 'idle');
    const playableIds = await page.locator('.battle-arena .monster')
      .evaluateAll(nodes => nodes.map(node => node.dataset.enemyId));
    expect(playableIds).toEqual(ids);
    if (round === '1') {
      await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
      await expect(page.getByTestId('enemy-attack')).toBeVisible({ timeout: 10000 });
      const attack = (await snapshot(page)).lastEvent.enemyAttack;
      expect(attack.fusionAttack).toBe('base');
      expect(attack.kind).toBe('frost-gear-snake');
      await phase(page, 'idle');
    }
    await page.getByRole('button', { name: '지도 검토로 돌아가기' }).click();
  }
});

for (const [kind, disruption, label] of [
  ['frost-gear-snake', 'pull', '최대 당김 15% 감소'],
  ['oven-snow-boar', 'preview', '궤적 안내 30%→15%'],
  ['jelly-cloud-robot', 'roll', '굴림 최대 5→3배']
]) test(`${kind} landed disruption is shown for the next shot only`, async ({ page }) => {
  const enemy = createStudioScenario({ area: 'chaos', round: 1, seed: 0 })
    .enemies.find(item => item.kind === kind);
  await installGame(page, { stateOverride: { enemies: [{ ...enemy, attackCount: 1 }] } });
  await enter(page, { area: 'chaos', round: 1 });
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await expect(page.getByTestId('enemy-attack')).toBeVisible({ timeout: 10000 });
  const attack = (await snapshot(page)).lastEvent.enemyAttack;
  expect(attack.fusionAttack).toBe('disrupt');
  expect(attack.aimDisruption).toBe(disruption);
  await phase(page, 'idle');
  await expect(arena(page)).toHaveAttribute('data-aim-disruption', disruption);
  await expect(page.locator('.battle-arena .candy-status-chips')).toContainText(label);
  await page.screenshot({ path: `tmp/studio-chaos-${disruption}-hud.png` });
  await dragPull(page, { angleDeg: 20, powerRatio: 1 });
  if (disruption === 'pull') await expect(page.locator('.power-meter-fill')).toHaveAttribute('style', /height: 85%/);
  await page.keyboard.press('Escape');
  await phase(page, 'idle');
  await expect(arena(page)).toHaveAttribute('data-aim-disruption', disruption);
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await phase(page, 'idle');
  await expect(arena(page)).not.toHaveAttribute('data-aim-disruption');
});

test('defended fusion disruption leaves no aiming penalty', async ({ page }) => {
  const enemy = createStudioScenario({ area: 'chaos', round: 1, seed: 0 })
    .enemies.find(item => item.kind === 'frost-gear-snake');
  await installGame(page, { stateOverride: { enemies: [{ ...enemy, attackCount: 1 }], defenseArmed: true } });
  await enter(page, { area: 'chaos', round: 1 });
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await expect(page.getByTestId('enemy-attack')).toBeVisible({ timeout: 10000 });
  const attack = (await snapshot(page)).lastEvent.enemyAttack;
  expect(attack.blocked).toBe(true);
  expect(attack.aimDisruption).toBeUndefined();
  await phase(page, 'idle');
  await expect(arena(page)).not.toHaveAttribute('data-aim-disruption');
});

test('Forest studio shows the final candy impact before removing a defeated monster', async ({ page }) => {
  const target = await directForestShot(1);
  await installGame(page, { stateOverride: { enemies: target.enemies } });
  await enter(page);
  await dragPull(page, target); await page.mouse.up();
  await expect(page.locator('.monster.is-defeated-hit')).toHaveCount(1, { timeout: 10000 });
  await expect(page.getByTestId('monster-hit-burst')).toBeVisible();
  await expect(page.locator('.monster.is-defeated-hit .hit-effect')).toContainText('−1');
  await page.screenshot({ path: 'tmp/studio-forest-monster-hit.png' });
  await expect(page.getByRole('heading', { name: '테스트 전투 완료', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.monster')).toHaveCount(0);
});

test('Forest studio distinguishes real cookie damage from a defended counterattack', async ({ page }) => {
  await installGame(page);
  await enter(page);
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await expect(page.getByTestId('player-hit-crumbs')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('player-guard-wave')).toHaveCount(0);
  await page.screenshot({ path: 'tmp/studio-forest-cookie-hit.png' });
  await phase(page, 'idle');
  await page.getByRole('button', { name: '방어 사용', exact: true }).click();
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await expect(page.getByTestId('player-guard-wave')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('player-hit-crumbs')).toHaveCount(0);
  await page.screenshot({ path: 'tmp/studio-forest-cookie-guard.png' });
});

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
  const run = (await snapshot(page)).run;
  const shot = await stackShot({ area, seed: run.layoutSeed, enemies: run.enemies });
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
  await expect(play).toHaveAttribute('data-layout-seed', '0');
  const geometry = () => page.locator('.battle-arena .scene-scenery > g').evaluateAll(nodes => nodes.map(n => n.getAttribute('transform')));
  const before = await geometry();
  await page.getByRole('button', { name: '다시 시작', exact: true }).click(); await phase(page, 'idle');
  await expect(play).toHaveAttribute('data-layout-seed', '0'); expect(await geometry()).toEqual(before);
  await page.getByRole('button', { name: '새 배치로 시작', exact: true }).click(); await phase(page, 'idle');
  await expect(play).toHaveAttribute('data-layout-seed', '5'); expect(await geometry()).not.toEqual(before);
  await page.getByRole('button', { name: '지도 검토로 돌아가기', exact: true }).click();
  await expect(page.locator('.map-studio')).toBeVisible();
  await expect(play).toHaveCount(0);
  await expect(page.getByLabel('확대 비율')).toHaveValue(zoom);
  await expect(page.locator('.studio-viewport [data-scene-layer="route"]')).toBeHidden();
  const viewport = page.locator('.studio-viewport'), world = viewport.locator('> .arena-world');
  const transform = await world.getAttribute('style');
  await viewport.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => world.getAttribute('style')).not.toBe(transform);
  expect(await nonMusicStorageKeys(page)).toEqual([]);
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
  expect(await nonMusicStorageKeys(page)).toEqual([]);
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
  expect(await nonMusicStorageKeys(page)).toEqual([]);
});
