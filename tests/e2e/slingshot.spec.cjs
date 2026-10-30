const { test, expect, installGame, arena, phase, ammo, snapshot, start, grabMap, dragPull, shoot } = require('./support.cjs');
const { aimedShot } = require('./spear-support.cjs');
const scale = page => page.locator('.arena-world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
const card = page => page.getByRole('complementary', { name: '장전된 스톤' });

test.beforeEach(async ({ page }, testInfo) => {
  const windCase = testInfo.title.startsWith('Wind bypasses');
  const basic = { id: 'basic-stone', name: '기본 스톤', grade: 'C' };
  const wind = { id: 'wind-candy', name: '바람궁수의 사탕', grade: 'C' };
  await installGame(page, windCase ? { initial: { weapons: [basic, basic, wind] } } : {});
  await start(page);
});

test('any map point starts primary mouse drag while HUD, touch and secondary inputs remain independent', async ({ page }) => {
  const origin = await grabMap(page);
  await dragPull(page, { origin, powerRatio: .3 });
  await expect(page.getByTestId('trajectory-preview')).toBeVisible();
  const arc = await page.getByTestId('trajectory-preview').getAttribute('d');
  await dragPull(page, { origin, powerRatio: .6, angleDeg: 60 });
  await expect(page.getByTestId('trajectory-preview')).not.toHaveAttribute('d', arc);
  await page.keyboard.press('Escape'); await page.mouse.up();
  await card(page).click(); await phase(page, 'idle');
  await page.getByRole('button', { name: '방어 사용', exact: true }).click(); await phase(page, 'idle');
  await page.getByRole('button', { name: '새총 잡기' }).click({ button: 'right' });
  await phase(page, 'idle');
  await arena(page).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, pointerId: 8, button: 0 });
  await phase(page, 'idle');
  await arena(page).dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: false, pointerId: 9, button: 0 });
  await phase(page, 'idle');
  await expect(page.locator('.launcher input, .launcher output')).toHaveCount(0);
  await expect(page.locator('.launcher')).not.toContainText(/\d+[%°]/);
  await expect(page.getByRole('img', { name: '새총의 힘: 약하게 당김' })).toBeVisible();
  await expect(page.locator('.power-meter')).not.toHaveAttribute('aria-valuenow');
});

test('grab zoom, two-axis deformation and frozen pixel pull survive camera easing; one impact resolves real damage', async ({ page }) => {
  await page.screenshot({ path: 'tmp/wide-t02-overview-1440.jpg' });
  const overviewScale = await scale(page), origin = await grabMap(page);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'aim');
  const band = await page.getByTestId('sling-band').getAttribute('d');
  await dragPull(page, { origin, ...await aimedShot({ piercing: false }) });
  await expect(page.getByTestId('sling-band')).not.toHaveAttribute('d', band);
  const meter = await page.locator('.power-meter-fill').getAttribute('style');
  const path = await page.getByTestId('trajectory-preview').getAttribute('d');
  await page.keyboard.down('Space'); await phase(page, 'dragging');
  await page.waitForTimeout(260); await page.keyboard.up('Space');
  await expect(page.locator('.power-meter-fill')).toHaveAttribute('style', meter);
  await expect(page.getByTestId('trajectory-preview')).toHaveAttribute('d', path);
  expect(await scale(page)).toBeGreaterThan(overviewScale);
  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeDisabled();
  await expect(page.getByText('조준을 마친 뒤 소모품을 사용하세요.', { exact: true })).toBeVisible();
  const ratio = await page.getByTestId('trajectory-preview').evaluate(el => el.getTotalLength()
    / el.parentElement.querySelector('[data-testid="trajectory-geometry"]').getTotalLength());
  expect(ratio).toBeCloseTo(.3, 2);
  expect(await page.locator('.projectile-layer').evaluate(el => +getComputedStyle(el).zIndex
    > +getComputedStyle(document.querySelector('.scene-scenery')).zIndex)).toBe(true);
  await page.screenshot({ path: 'tmp/wide-t02-drag-1440.jpg' });
  await page.mouse.up(); await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'follow');
  await expect(card(page)).toHaveCount(0);
  await expect(page.locator('.sling-loaded-candy')).toHaveCount(0);
  await expect(page.getByTestId('projectile')).toBeVisible();
  await expect(ammo(page)).toHaveText('3');
  await page.screenshot({ path: 'tmp/wide-t02-flight-1440.jpg' });
  await page.keyboard.press('3');
  await phase(page, 'responding');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'enemy');
  await expect(card(page)).toBeVisible();
  await page.screenshot({ path: 'tmp/wide-t02-response-1440.jpg' });
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('2');
  await expect(page.getByRole('img', { name: '젤리 뱀, 체력 2/4', exact: true })).toBeVisible();
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  await page.waitForTimeout(500);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('release inside the dead zone cancels without spending ammunition', async ({ page }) => {
  const origin = await grabMap(page);
  await page.mouse.move(origin.x + 5, origin.y + 3); await page.mouse.up();
  await phase(page, 'idle'); await expect(ammo(page)).toHaveText('3');
  await expect(page.getByTestId('projectile')).toHaveCount(0);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
});

