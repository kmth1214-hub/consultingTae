const { test, expect, installGame, start, phase, snapshot, dragPull } = require('./support.cjs');

test('public Forest round two shows one rider on a log above the ground enemy', async ({ page }) => {
  await installGame(page, { initial: { round: 2 }, layoutSeed: 0 });
  await start(page);
  const { run } = await snapshot(page);
  expect(run.battlefieldPrototype).toBe('forest-elevated-v1');
  expect(run.studioPrototype).toBeUndefined();
  const support = page.locator('[data-obstacle-id="forest-2-support-0"]');
  await expect(support).toBeVisible();
  await expect(page.locator('.monster[data-enemy-id]')).toHaveCount(2);
  const heights = await page.locator('.monster[data-enemy-id]').evaluateAll(nodes => nodes.map(node => Number.parseFloat(node.style.top)));
  expect(heights.filter(y => y < 900)).toHaveLength(1);
  expect(heights.filter(y => y === 900)).toHaveLength(1);
  await expect(page.locator('.minimap-enemy')).toHaveCount(2);
  await expect(page.locator('.battle-bgm-controls'))
    .toHaveCount(process.env.VITE_ENABLE_BGM === 'true' ? 1 : 0);
  await dragPull(page, { angleDeg: 40, powerRatio: .5 });
  await expect(page.getByTestId('trajectory-preview')).toBeVisible();
  await page.mouse.up();
  await phase(page, 'idle');
});

for (const round of [1, 3]) {
  test(`public Forest round ${round} keeps its enemy on the ground`, async ({ page }) => {
    await installGame(page, { initial: { round }, layoutSeed: 0 });
    await start(page);
    await expect(page.locator('[data-obstacle-id="forest-2-support-0"]')).toHaveCount(0);
    const heights = await page.locator('.monster[data-enemy-id]').evaluateAll(nodes => nodes.map(node => Number.parseFloat(node.style.top)));
    expect(heights.every(y => y === 900)).toBe(true);
  });
}
