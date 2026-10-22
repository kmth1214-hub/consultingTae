const { test, expect, installGame, start, hp, ammo, phase, arena, snapshot } = require('./support.cjs');

const inventory = { fireball: 1, spear: 1, defense: 1, heal: 3 };

test('shield intercepts a visible incoming attack from the actual enemy without losing HP', async ({ page }) => {
  await installGame(page, { initial: { inventory } });
  await start(page);
  await page.getByRole('button', { name: '방어 사용', exact: true }).click();
  const trace = await snapshot(page);
  expect(trace.lastEvent.enemyAttack.blockedBy).toBe('defense');
  expect(trace.run.playerHp).toBe(100);
  const attack = page.getByTestId('enemy-attack');
  await expect(attack).toBeVisible();
  await expect(attack).toHaveAttribute('data-attacker-id', trace.lastEvent.enemyAttack.enemyId);
  await expect(page.locator('.monster.is-attacking')).toHaveCount(1);
  await expect(attack).toHaveAttribute('data-stage', 'impact');
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-character-id', 'adventurer');
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-player-pose', 'blocked');
  await expect(page.getByTestId('player-shield')).toBeVisible();
  await expect(page.getByTestId('player-cookie').locator('img')).toHaveJSProperty('naturalWidth', 312);
  await expect(hp(page)).toHaveText('100');
  await page.screenshot({ path: 'tmp/wide-t04-player-adventurer-forest-blocked-1440.jpg' });
  await phase(page, 'idle');
  await expect(page.getByTestId('player-cookie')).not.toHaveClass(/player-cookie--blocked/);
  await expect(page.getByTestId('player-shield')).toHaveCount(0);
  await expect(attack).toHaveCount(0);
  // A consumed shield must not accidentally protect the following enemy turn.
  await page.keyboard.press('1');
  const second = await snapshot(page);
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage', 'impact');
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-player-pose', 'hurt');
  await expect(page.getByTestId('player-impact')).toBeVisible();
  await expect(page.getByTestId('player-hit-feedback')).toBeVisible();
  await expect(hp(page)).toHaveText('95');
  await phase(page, 'idle');
  expect((await snapshot(page)).run.playerHp).toBe(95);
});

