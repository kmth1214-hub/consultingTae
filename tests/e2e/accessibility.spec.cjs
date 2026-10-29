const { test, expect, installGame, arena, phase, start, grabMap, dragPull, shoot, hp, snapshot } = require('./support.cjs');
const { aimedShot } = require('./spear-support.cjs');

for (const viewport of [{ width: 2007, height: 1037 }, { width: 2560, height: 1080 }]) {
  test(`${viewport.width}×${viewport.height} arena fills the window with proportional art and correctly aligned shots`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installGame(page);
    await start(page);
    const bounds = await arena(page).boundingBox();
    expect(bounds.x).toBeLessThanOrEqual(13);
    expect(bounds.width).toBeGreaterThanOrEqual(viewport.width - 26);
    expect(bounds.height).toBeGreaterThan(viewport.height * .8);
    expect(bounds.y + bounds.height).toBeLessThan(viewport.height);
    const layout = await page.evaluate(() => {
      const world = document.querySelector('.arena-world').getBoundingClientRect();
      const svg = document.querySelector('.projectile-layer').getScreenCTM();
      return { world: { width: world.width, height: world.height }, sx: svg.a, sy: svg.d,
        scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
        layersAligned: [...document.querySelectorAll('.battlefield-layer, .scene-scenery, .projectile-layer')].every(node => {
          const rect = node.getBoundingClientRect();
          return Math.abs(rect.x - world.x) < 1 && Math.abs(rect.y - world.y) < 1
            && Math.abs(rect.width - world.width) < 1 && Math.abs(rect.height - world.height) < 1;
        }) };
    });
    expect(layout.world.width / layout.world.height).toBeCloseTo(3, 2);
    expect(layout.sx).toBeCloseTo(layout.sy, 4);
    expect(layout.layersAligned).toBe(true);
    expect(layout.scrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(layout.scrollHeight).toBeLessThanOrEqual(viewport.height);
    for (const node of [page.locator('.launcher-button'), page.locator('.monster').first()]) {
      const box = await node.boundingBox();
      expect(box.x).toBeGreaterThan(bounds.x);
      expect(box.y).toBeGreaterThan(bounds.y);
      expect(box.x + box.width).toBeLessThan(bounds.x + bounds.width);
      expect(box.y + box.height).toBeLessThan(bounds.y + bounds.height);
    }
    await page.screenshot({ path: `tmp/react-t08-wide-${viewport.width}.jpg` });
    await page.keyboard.press('3');
    await dragPull(page, { powerRatio: .08, angleDeg: -5 }); await page.mouse.up();
    await expect(page.locator('.enemy-warning')).toBeVisible({ timeout: 10000 });
    const warning = await page.locator('.enemy-warning').boundingBox();
    expect(warning.y).toBeGreaterThan(bounds.y);
    expect(warning.y + warning.height).toBeLessThan(bounds.y + bounds.height);
    await phase(page, 'idle');
    await shoot(page, await aimedShot({ piercing: false }));
    expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
    await expect(hp(page)).toHaveText('95');
  });
}

test('short landscape keeps the launcher clear of the compact item table and remains playable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await installGame(page, { initial: { inventory: { fireball: 1, spear: 1, defense: 1, heal: 1 } } });
  await start(page);
  const launcher = await page.locator('.launcher-button').boundingBox();
  const inventory = await page.locator('.consumable-hud').boundingBox();
  expect(launcher.y).toBeGreaterThan(inventory.y + inventory.height);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(390);
  for (const name of ['불공', '창', '방어', '회복']) {
    const button = page.getByRole('button', { name: `${name} 사용`, exact: true });
    expect(await button.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
  }
  await page.screenshot({ path: 'tmp/react-t08-short-landscape.jpg' });
  await shoot(page, await aimedShot({ piercing: false }));
  expect((await snapshot(page)).run.enemies[0].hp).toBe(2);
});

