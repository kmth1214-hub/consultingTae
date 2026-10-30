const { test, expect, installGame, start, arena, dragPull, phase, snapshot } = require('./support.cjs');

test('city crows patrol in air, dive on counterattack and return without duplicate damage', async ({ page }) => {
  test.setTimeout(45000);
  await installGame(page, { initial: { area: 'city', round: 1 },
    stateOverride: { enemyTurnIndex: 3 } });
  await start(page);
  const birds = arena(page).locator('.monster--crow');
  await expect(birds).toHaveCount(2);
  await expect(birds.first().locator('img')).toHaveJSProperty('naturalWidth', 1536);
  const originalX = await birds.first().evaluate(node => Number.parseFloat(node.style.left));
  await expect.poll(() => birds.first().evaluate(node => Number.parseFloat(node.style.left)))
    .not.toBe(originalX);

  const before = (await snapshot(page)).run.playerHp;
  await dragPull(page, { angleDeg: -5, powerRatio: .08 });
  await page.mouse.up();
  const attacking = arena(page).locator('.monster--crow.is-attacking');
  await expect(attacking).toHaveCount(1, { timeout: 12000 });
  await expect(attacking).toHaveAttribute('data-attack-phase', 'travel');
  await expect(attacking.locator('.monster-body')).toHaveCSS('animation-name', 'crow-dive');
  await phase(page, 'idle');
  const after = (await snapshot(page)).run;
  const response = (await snapshot(page)).lastEvent.enemyAttack;
  expect(response.kind).toBe('clockwork-crow');
  expect(before - after.playerHp).toBe(response.damage);
  await expect(arena(page).locator('.monster--crow.is-attacking')).toHaveCount(0);
});