test('enemy projectile travels from its attacker and HP changes at impact; map and item input cannot overlap it', async ({ page }) => {
  await installGame(page, { initial: { inventory } });
  await start(page);
  await page.evaluate(() => {
    window.__projectileMotion = { first: null, last: null, changes: 0 };
    new MutationObserver(records => {
      for (const record of records) {
        if (record.target.matches?.('[data-testid="enemy-projectile"]')) {
          const value = record.target.getAttribute('transform');
          window.__projectileMotion.first ??= value;
          window.__projectileMotion.last = value;
          window.__projectileMotion.changes++;
        }
      }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['transform'] });
  });
  await page.keyboard.press('1');
  const before = await snapshot(page);
  const attack = page.getByTestId('enemy-attack');
  const projectile = page.getByTestId('enemy-projectile');
  const trail = page.getByTestId('enemy-projectile-trail');
  await expect(attack).toHaveAttribute('data-stage', 'windup');
  await expect(trail).toHaveCount(1);
  await expect(trail).toHaveCSS('visibility', 'hidden');
  await expect(hp(page)).toHaveText('100');
  expect(before.run.playerHp).toBe(95);
  await expect(page.getByRole('button', { name: '방어 사용', exact: true })).toBeDisabled();
  // Exercise blocked inputs during the windup, before the hit can resolve.
  await page.keyboard.press('3');
  const box = await arena(page).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(projectile).toBeVisible();
  await expect(attack).toHaveAttribute('data-stage', 'travel');
  await expect(trail).toHaveCSS('visibility', 'visible');
  const coordinates = (await trail.getAttribute('d')).match(/M(-?[\d.]+) (-?[\d.]+) Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
  const [sourceX, sourceY, controlX, controlY, targetX, targetY] = coordinates;
  expect(sourceX).toBeGreaterThan(targetX);
  expect(controlX).toBeCloseTo((sourceX + targetX) / 2, 5);
  expect(controlY).toBeCloseTo((sourceY + targetY) / 2 - 150, 5);
  await expect.poll(() => page.evaluate(() => window.__projectileMotion.changes)).toBeGreaterThan(2);
  const motion = await page.evaluate(() => window.__projectileMotion);
  expect(motion.last).not.toBe(motion.first);
  await expect(hp(page)).toHaveText('95');
  await phase(page, 'idle');
  const after = await snapshot(page);
  expect(after.run).toEqual(before.run);
  expect(after.events.filter(event => event.name === 'useConsumable')).toHaveLength(1);
  await expect(page.getByText('적이 공격하고 있어요. 반격이 끝나면 행동할 수 있어요.', { exact: true })).toHaveCount(0);
});

for (const [area, special] of [['forest', 'boar-charge'], ['snow', 'frozen-breath'], ['city', 'oven-overheat']]) {
  for (const blocked of [false, true]) {
    test(`${area} boss third response visibly ${blocked ? 'hits the shield and suppresses' : 'executes'} ${special}`, async ({ page }) => {
      await installGame(page, { initial: { area, round: 3, inventory } });
      await start(page);
      for (let turn = 0; turn < 2; turn++) {
        await page.keyboard.press('4');
        await phase(page, 'idle');
        expect((await snapshot(page)).lastEvent.enemyAttack.attemptedSpecial).toBe(null);
      }
      await page.keyboard.press(blocked ? '3' : '4');
      const trace = await snapshot(page);
      const event = trace.lastEvent.enemyAttack;
      expect(event.attemptedSpecial).toBe(special);
      expect(event.special).toBe(blocked ? null : special);
      expect(event.blocked).toBe(blocked);
      await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-special', special);
      if (special === 'frozen-breath') {
        const attackLayer = page.getByTestId('enemy-attack');
        const trail = page.getByTestId('enemy-projectile-trail');
        await expect(attackLayer).toHaveAttribute('data-stage', 'travel');
        await expect(trail).toHaveCSS('visibility', 'visible');
        const [, sourceY, , controlY, , targetY] = (await trail.getAttribute('d'))
          .match(/M(-?[\d.]+) (-?[\d.]+) Q(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/).slice(1).map(Number);
        expect(controlY).toBeCloseTo((sourceY + targetY) / 2, 5);
      }
      if (area === 'forest') {
        const body = page.locator('.monster.is-attacking .monster-body');
        await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage', 'travel');
        const startX = (await body.boundingBox()).x;
        await expect.poll(async () => (await body.boundingBox()).x, { intervals: [16] }).toBeLessThan(startX - 40);
      }
      await expect(page.getByTestId(blocked ? 'shield-impact' : 'player-impact')).toBeVisible();
      await expect(hp(page)).toHaveText(String(event.playerHpAfter));
      await page.screenshot({ path: `tmp/react-t06-${area}-${blocked ? 'blocked' : 'special'}.jpg` });
      await phase(page, 'idle');
      expect((await snapshot(page)).run).toEqual(trace.run);
      if (special === 'frozen-breath') expect(trace.run.consumablesBlocked).toBe(!blocked);
      if (special === 'oven-overheat') {
        expect(event.ammoLost).toBe(blocked ? 0 : 1);
        await expect(ammo(page)).toHaveText(blocked ? '9' : '8');
      }
    });
  }
}

test('a lethal enemy hit is shown before defeat, then retry has no stale response', async ({ page }) => {
  await installGame(page, { initial: { playerHp: 1, inventory } });
  await start(page);
  await page.keyboard.press('1');
  await expect(hp(page)).toHaveText('1');
  await expect(page.getByRole('heading', { name: '다음엔 조금 더 멀리', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('player-impact')).toBeVisible();
  await expect(hp(page)).toHaveText('0');
  await expect(page.getByRole('heading', { name: '다음엔 조금 더 멀리', exact: true })).toBeVisible();
  expect((await snapshot(page)).run.playerHp).toBe(0);
  await page.getByRole('button', { name: '새 원정 시작' }).click();
  await page.getByRole('button', { name: /^모험가맛 쿠키 / }).click();
  await phase(page, 'idle');
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
  await expect(hp(page)).toHaveText('100');
});

test('Milk first-boss protection uses the same visible interception without spending a Defense item', async ({ page }) => {
  await installGame(page, { initial: { area: 'forest', round: 3, inventory }, allWeapons: true });
  await start(page);
  await page.keyboard.press('4');
  await expect(page.getByTestId('shield-impact')).toContainText('우유 보호막');
  await expect(hp(page)).toHaveText('100');
  let trace = await snapshot(page);
  expect(trace.lastEvent.enemyAttack.blockedBy).toBe('milk');
  expect(trace.run.inventory.defense).toBe(1);
  await phase(page, 'idle');
  await page.keyboard.press('4');
  await expect(page.getByTestId('player-impact')).toBeVisible();
  await expect(hp(page)).toHaveText('91');
  trace = await snapshot(page);
  expect(trace.run.inventory.defense).toBe(1);
});

test('reduced-motion narrow screen shows the shield result and hidden-tab settling never repeats damage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installGame(page, { initial: { inventory } });
  await start(page);
  await page.keyboard.press('3');
  await expect(page.getByTestId('shield-impact')).toBeVisible();
  await expect(page.locator('.monster.is-attacking .monster-body')).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: 'tmp/react-t06-shield-narrow.jpg' });
  await phase(page, 'idle');
  await page.keyboard.press('1');
  const before = await snapshot(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await phase(page, 'idle');
  await expect(hp(page)).toHaveText('95');
  expect((await snapshot(page)).run).toEqual(before.run);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('enemy-attack')).toHaveCount(0);
});