async function assertLayout(page) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, index, ids) => ids.indexOf(id) !== index) }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width);
  expect(dimensions.duplicateIds).toEqual([]);
  for (const button of await page.getByRole('button').all()) if (await button.isVisible()) await expect(button).toHaveAccessibleName(/\S/);
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}×${viewport.height} home, characters and arena retain named reachable controls without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installGame(page, { initial: { inventory: { fireball: 1, spear: 1, defense: 1, heal: 1 } } });
    await page.goto('/');
    await assertLayout(page);
    await page.getByRole('button', { name: '모험 시작' }).click();
    await assertLayout(page);
    await expect(page.getByRole('button', { name: /^우유맛 쿠키/ })).toBeDisabled();
    await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
    await phase(page, 'idle');
    await assertLayout(page);
    await expect.poll(() => page.locator('img').evaluateAll(nodes => nodes.every(node => node.complete && node.naturalWidth > 0))).toBe(true);
    expect(await page.locator('img[alt=""]').evaluateAll(nodes => nodes.every(node => node.getAttribute('aria-hidden') === 'true'))).toBe(true);
    for (const name of ['불공', '창', '방어', '회복']) {
      const button = page.getByRole('button', { name: `${name} 사용`, exact: true });
      const reachable = await button.evaluate(node => {
        const rect = node.getBoundingClientRect();
        const at = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { bounds: rect.toJSON(), reachable: at && node.contains(at) };
      });
      expect(reachable.reachable, JSON.stringify(reachable)).toBe(true);
    }
    await page.getByRole('button', { name: '회복 사용', exact: true }).click();
    await phase(page, 'idle');
    await dragPull(page, { angleDeg: 25, powerRatio: .8 });
    await expect(page.getByTestId('trajectory-preview')).toBeVisible();
    const stroke = await page.getByTestId('trajectory-preview').evaluate(node => ({ width: getComputedStyle(node).strokeWidth,
      opacity: getComputedStyle(node).opacity, vectorEffect: node.getAttribute('vector-effect'),
      screenWidth: parseFloat(getComputedStyle(node).strokeWidth) * node.getScreenCTM().a }));
    expect(Number(stroke.opacity)).toBeGreaterThan(.8);
    expect(stroke.vectorEffect).toBe('non-scaling-stroke');
    expect(stroke.screenWidth).toBeCloseTo(3.5, 1);
    const visibleSegments = await page.getByTestId('trajectory-preview').evaluate(path => {
      const length = path.getTotalLength(), matrix = path.getScreenCTM();
      const bounds = document.querySelector('.battle-arena').getBoundingClientRect();
      let count = 0;
      for (let i = 4; i <= 20; i++) {
        const point = path.getPointAtLength(length * i / 20);
        const x = matrix.a * point.x + matrix.c * point.y + matrix.e;
        const y = matrix.b * point.x + matrix.d * point.y + matrix.f;
        const node = document.elementFromPoint(x, y);
        if (x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom
          && node && !node.closest('.hud-surface, .launcher')) count++;
      }
      return count;
    });
    expect(visibleSegments, 'preview must have exposed segments outside HUD/launcher bounds').toBeGreaterThanOrEqual(viewport.width < 500 ? 3 : 5);
    await page.screenshot({ path: `tmp/wide-t02-drag-${viewport.width}.jpg` });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await phase(page, 'idle');
  });
}

test('keyboard navigation opens character selection and item failures are announced in the live region', async ({ page }) => {
  await installGame(page);
  await page.goto('/');
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '모험 시작' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '함께 떠날 쿠키', exact: true })).toBeVisible();
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^모험가맛 쿠키 / })).toBeFocused();
  await page.keyboard.press('Enter');
  await phase(page, 'idle');
  await page.keyboard.press('1');
  const status = page.getByRole('status').filter({ hasText: '이 소모품을 모두 사용했어요.' });
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByRole('button', { name: '알림 닫기' })).toHaveAccessibleName('알림 닫기');
});

test('fullscreen entry/exit preserves the game-only layout and cancels active aim on the size change', async ({ page }) => {
  await installGame(page);
  await start(page);
  const toggle = page.getByRole('button', { name: '전체화면 전환', exact: true });
  await toggle.click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement?.classList.contains('battle-screen')))).toBe(true);
  await grabMap(page);
  await page.evaluate(() => document.exitFullscreen());
  await phase(page, 'idle');
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /관리자|로그인|리더보드/ })).toHaveCount(0);
  await phase(page, 'idle');
});

test('reduced-motion preferences retain feedback with no nonessential recoil animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page);
  await start(page);
  const overviewScale = await page.locator('.arena-world').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a);
  await dragPull(page);
  await page.keyboard.down('Space');
  await phase(page, 'dragging');
  expect(await page.locator('.arena-world').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a)).toBe(overviewScale);
  await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  await expect(page.locator('#aim-instructions')).toContainText('당긴 거리로 힘을');
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await phase(page, 'idle');
});
