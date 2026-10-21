const { test, expect, installGame, start, phase } = require('./support.cjs');

test('the selected one of five cookies stands as a single correctly loaded player beside the slingshot', async ({ page }) => {
  await installGame(page);
  await page.addInitScript(() => localStorage.setItem('cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })));
  for (const [id, name, assetName] of [
    ['adventurer', '모험가맛 쿠키', 'Adventurer'],
    ['alchemist', '연금술사맛 쿠키', 'Alchemist'],
    ['wizard', '마법사맛 쿠키', 'Wizard'],
    ['milk', '우유맛 쿠키', 'Milk'],
    ['wind', '바람궁수 쿠키', 'Wind Archer']
  ]) {
    await start(page, name);
    const actor = page.getByTestId('player-cookie');
    await expect(actor).toHaveCount(1);
    await expect(actor).toHaveAttribute('data-character-id', id);
    await expect(actor).toHaveAttribute('data-player-pose', 'idle');
    await expect(page.getByRole('img', { name: `${name}, 대기`, exact: true })).toHaveCount(1);
    await expect(actor.locator('img')).toHaveJSProperty('naturalWidth', id === 'milk' ? 248 : 312);
    await expect(actor.locator('img')).toHaveAttribute('src', new RegExp(`${assetName.replace(' ', '(?:%20| )')}.*\\.png`, 'i'));
    await expect(page.locator('.launcher')).toBeVisible();
    await page.screenshot({ path: `tmp/wide-t04-player-${id}-forest-idle-1440.jpg` });
    await page.goto('/');
  }
});

test('a real heal item lights the selected cookie while the enemy attack is in flight', async ({ page }) => {
  await installGame(page, { initial: { inventory: { fireball: 0, spear: 0, defense: 0, heal: 1 }, playerHp: 70 } });
  await start(page);
  await page.keyboard.press('4');
  await expect(page.getByTestId('enemy-attack')).toBeVisible();
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-player-pose', 'healing');
  await expect(page.getByTestId('player-cookie')).toContainText('✦ ＋ ✦');
  await expect(page.locator('.launcher')).not.toHaveClass(/is-healing|is-hit|has-shield/);
  await page.screenshot({ path: 'tmp/wide-t04-player-adventurer-forest-healing-1440.jpg' });
  await phase(page, 'idle');
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-player-pose', /hurt|idle/);
});