for (const cancellation of ['Escape', 'pointercancel', 'lostcapture', 'blur', 'secondary', 'resize', 'hidden', 'motion-change']) {
  test(`${cancellation} cancels a held pull, restores HUD/camera and leaves no phantom shot`, async ({ page }) => {
    await dragPull(page);
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'pointercancel') await arena(page).dispatchEvent('pointercancel', { pointerId: 1 });
    else if (cancellation === 'lostcapture') await arena(page).evaluate(el => el.releasePointerCapture(1));
    else if (cancellation === 'secondary') await page.mouse.click(20, 300, { button: 'right' });
    else if (cancellation === 'resize') await page.setViewportSize({ width: 1300, height: 850 });
    else if (cancellation === 'motion-change') await page.emulateMedia({ reducedMotion: 'reduce' });
    else if (cancellation === 'hidden') await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await phase(page, 'idle'); await page.mouse.up(); await page.waitForTimeout(350);
    await expect(ammo(page)).toHaveText('3');
    await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
    await expect(card(page)).toBeVisible();
    await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeEnabled();
    expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
  });
}

test('weak and reverse misses spend one shot each; blur during flight cancels without later resolving', async ({ page }) => {
  await shoot(page, { short: true }); await expect(ammo(page)).toHaveText('2');
  await shoot(page, { reverse: true, powerRatio: .6 }); await expect(ammo(page)).toHaveText('1');
  await expect(page.locator('.battle-status')).toContainText('뒤로 날아갔어요');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(4);
  await dragPull(page); await page.mouse.up(); await phase(page, 'launching');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await phase(page, 'idle'); await page.waitForTimeout(3200);
  await expect(ammo(page)).toHaveText('1'); await expect(page.getByTestId('projectile')).toHaveCount(0);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(2);
});

test('stack contact topples the prop and applies the regional collision effect once', async ({ page }) => {
  await dragPull(page, await require('./support.cjs').stackShot({ physical: true })); await page.mouse.up();
  await phase(page, 'launching');
  // Momentum can carry the candy past the first stack, so the final landing may be ground.
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'ground');
  const id = await arena(page).getAttribute('data-obstacle-id');
  await expect(page.locator(`.scene-scenery [data-obstacle-id="${id}"]`)).toHaveCount(1);
  await phase(page, 'idle');
  await expect(page.locator(`.scene-scenery [data-obstacle-id="${id}"]`)).toHaveAttribute('data-stack-state', 'toppled');
  const trace = await snapshot(page);
  expect(trace.lastEvent.hits.map(hit => hit.damage)).toEqual([3]);
  await expect(page.locator('.battle-status')).toContainText(/통나무 충돌|연쇄 충돌/);
  expect(trace.lastEvent.obstacleEffect.kind).toBe('log-strike');
  await expect(arena(page)).toHaveAttribute('data-obstacle-effect', 'log-strike');
  expect(trace.run.enemies[0].hp).toBe(1);
});

