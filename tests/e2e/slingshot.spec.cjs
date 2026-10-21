const { test, expect } = require('./support.cjs');

const arena = page => page.getByRole('group', { name: '전투 맵', exact: true });
const ammo = page => page.locator('.battle-stats > span').nth(1).locator('strong');
const phase = (page, value) => expect(arena(page)).toHaveAttribute('data-aim-phase', value);
const scale = page => page.locator('.arena-world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
async function start(page) {
  await page.goto('/');
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: '모험가맛 쿠키 세 번째 명중마다 점수 +10 이 쿠키로 출발 →', exact: true }).click();
  await phase(page, 'idle');
}
async function grab(page) {
  const box = await page.getByRole('button', { name: '새총 잡기', exact: true }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await phase(page, 'angle');
}
async function charge(page, milliseconds = 600) {
  await page.keyboard.down('Space');
  await phase(page, 'power');
  await expect.poll(async () => parseFloat(await page.locator('.power-meter-fill').evaluate(el => el.style.height)),
    { intervals: [8], timeout: 3000 }).toBeGreaterThan(20 + milliseconds * .08);
  await page.keyboard.up('Space');
  await phase(page, 'direction');
}
async function target(page, x = 950) {
  const box = await page.locator('.arena-world').boundingBox();
  await page.mouse.move(box.x + box.width * x / 1200, box.y + box.height * 570 / 800);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => .5; });
  await start(page);
});

test('any map point starts a primary mouse aim, while HUD and other pointers remain independent', async ({ page }) => {
  const box = await arena(page).boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .4);
  await page.mouse.down();
  await phase(page, 'angle');
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .4 - 20);
  await expect(page.getByTestId('trajectory-preview')).toBeVisible();
  const arc = await page.getByTestId('trajectory-preview').getAttribute('d');
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .4 - 40);
  await expect(page.getByTestId('trajectory-preview')).not.toHaveAttribute('d', arc);
  await page.mouse.up();
  await phase(page, 'idle');
  await page.getByRole('complementary', { name: '장전된 마법사탕' }).click();
  await phase(page, 'idle');
  await page.getByRole('button', { name: '방어 사용', exact: true }).click();
  await phase(page, 'idle');
  await page.getByRole('button', { name: '새총 잡기' }).click({ button: 'right' });
  await phase(page, 'idle');
  await page.getByRole('button', { name: '새총 잡기' }).dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, pointerId: 8, button: 0 });
  await phase(page, 'idle');
  await expect(page.locator('.launcher input, .launcher output')).toHaveCount(0);
  await expect(page.locator('.launcher')).not.toContainText(/\d+[%°]/);
  await expect(page.getByRole('img', { name: '새총의 힘: 약하게 당김' })).toBeVisible();
  await expect(page.locator('.power-meter')).not.toHaveAttribute('aria-valuenow');
});

test('grab zoom, vertical deformation, charge zoom-out, camera lock, partial path and one impact resolve real damage', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await grab(page);
  expect(await scale(page)).toBe(1.5);
  const bandBefore = await page.getByTestId('sling-band').getAttribute('d');
  const box = await page.getByRole('button', { name: '새총 잡기' }).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 16);
  await expect(page.getByTestId('sling-band')).not.toHaveAttribute('d', bandBefore);
  // Restore the initial angle with the actual mouse so hit tests remain predictable.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeDisabled();
  await expect(page.getByText('조준을 마친 뒤 소모품을 사용하세요.', { exact: true })).toBeVisible();
  await page.mouse.up();
  await phase(page, 'idle');
  await page.getByRole('button', { name: '알림 닫기' }).click();
  await grab(page);
  const beforeCharge = await page.getByTestId('sling-band').getAttribute('d');
  await charge(page);
  expect(await scale(page)).toBeLessThan(1.5);
  expect(await scale(page)).toBeGreaterThan(1);
  await expect(page.getByTestId('sling-band')).not.toHaveAttribute('d', beforeCharge);
  const lockedTransform = await page.locator('.arena-world').getAttribute('style');
  const lockedPower = await page.locator('.power-meter-fill').getAttribute('style');
  await page.waitForTimeout(200);
  await expect(page.locator('.arena-world')).toHaveAttribute('style', lockedTransform);
  await expect(page.locator('.power-meter-fill')).toHaveAttribute('style', lockedPower);
  await target(page);
  const ratio = await page.getByTestId('trajectory-preview').evaluate(el => el.getTotalLength() / el.parentElement.querySelector('[data-testid="trajectory-geometry"]').getTotalLength());
  expect(ratio).toBeCloseTo(.3, 2);
  const layers = await page.locator('.projectile-layer').evaluate(el => ({ path: +getComputedStyle(el).zIndex,
    foreground: +getComputedStyle(document.querySelector('.scene-foreground')).zIndex,
    monsters: +getComputedStyle(document.querySelector('.monster-group')).zIndex }));
  expect(layers.path).toBeGreaterThan(layers.foreground);
  expect(layers.path).toBeLessThan(layers.monsters);
  await page.screenshot({ path: 'test-results/t04-direction.jpg' });
  await expect(ammo(page)).toHaveText('9');
  await page.mouse.up();
  await phase(page, 'launching');
  await expect(page.getByRole('complementary', { name: '장전된 마법사탕' })).toHaveCount(0);
  await expect(page.getByTestId('projectile')).toBeVisible();
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'test-results/t04-flight.jpg' });
  await expect(ammo(page)).toHaveText('9');
  await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeDisabled();
  await page.keyboard.press('3');
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('8');
  await expect(page.getByRole('button', { name: '젤리 뱀, 체력 2/4, 목표 선택', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '장전된 마법사탕' })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(ammo(page)).toHaveText('8');
  expect(errors).toEqual([]);
});

