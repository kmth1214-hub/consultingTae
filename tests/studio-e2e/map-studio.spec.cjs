const { test, expect } = require('../e2e/support.cjs');

async function expectedObstacleCount(area = 'forest') {
  const { createStudioScenario } = await import('../../src/dev/createStudioSession.js');
  return createStudioScenario({ area, round: 1, seed: 0 }).layout.obstacles.length;
}

async function readyArt(page) {
  await page.evaluate(async () => {
    const urls = [...new Set([...document.querySelectorAll('.studio-viewport svg image')].map(node => node.getAttribute('href')))];
    await Promise.all(urls.map(url => { const image = new Image(); image.src = url; return image.decode(); }));
  });
}

test('development map studio is a separate, keyboard-accessible review screen with no game session', async ({ page }) => {
  await page.goto('/__dev/maps'); await readyArt(page);
  await expect(page.locator('[data-dev-tool="regional-map-studio-v1"]')).toBeVisible();
  await expect(page.locator('.app')).toHaveCount(0);
  await expect(page.locator('.battle-arena')).toHaveCount(0);
  await expect(page.locator('.studio-viewport .monster')).toHaveCount(1);
  await expect(page.getByTestId('studio-preview-actors')).toBeVisible();
  await expect(page.locator('.studio-viewport .launcher')).toHaveCount(1);
  await expect(page.locator('.studio-viewport .player-cookie')).toHaveCount(1);
  await expect(page.locator('.studio-viewport')).toHaveAttribute('role', 'group');
  await expect(page.locator('.studio-viewport [data-scene-layer]')).toHaveCount(5);
  await expect(page.locator('.studio-viewport .scene-scenery [data-obstacle-id]')).toHaveCount(await expectedObstacleCount());
  await expect(page.locator('.studio-viewport [data-painted-panel]')).toHaveCount(0);
  await expect(page.locator('.studio-viewport')).toHaveAttribute('aria-label', /숲 지역 지도 미리보기/);
  expect(await page.evaluate(() => ({ test: window.__gameTest, storage: localStorage.length })))
    .toEqual({ test: undefined, storage: 0 });
});

test('forest round two preview and test play use identical elevated actors and supports', async ({ page }) => {
  await page.goto('/__dev/maps');
  await page.getByLabel('테스트 라운드').selectOption('2');
  const capture = async selector => page.locator(selector).evaluate(world => {
    const coords = node => [node.style.left, node.style.top, node.style.width, node.style.height];
    return {
      key: world.dataset.layoutKey,
      enemies: [...world.querySelectorAll('[data-enemy-id]')].map(node => [node.dataset.enemyId, ...coords(node)]),
      cookie: coords(world.querySelector('.player-cookie')),
      launcher: coords(world.querySelector('.launcher')),
      supports: [...world.querySelectorAll('[data-obstacle-id]')].map(node => [node.dataset.obstacleId, node.getAttribute('transform')])
    };
  });
  const preview = await capture('.studio-viewport > .arena-world');
  expect(preview.enemies.length).toBeGreaterThan(1);
  expect(preview.enemies.some(([, , y]) => Number.parseFloat(y) < Math.max(...preview.enemies.map(([, , top]) => Number.parseFloat(top))))).toBe(true);
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await expect(page.locator('.battle-arena')).toBeVisible();
  expect(await capture('.battle-arena > .arena-world')).toEqual(preview);
});