test('a vertical downward shot is legal, lands promptly and consumes one ordinary miss', async ({ page }) => {
  await dragPull(page, { angleDeg: -90, powerRatio: .8 });
  await page.mouse.up(); await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'ground');
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('2');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(4);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('reduced motion is static overview and reload during flight cannot affect a fresh run', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await scale(page);
  await dragPull(page);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview'); expect(await scale(page)).toBe(initial);
  await page.mouse.up(); await page.reload();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
  await page.waitForTimeout(600); await phase(page, 'idle'); await expect(ammo(page)).toHaveText('3');
});

test('a killing shot unmounts at impact and cannot resolve again on the reward screen', async ({ page }) => {
  const aimed = await aimedShot({ piercing: false });
  await shoot(page, aimed); await expect(ammo(page)).toHaveText('2');
  await shoot(page, { ...aimed, finalHeading: '다음 전투의 보상' });
  const trace = await snapshot(page);
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: '다음 전투의 보상', exact: true })).toBeVisible();
  expect((await snapshot(page)).run).toEqual(trace.run);
  expect(trace.events.filter(e => e.name === 'resolveProjectile')).toHaveLength(2);
});

test('Wind bypasses the solid prop once, while reverse preserves its charge and later weak shots miss', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await page.reload(); await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: /^바람궁수 쿠키/ }).click();
  await shoot(page, { reverse: true, powerRatio: .6 });
  expect((await snapshot(page)).run.roundEffects.windHomingUsed).toBe(false);
  await dragPull(page, { angleDeg: 0, powerRatio: 1 });
  await expect(page.locator('.monster.is-targeted')).toHaveCount(1);
  await page.mouse.up(); await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-impact-kind', 'enemy');
  await phase(page, 'idle');
  expect((await snapshot(page)).run.roundEffects.windHomingUsed).toBe(true);
  expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
  await shoot(page, { short: true, finalHeading: '다음엔 조금 더 멀리' });
  expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
  expect((await snapshot(page)).run.ammo).toBe(0);
});

test('DOM matrices cannot change world hits; zero-size viewport rejects a grab without getting stuck', async ({ page }) => {
  await page.locator('.projectile-layer').evaluate(el => { el.getScreenCTM = () => null; });
  await shoot(page, await aimedShot({ piercing: false }));
  expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
  await arena(page).evaluate(el => { el.getBoundingClientRect = () => ({ width: 0, height: 0 }); });
  await page.mouse.click(700, 350); await phase(page, 'idle'); await expect(ammo(page)).toHaveText('2');
});

test('390px viewport keeps mouse drag, flight and response functional through the wide camera stages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const rect = await arena(page).boundingBox();
  await expect.poll(async () => Math.abs(await scale(page) - rect.width / 3600)).toBeLessThan(.00001);
  await page.screenshot({ path: 'tmp/wide-t02-overview-390.jpg' });
  await dragPull(page, await aimedShot({ piercing: false }));
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'aim');
  await page.screenshot({ path: 'tmp/wide-t02-drag-390.jpg' });
  await page.mouse.up(); await phase(page, 'launching');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'follow');
  await expect.poll(async () => {
    const transform = await page.getByTestId('projectile').getAttribute('transform');
    return Number(transform.match(/translate\(([^ ]+)/)[1]);
  }, { intervals: [16] }).toBeGreaterThan(800);
  await page.screenshot({ path: 'tmp/wide-t02-flight-390.jpg' });
  await phase(page, 'responding');
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'enemy');
  await page.screenshot({ path: 'tmp/wide-t02-response-390.jpg' });
  await phase(page, 'idle');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
