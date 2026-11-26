const { test, expect, installGame, start } = require('./support.cjs');

for (const [area, round, count, flyers] of [['snow', 1, 3, 0], ['snow', 2, 4, 0], ['city', 1, 5, 1], ['city', 2, 6, 2]]) {
  test(`${area} round ${round} uses the new roster and movement`, async ({ page }) => {
    await installGame(page, { initial: { area, round } }); await start(page);
    await expect(page.locator('.monster')).toHaveCount(count);
    await expect(page.locator('.monster--crow')).toHaveCount(flyers);
    if (area === 'snow' && round === 1) {
      const moving = page.locator('.monster[data-movement="slide"]');
      await expect(moving).toHaveCount(1);
      const x = await moving.evaluate(node => node.style.left);
      await expect.poll(() => moving.evaluate(node => node.style.left)).not.toBe(x);
    }
    if (flyers === 2) {
      const y = await page.locator('.monster--crow').evaluateAll(nodes => nodes.map(node => node.style.top));
      expect(new Set(y).size).toBe(2);
    }
  });
}
