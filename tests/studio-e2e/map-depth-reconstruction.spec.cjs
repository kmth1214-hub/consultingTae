const { test, expect, installGame, phase, snapshot, dragPull } = require('../e2e/support.cjs');

async function paintedScene(root) {
  return root.evaluate(node => ({
    key: node.dataset.layoutKey,
    panels: [...node.querySelectorAll('[data-studio-painted-panel]')].map(group => {
      const image = group.querySelector('image'), panel = group.querySelector('svg');
      return { role: group.dataset.studioPaintedPanel, side: group.dataset.panelSide,
        href: image.getAttribute('href'), x: panel.getAttribute('x'), y: panel.getAttribute('y'),
        width: panel.getAttribute('width'), height: panel.getAttribute('height') };
    }),
    cookie: node.querySelector('.player-cookie')?.getAttribute('style'),
    launcher: node.querySelector('.launcher')?.getAttribute('style'),
    obstacles: [...node.querySelectorAll('.scene-scenery [data-obstacle-id]')]
      .map(obstacle => [obstacle.dataset.obstacleId, obstacle.getAttribute('transform')])
  }));
}

for (const area of ['forest', 'snow', 'city', 'chaos']) {
  test(`${area} rebuilt map uses the same panels and contacts in preview and studio play`, async ({ page }) => {
    await page.goto('/__dev/maps');
    await page.getByLabel('지역 선택').selectOption(area);
    const preview = page.locator('.studio-viewport > .arena-world');
    await expect(preview).toHaveAttribute('data-studio-scene', 'rebuilt');
    await expect(preview.locator('[data-studio-painted-panel]')).toHaveCount(6);
    const before = await paintedScene(preview);
    expect(before.panels.map(panel => `${panel.role}-${panel.side}`)).toEqual([
      'midground-west', 'midground-east', 'path-west', 'path-east', 'foreground-west', 'foreground-east'
    ]);
    expect(before.panels.every(panel => panel.href.endsWith('.png') && panel.y === '-450'
      && panel.width === '2700' && panel.height === '1800')).toBe(true);
    await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
    await phase(page, 'idle');
    const battle = page.locator('.battle-arena');
    await expect(battle).toHaveAttribute('data-studio-scene', 'rebuilt');
    const world = battle.locator('> .arena-world');
    await expect(world.locator('[data-studio-painted-panel]')).toHaveCount(6);
    expect(await paintedScene(world)).toEqual(before);
    await expect(world.locator('[data-depth-part="contact-shadows"]')).toHaveCount(1);
    await expect(world.locator('[data-depth-part="road-top"]')).toHaveCount(0);
    await page.getByRole('button', { name: /입체감 켜짐/ }).click();
    await expect(battle).toHaveAttribute('data-studio-scene', 'original');
    await expect(world.locator('[data-studio-painted-panel]')).toHaveCount(0);
    await page.getByRole('button', { name: '지도 검토로 돌아가기' }).click();
    await expect(preview).toHaveAttribute('data-studio-scene', 'original');
    await expect(page.getByRole('button', { name: '입체 맵 보기' })).toHaveAttribute('aria-pressed', 'false');
  });
}

test('studio scene comparison preserves the live battle and the choice through restart', async ({ page }) => {
  await installGame(page);
  await page.goto('/__dev/maps');
  await page.getByRole('button', { name: '원본 맵 보기' }).click();
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await phase(page, 'idle');
  const battle = page.locator('.battle-arena');
  await expect(battle).toHaveAttribute('data-studio-scene', 'original');
  const before = await snapshot(page);
  const layoutKey = await battle.locator('> .arena-world').getAttribute('data-layout-key');
  const pose = await battle.locator('> .arena-world').evaluate(node => node.style.transform);
  await page.getByRole('button', { name: /입체감 꺼짐/ }).click();
  await expect(battle).toHaveAttribute('data-studio-scene', 'rebuilt');
  expect((await snapshot(page)).run).toEqual(before.run);
  expect(await battle.locator('> .arena-world').getAttribute('data-layout-key')).toBe(layoutKey);
  expect(await battle.locator('> .arena-world').evaluate(node => node.style.transform)).toBe(pose);
  await dragPull(page, { angleDeg: -5, powerRatio: .08 }); await page.mouse.up();
  await phase(page, 'idle');
  const afterShot = await snapshot(page);
  expect(afterShot.run.ammo).toBe(before.run.ammo - 1);
  await page.getByRole('button', { name: /입체감 켜짐/ }).click();
  await expect(battle).toHaveAttribute('data-studio-scene', 'original');
  expect((await snapshot(page)).run).toEqual(afterShot.run);
  await page.getByRole('button', { name: '다시 시작', exact: true }).click();
  await phase(page, 'idle');
  await expect(page.locator('.battle-arena')).toHaveAttribute('data-studio-scene', 'original');
});

test('reduced motion phone play keeps the rebuilt terrain and reachable controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('chaos');
  await page.getByRole('button', { name: '테스트 플레이', exact: true }).click();
  await phase(page, 'idle');
  await expect(page.locator('.battle-arena')).toHaveAttribute('data-studio-scene', 'rebuilt');
  await expect(page.locator('.battle-arena [data-studio-painted-panel]')).toHaveCount(6);
  await expect(page.locator('.battle-arena [data-depth-part="contact-shadows"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: /입체감 켜짐/ }).click();
  await expect(page.locator('.battle-arena')).toHaveAttribute('data-studio-scene', 'original');
});
