const { test, expect, installGame, start, arena, phase, dragPull, snapshot } = require('./support.cjs');

async function readyArt(page) {
  await page.evaluate(async () => {
    const sources = [...new Set([...document.querySelectorAll('svg image')].map(node => node.getAttribute('href')))];
    await Promise.all(sources.map(src => { const image = new Image(); image.src = src; return image.decode(); }));
  });
}

for (const area of ['forest', 'snow', 'city', 'chaos']) {
  test(`${area} shows two wind bands behind the projectiles and monsters`, async ({ page }) => {
    await installGame(page, { initial: { area, round: 1 } });
    await start(page);
    await expect(page.locator(`.wind-weather[data-weather-area="${area}"] [data-wind-zone]`)).toHaveCount(2);
    expect(await page.locator('.wind-weather').evaluate(node =>
      +getComputedStyle(node).zIndex)).toBeLessThan(6);
  });
  test(`${area} has proportional independent depth layers and visible original art through aim/flight/response`, async ({ page }) => {
    await installGame(page, { initial: { area, round: 1 } });
    await start(page); await readyArt(page);
    const layers = await page.locator('[data-scene-layer]').evaluateAll(nodes => nodes.map(node => {
      const matrix = node.getScreenCTM();
      return { name: node.dataset.sceneLayer, area: node.dataset.sceneArea, parent: node.parentElement.className,
        z: +getComputedStyle(node).zIndex, scaleX: matrix.a, scaleY: matrix.d, filter: getComputedStyle(node).filter };
    }));
    expect(layers.map(l => l.name)).toEqual(['sky', 'distant', 'midground', 'route', 'foreground']);
    expect(layers.every(l => l.area === area && l.parent === 'arena-world' && l.filter === 'none')).toBe(true);
    for (const l of layers) { expect(l.scaleX).toBeCloseTo(l.scaleY, 5); expect(l.scaleX).toBeCloseTo(layers[0].scaleX, 5); }
    expect(layers.map(l => l.z)).toEqual([0, 0, 1, 2, 5]);
    if (area === 'forest') {
      await expect(page.locator('.scene-midground > g[clip-path]')).toHaveCount(0);
    } else {
      const midgroundClip = await page.locator('.scene-midground > g[clip-path]').evaluate(node => {
        const id = node.getAttribute('clip-path').match(/#([^)]*)/)[1];
        return [...document.getElementById(id).querySelectorAll('rect')].map(rect => ({
          x: +rect.getAttribute('x'), y: +rect.getAttribute('y'),
          width: +rect.getAttribute('width'), height: +rect.getAttribute('height')
        }));
      });
      expect(midgroundClip).toEqual([{ x: -600, y: -500, width: 4800, height: 1320 }]);
    }
    if (area === 'city') {
      const frameMask = await page.locator('.scene-midground > g[mask]').evaluate(node => {
        const id = node.getAttribute('mask').match(/#([^)]*)/)[1];
        const mask = document.getElementById(id);
        const rects = [...mask.querySelectorAll('rect')].map(rect => [
          +rect.getAttribute('x'), +rect.getAttribute('width')
        ]);
        const fades = [...mask.querySelectorAll('rect[fill^="url("]')].map(rect => rect.getAttribute('fill'));
        return { rects, fades: fades.length };
      });
      expect(frameMask.rects).toEqual([[0, 3600], [0, 450], [450, 150], [3000, 150], [3150, 450]]);
      expect(frameMask.fades).toBe(2);
    } else {
      await expect(page.locator('.scene-midground > g[mask]')).toHaveCount(0);
    }
    const proportions = await page.locator('.battlefield-layer [data-source-patch] svg, .battlefield-layer [data-painted-panel] svg').evaluateAll(nodes => nodes.map(node => {
      const vb = node.viewBox.baseVal;
      return { actual: node.width.baseVal.value / node.height.baseVal.value, source: vb.width / vb.height };
    }));
    expect(proportions.length).toBeGreaterThan(2);
    for (const p of proportions) expect(p.actual).toBeCloseTo(p.source, 4);
    const distantPositions = area === 'forest'
      ? await page.locator('.scene-distant [data-depth-plane="distant"] > svg').evaluateAll(nodes => nodes.map(node => +node.getAttribute('y')))
      : await page.locator('.scene-distant [data-painted-panel="distant"] svg').evaluateAll(nodes => nodes.map(node => +node.getAttribute('y')));
    expect(distantPositions.length).toBeGreaterThan(0);
    expect(new Set(distantPositions)).toEqual(new Set([area === 'forest' ? -600 : area === 'city' ? -670 : -530]));
    const props = await page.locator('.scene-scenery [data-obstacle-id]').evaluateAll(nodes => nodes.map(n => n.dataset.obstacleId));
    expect(props.length).toBeGreaterThanOrEqual(2);
    expect(props.length).toBeLessThanOrEqual(4);
    // Loaded images can still be entirely hidden by a broken mask. Compare real
    // browser pixels with/without the source-art paint, not just image node counts.
    const painted = await arena(page).screenshot();
    await page.locator('.battlefield-layer image').evaluateAll(nodes => nodes.forEach(n => n.style.visibility = 'hidden'));
    const withoutArt = await arena(page).screenshot();
    await page.locator('.battlefield-layer image').evaluateAll(nodes => nodes.forEach(n => n.style.visibility = ''));
    const artContribution = await page.evaluate(async ({ a, b }) => {
      const load = async data => { const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode(); return image; };
      const [one, two] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement('canvas'); canvas.width = one.width; canvas.height = one.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(one, 0, 0); const before = ctx.getImageData(0, 0, one.width, one.height).data;
      ctx.drawImage(two, 0, 0); const after = ctx.getImageData(0, 0, one.width, one.height).data;
      let changed = 0;
      for (let i = 0; i < before.length; i += 4) if (Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]) > 30) changed++;
      return changed / (one.width * one.height);
    }, { a: painted.toString('base64'), b: withoutArt.toString('base64') });
    expect(artContribution, 'original art must visibly contribute to the scene').toBeGreaterThan(.04);
    await page.screenshot({ path: `tmp/wide-t03-${area}-overview-1440.jpg` });
    await dragPull(page);
    await expect(arena(page)).toHaveAttribute('data-camera-mode', 'aim');
    await expect(page.getByTestId('trajectory-preview')).toBeVisible();
    await page.screenshot({ path: `tmp/wide-t03-${area}-strong-1440.jpg` });
    await page.mouse.up(); await phase(page, 'launching');
    await page.screenshot({ path: `tmp/wide-t03-${area}-flight-1440.jpg` });
    await phase(page, 'responding');
    await page.screenshot({ path: `tmp/wide-t03-${area}-response-1440.jpg` });
    await phase(page, 'idle');
    expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
    expect(await page.locator('.scene-scenery [data-obstacle-id]').evaluateAll(nodes => nodes.map(n => n.dataset.obstacleId))).toEqual(props);
    expect(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
      return ids.length === new Set(ids).size;
    })).toBe(true);
  });
}

