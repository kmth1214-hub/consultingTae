const { test, expect, installGame, arena, phase, start, grabMap } = require('./support.cjs');

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
    await grabMap(page);
    const box = await arena(page).boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .35);
    await expect(page.getByTestId('trajectory-preview')).toBeVisible();
    const stroke = await page.getByTestId('trajectory-preview').evaluate(node => ({ width: getComputedStyle(node).strokeWidth,
      opacity: getComputedStyle(node).opacity, vectorEffect: node.getAttribute('vector-effect') }));
    expect(Number(stroke.opacity)).toBeGreaterThan(.8);
    expect(stroke.vectorEffect).toBe('non-scaling-stroke');
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
    expect(visibleSegments, 'preview must have exposed segments outside HUD/launcher bounds').toBeGreaterThanOrEqual(5);
    await page.screenshot({ path: `test-results/t05-map-aim-${viewport.width}.jpg` });
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
  await grabMap(page);
  await page.keyboard.down('Space');
  await phase(page, 'power');
  expect(await page.locator('.arena-world').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).a)).toBe(1);
  await expect(page.getByText('Space를 놓으면 힘이 고정됩니다. 마우스는 계속 누르고 있으세요.', { exact: true })).toBeVisible();
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await phase(page, 'idle');
});