test('early release and locked power without direction cancel without spending ammo', async ({ page }) => {
  await grab(page);
  await page.mouse.up();
  await phase(page, 'idle');
  await grab(page);
  await charge(page, 160);
  await page.mouse.up();
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('9');
  await expect(page.getByTestId('projectile')).toHaveCount(0);
  expect(await scale(page)).toBe(1);
});

for (const cancellation of ['Escape', 'pointercancel', 'lostcapture', 'blur']) {
  test(`${cancellation} cancels charging, restores HUD/camera and leaves no phantom shot`, async ({ page }) => {
    await grab(page);
    await page.keyboard.down('Space');
    await phase(page, 'power');
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'pointercancel') await arena(page).dispatchEvent('pointercancel', { pointerId: 1 });
    else if (cancellation === 'lostcapture') await arena(page).evaluate(el => el.releasePointerCapture(1));
    else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await phase(page, 'idle');
    await page.keyboard.up('Space');
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expect(ammo(page)).toHaveText('9');
    expect(await scale(page)).toBe(1);
    await expect(page.getByRole('complementary', { name: '장전된 마법사탕' })).toBeVisible();
    await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeEnabled();
  });
}

test('a deliberate miss consumes one ammo; blur during flight cancels without later resolving', async ({ page }) => {
  await grab(page);
  await charge(page, 60);
  await target(page, 500);
  await page.mouse.up();
  await phase(page, 'launching');
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('8');
  await expect(page.getByRole('button', { name: '젤리 뱀, 체력 4/4, 목표 선택', exact: true })).toBeVisible();
  await grab(page);
  await charge(page, 150);
  await target(page);
  await page.mouse.up();
  await phase(page, 'launching');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await phase(page, 'idle');
  await page.waitForTimeout(1300);
  await expect(ammo(page)).toHaveText('8');
  await expect(page.getByTestId('projectile')).toHaveCount(0);
});

test('reduced motion avoids zoom animation and reload during flight cannot affect a fresh run', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await grab(page);
  await charge(page, 80);
  expect(await scale(page)).toBe(1);
  await target(page);
  await page.mouse.up();
  await page.reload();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: '모험가맛 쿠키 세 번째 명중마다 점수 +10 이 쿠키로 출발 →', exact: true }).click();
  await page.waitForTimeout(1300);
  await expect(ammo(page)).toHaveText('9');
  await phase(page, 'idle');
});

test('a killing shot unmounts the arena at impact and cannot resolve again on the reward screen', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await grab(page);
  await charge(page);
  await target(page);
  await page.mouse.up();
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('8');
  await grab(page);
  await charge(page);
  await target(page);
  await page.mouse.up();
  await phase(page, 'launching');
  await expect(page.getByRole('heading', { name: '다음 한 발을 위한 선물', exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(page.getByRole('heading', { name: '다음 한 발을 위한 선물', exact: true })).toBeVisible();
  await expect(page.getByTestId('projectile')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Wind homing visually reaches the selected enemy once, then short shots can miss normally', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  await page.reload();
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: /^바람궁수 쿠키/ }).click();
  for (let i = 0; i < 2; i++) {
    await grab(page);
    await charge(page, 80);
    await target(page);
    await page.mouse.up();
    await phase(page, 'launching');
    await phase(page, 'idle');
    await expect(ammo(page)).toHaveText(String(8 - i));
    await expect(page.getByRole('button', { name: '젤리 뱀, 체력 2/4, 목표 선택', exact: true })).toBeVisible();
  }
});

test('missing SVG screen geometry resolves a miss and reloads the candy card instead of stalling', async ({ page }) => {
  await grab(page);
  await charge(page);
  await target(page);
  await page.locator('.projectile-layer').evaluate(el => { el.getScreenCTM = () => null; });
  await page.mouse.up();
  await phase(page, 'launching');
  await phase(page, 'idle');
  await expect(ammo(page)).toHaveText('8');
  await expect(page.getByRole('button', { name: '젤리 뱀, 체력 4/4, 목표 선택', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '장전된 마법사탕' })).toBeVisible();
});
