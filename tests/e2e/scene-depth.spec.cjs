const { test, expect, installGame, arena, phase, start, dragPull, snapshot } = require('./support.cjs');

async function readyImages(page) {
  await page.evaluate(async () => {
    const urls = [...new Set([...document.querySelectorAll('svg image')].map(node => node.getAttribute('href')))];
    await Promise.all(urls.map(url => { const image = new Image(); image.src = url; return image.decode(); }));
  });
}

for (const area of ['forest', 'snow', 'city', 'chaos']) {
  test(`${area} uses independent painted panel layers, a read-only minimap and canonical gameplay geometry`, async ({ page }) => {
    await installGame(page, { initial: { area, round: 1 } });
    await start(page); await readyImages(page);
    const layers = page.locator('.arena-world > [data-scene-layer]');
    await expect(layers).toHaveCount(5);
    expect(await layers.evaluateAll((nodes, expectedArea) => nodes.every(node => node.dataset.sceneArea === expectedArea), area)).toBe(true);
    const actual = await layers.evaluateAll(nodes => nodes.map(node => {
      const outer = node.getScreenCTM(), depth = node.querySelector('[data-depth-plane]').getScreenCTM();
      return { name: node.dataset.sceneLayer, outer: [outer.a, outer.d, outer.e, outer.f], depth: [depth.a, depth.d, depth.e, depth.f] };
    }));
    expect(actual.map(row => row.name)).toEqual(['sky', 'distant', 'midground', 'route', 'foreground']);
    for (const row of actual.slice(1)) expect(row.outer).toEqual(actual[0].outer);
    expect(await page.locator('[data-painted-panel]').count()).toBe(area === 'forest' ? 0 : 8);
    const minimap = page.locator('.battlefield-minimap');
    await expect(minimap).toBeVisible();
    await expect(minimap).toHaveAttribute('aria-label', /전장 미니맵/);
    await expect(minimap.locator('.minimap-player')).toHaveCount(1);
    await expect(minimap.locator('.minimap-obstacle')).toHaveCount(3);
    await expect(minimap.locator('.minimap-enemy')).toHaveCount(await page.locator('.monster[data-enemy-id]').count());
    await expect(minimap.locator('[data-testid="trajectory-preview"]')).toHaveCount(0);
    const overviewWindow = await arena(page).evaluate(el => getComputedStyle(el).getPropertyValue('--minimap-camera-width').trim());
    await dragPull(page, { angleDeg: 36, powerRatio: .7 });
    await phase(page, 'dragging');
    await expect.poll(() => arena(page).evaluate(el => getComputedStyle(el).getPropertyValue('--minimap-camera-width').trim()))
      .not.toBe(overviewWindow);
    const routeDepth = actual.find(row => row.name === 'route');
    expect(routeDepth.depth).toEqual(routeDepth.outer);
    await expect(page.getByTestId('trajectory-preview')).toBeVisible();
    expect(await snapshot(page)).toBeTruthy();
    await page.keyboard.press('Escape'); await page.mouse.up(); await phase(page, 'idle');
  });
}

test('minimap monsters stay readable at desktop and narrow viewport sizes', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 1 } });
  await start(page);
  const marker = page.locator('.battlefield-minimap .minimap-enemy').first();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await marker.boundingBox();
    expect(bounds, `missing monster marker at ${width}px viewport`).not.toBeNull();
    expect(bounds.width, `monster marker too small at ${width}px viewport`).toBeGreaterThanOrEqual(14);
    expect(bounds.height, `monster marker too small at ${width}px viewport`).toBeGreaterThanOrEqual(14);
  }
});

test('decorative atmosphere pauses for reduced motion and window focus lifecycle events', async ({ page }) => {
  await installGame(page, { initial: { area: 'snow', round: 1 } }); await start(page);
  const atmosphere = page.locator('.scene-atmosphere--far');
  await expect(atmosphere).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect.poll(() => atmosphere.evaluate(node => {
    const mote = node.querySelector('.scene-mote');
    return mote ? getComputedStyle(mote).display : 'none';
  })).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => atmosphere.evaluate(node => node.querySelector('.scene-mote') && getComputedStyle(node.querySelector('.scene-mote')).animationPlayState)).toBe('paused');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => atmosphere.evaluate(node => node.querySelector('.scene-mote') && getComputedStyle(node.querySelector('.scene-mote')).animationPlayState)).toBe('running');
});