for (const area of ['forest', 'snow', 'city', 'chaos']) {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    test(`${area} sky blends into distant artwork at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await installGame(page, { initial: { area, round: 1 } });
      await start(page); await readyArt(page);
      const screenshot = await arena(page).screenshot();
      const arenaBox = await arena(page).boundingBox();
      const distantSelector = area === 'forest'
        ? '.scene-distant [data-depth-plane="distant"] > svg'
        : '.scene-distant [data-painted-panel="distant"] svg';
      const distantBox = await page.locator(distantSelector).first().boundingBox();
      const edgeRatio = (distantBox.y - arenaBox.y) / arenaBox.height;
      const samples = await page.evaluate(async ({ base64, edgeRatio }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const x = Math.floor(canvas.width * .5);
        return [.002, Math.max(.003, edgeRatio - .01), Math.max(.002, edgeRatio - .01), edgeRatio + .01].map(ratio => {
          const y = Math.floor(canvas.height * ratio);
          const patch = context.getImageData(Math.max(0, x - 2), Math.max(0, y - 2), 5, 5).data;
          return [0, 1, 2].map(channel => {
            let total = 0;
            for (let pixel = channel; pixel < patch.length; pixel += 4) total += patch[pixel];
            return total / 25;
          });
        });
      }, { base64: screenshot.toString('base64'), edgeRatio });
      const topColorDistance = samples[0].reduce((sum, channel, index) => sum + Math.abs(channel - samples[1][index]), 0);
      const seamColorDistance = samples[2].reduce((sum, channel, index) => sum + Math.abs(channel - samples[3][index]), 0);
      if (area === 'city' && width === 1440) expect(topColorDistance, `${area} raised distant artwork should blend into the upper sky`).toBeLessThan(30);
      else if (area !== 'forest' && width === 1440) expect(topColorDistance, `${area} upper sky should retain its established color transition`).toBeGreaterThan(10);
      // The forest source painting has a cloud edge at this pixel; its local color variation is visible but not a hard seam.
      // Allow one summed RGB level for OS rasterization of these 5x5 averages.
      const seamRoundingTolerance = 1;
      if (edgeRatio > 0 && edgeRatio < 1) expect(seamColorDistance, `${area} visible sky seam should blend with the distant artwork`)
        .toBeLessThan((area === 'forest' ? 50 : 30) + seamRoundingTolerance);
    });
  }
}

for (const [width, height, area, reduced] of [[2007, 1037, 'forest', false], [2560, 1080, 'city', false],
  [844, 390, 'snow', false], [390, 844, 'forest', false], [390, 844, 'snow', true],
  [390, 844, 'city', false], [390, 844, 'chaos', true]]) {
  test(`${area} illustrated layers and full pull envelope stay readable at ${width}x${height}${reduced ? ' reduced' : ''}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
    await installGame(page, { initial: { area, round: 1 } });
    await start(page); await readyArt(page);
    await page.screenshot({ path: `tmp/wide-t03-${area}-overview-${width}${reduced ? '-reduced' : ''}.jpg` });
    let origin;
    for (const [name, angleDeg, powerRatio] of [['weak', 25, .15], ['vertical', 90, .7], ['reverse', 180, 1], ['strong', 25, .8]]) {
      if (!origin) origin = await dragPull(page, { angleDeg, powerRatio });
      else await dragPull(page, { origin, angleDeg, powerRatio });
      const pouch = await page.locator('.slingshot-pouch').boundingBox(), meter = await page.locator('.power-meter').boundingBox();
      if (name === 'reverse') expect(pouch.x + pouch.width).toBeLessThan(meter.x);
      await expect(page.getByTestId('trajectory-preview')).toHaveCount(1);
      if (name === 'strong') await expect(page.getByTestId('trajectory-preview')).toBeVisible();
      await page.screenshot({ path: `tmp/wide-t03-${area}-${name}-${width}${reduced ? '-reduced' : ''}.jpg` });
    }
    await page.keyboard.press('Escape'); await page.mouse.up(); await phase(page, 'idle');
    expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (reduced) await expect(arena(page)).toHaveAttribute('data-camera-mode', 'overview');
  });
}