test('all four areas use their real painted layers and registered blocker placement', async ({ page }) => {
  await page.goto('/__dev/maps'); await readyArt(page);
  for (const [area, label] of [['forest', '숲 지역 지도 미리보기'], ['snow', '눈 지역 지도 미리보기'],
    ['city', '도시 지역 지도 미리보기'], ['chaos', '혼돈 지역 지도 미리보기']]) {
    await page.getByLabel('지역 선택').selectOption(area);
    const preview = page.locator('.studio-viewport');
    await expect(preview).toHaveAttribute('aria-label', new RegExp(label));
    await expect(preview.locator('[data-scene-area]')).toHaveCount(5);
    await expect(preview.locator('.scene-scenery [data-obstacle-id]')).toHaveCount(await expectedObstacleCount(area));
    if (area === 'forest') await expect(preview.locator('[data-painted-panel]')).toHaveCount(0);
    else await expect(preview.locator('[data-painted-panel]')).toHaveCount(8);
    if (area === 'city') {
      const frameMask = await preview.locator('.scene-midground > g[mask]').evaluate(node => {
        const id = node.getAttribute('mask').match(/#([^)]*)/)[1];
        return [...document.getElementById(id).querySelectorAll('rect')].map(rect => [
          +rect.getAttribute('x'), +rect.getAttribute('width')
        ]);
      });
      expect(frameMask).toEqual([[0, 3600], [0, 450], [450, 150], [3000, 150], [3150, 450]]);
    }
    await page.screenshot({ path: `tmp/map-studio-${area}-overview-1440.jpg` });
  }
});

test('layer toggles and environment pause only affect the review presentation', async ({ page }) => {
  await page.goto('/__dev/maps');
  const preview = page.locator('.studio-viewport');
  const route = preview.locator('[data-scene-layer="route"]');
  await expect(route).toBeVisible();
  await page.getByLabel('길').uncheck();
  await expect(route).toBeHidden();
  await page.getByLabel('길').check();
  await expect(route).toBeVisible();
  const pause = page.getByRole('button', { name: '환경 연출 일시 정지' });
  await pause.click();
  await expect(page.getByRole('button', { name: '환경 연출 재생' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '환경 연출 재생' }).click();
  await expect(page.locator('.scene-atmosphere--far .scene-mote').first()).toHaveCSS('animation-play-state', 'running');
  expect(await page.evaluate(() => ({ test: window.__gameTest, storage: localStorage.length }))).toEqual({ test: undefined, storage: 0 });
});

test('pan, wheel zoom, cursor anchor, reset and keyboard navigation use one studio camera', async ({ page }) => {
  await page.goto('/__dev/maps');
  const viewport = page.locator('.studio-viewport'), world = page.locator('.studio-viewport > .arena-world');
  await expect.poll(() => world.evaluate(node => node.style.transform)).not.toBe('');
  const beforePan = await world.evaluate(node => node.style.transform);
  const bounds = await viewport.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .55);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .52); await page.mouse.up();
  await expect.poll(() => world.evaluate(node => node.style.transform)).not.toBe(beforePan);

  const point = { x: bounds.width * .7, y: bounds.height * .3 };
  const worldPoint = () => viewport.evaluate((node, point) => {
    const worldNode = node.querySelector('.arena-world'), matrix = new DOMMatrix(getComputedStyle(worldNode).transform);
    const rect = node.getBoundingClientRect();
    return { x: (rect.left + point.x - rect.left - matrix.e) / matrix.a,
      y: (rect.top + point.y - rect.top - matrix.f) / matrix.d };
  }, point);
  const anchoredBefore = await worldPoint();
  await page.mouse.move(bounds.x + point.x, bounds.y + point.y);
  await page.mouse.wheel(0, -450);
  await expect.poll(() => page.getByLabel('확대 비율').inputValue()).not.toBe('1');
  const anchoredAfter = await worldPoint();
  expect(Math.abs(anchoredAfter.x - anchoredBefore.x)).toBeLessThan(2);
  expect(Math.abs(anchoredAfter.y - anchoredBefore.y)).toBeLessThan(2);

  await page.keyboard.press('Home');
  await expect(page.getByLabel('확대 비율')).toHaveValue('1');
  const reset = await world.evaluate(node => node.style.transform);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => world.evaluate(node => node.style.transform)).not.toBe(reset);
  await page.getByRole('button', { name: '전체 영역 보기' }).click();
  await expect(page.getByLabel('확대 비율')).toHaveValue('1');
});

test('region changes preserve review preferences, reset the camera, cancel capture and keep SVG ids unique', async ({ page }) => {
  await page.goto('/__dev/maps');
  const preview = page.locator('.studio-viewport');
  await page.locator('.studio-check input').nth(3).uncheck();
  const pause = page.locator('.studio-pause');
  await pause.click();
  await page.locator('.studio-zoom-buttons button').first().click();
  await expect(page.locator('input[type="range"]')).toHaveValue('1.3');
  const bounds = await preview.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect.poll(() => preview.evaluate(node => node.hasPointerCapture(1))).toBe(true);
  await page.locator('.studio-field select').selectOption('snow');
  await expect(page.locator('input[type="range"]')).toHaveValue('1');
  await expect(preview.locator('[data-scene-layer="route"]')).toBeHidden();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  expect(await preview.evaluate(node => node.hasPointerCapture(1))).toBe(false);
  await page.mouse.up();
  await page.locator('.studio-field select').selectOption('city');
  await page.locator('.studio-field select').selectOption('chaos');
  expect(await preview.evaluate(node => {
    const ids = [...node.querySelectorAll('[id]')].map(element => element.id);
    return ids.length === new Set(ids).size;
  })).toBe(true);
  expect(await page.evaluate(() => ({ test: window.__gameTest, storage: localStorage.length })))
    .toEqual({ test: undefined, storage: 0 });
  await page.goto('/__dev/maps/');
  await expect(page.locator('[data-dev-tool="regional-map-studio-v1"]')).toBeVisible();
});

for (const viewportSize of [{ width: 1440, height: 900 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
  test(`studio controls and preview remain visible without overflow at ${viewportSize.width}x${viewportSize.height}`, async ({ page }) => {
    await page.setViewportSize(viewportSize); await page.goto('/__dev/maps');
    await expect(page.locator('.studio-controls')).toBeVisible();
    await expect(page.locator('.studio-viewport')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewportSize.width);
    await page.screenshot({ path: `tmp/map-studio-forest-${viewportSize.width}x${viewportSize.height}.jpg` });
  });
}
