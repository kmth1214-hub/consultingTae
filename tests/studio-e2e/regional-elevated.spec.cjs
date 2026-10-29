const { test, expect, installGame } = require('../e2e/support.cjs');

for (const [area, round, expected] of [['snow', 2, 1], ['city', 2, 1],
  ['chaos', 1, null], ['chaos', 2, null]])
  test(`${area} round ${round} studio preview and play share supported enemies`, async ({ page }) => {
    await installGame(page, { layoutSeed: 0 });
    await page.goto('/__dev/maps');
    await page.getByLabel('지역 선택').selectOption(area);
    await page.getByLabel('테스트 라운드').selectOption(String(round));
    const preview = page.locator('.studio-viewport');
    const supportCount = await preview.locator('[data-supports-enemy]').count();
    if (area === 'chaos') expect([2, 3]).toContain(supportCount);
    else expect(supportCount).toBe(expected);
    const before = await preview.locator('.monster').evaluateAll(nodes => nodes.map(node => ({
      id: node.dataset.enemyId, x: node.style.left, y: node.style.top
    })));
    expect(before.filter(item => Number.parseFloat(item.y) < 900)).toHaveLength(supportCount);
    await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
    await expect(page.locator('[data-dev-tool="studio-battle-play"]')).toBeVisible();
    await expect(page.locator('.battle-arena [data-supports-enemy]')).toHaveCount(supportCount);
    const after = await page.locator('.battle-arena .monster').evaluateAll(nodes => nodes.map(node => ({
      id: node.dataset.enemyId, x: node.style.left, y: node.style.top
    })));
    expect(after).toEqual(before);
  });