test('contact spark expires while the physically moving stack keeps its registered identity', async ({ page }) => {
  await installGame(page); await start(page); await readyArt(page);
  const before = await page.locator('.scene-scenery [data-obstacle-id]').evaluateAll(nodes => nodes.map(n => n.dataset.obstacleId));
  const options = await require('./support.cjs').stackShot({ physical: false });
  await dragPull(page, options); await page.mouse.up();
  const id = options.shot.contacts[0].obstacleId;
  const effect = page.locator(`[data-testid="contact-effect"][data-obstacle-impact="${id}"]`);
  // Default locator polling can skip an entire 420ms visual. Observe at frame
  // cadence from release, without extending the production effect for the test.
  await expect.poll(() => effect.isVisible(), { intervals: [16], timeout: 3000 }).toBe(true);
  await expect(effect).toHaveAttribute('data-obstacle-impact', id);
  await page.screenshot({ path: 'tmp/wide-t03-forest-obstacle-1440.jpg' });
  await expect(effect).toHaveCount(0);
  await phase(page, 'idle');
  expect(await page.locator('.scene-scenery [data-obstacle-id]').evaluateAll(nodes => nodes.map(n => n.dataset.obstacleId))).toEqual(before);
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('reverse maximum draw clears the meter and release springs an empty pouch back to rest', async ({ page }) => {
  await installGame(page); await start(page);
  await dragPull(page, { angleDeg: 180, powerRatio: 1 });
  const pouch = await page.locator('.slingshot-pouch').boundingBox(), meter = await page.locator('.power-meter').boundingBox();
  expect(pouch.x + pouch.width).toBeLessThan(meter.x);
  await page.screenshot({ path: 'tmp/wide-t03-forest-reverse-1440.jpg' });
  await page.mouse.up(); await phase(page, 'launching');
  await expect(page.locator('.sling-loaded-candy')).toHaveCount(0);
  await expect.poll(async () => page.locator('.slingshot-pouch').getAttribute('transform')).toBe('translate(64 54)');
  await phase(page, 'idle');
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});
