const { test, expect, installGame, start, dragPull, phase, arena, snapshot } = require('./support.cjs');

async function begin(page, random, { seed = 4927, chain = false } = {}) {
  const { BattleEngine } = await import('../../src/game/battleEngine.js');
  const enemies = BattleEngine.createRoundEnemies('chaos', 1, { rng: () => .25 });
  enemies.forEach(e => { e.hp = e.maxHp = 30; });
  await installGame(page, { initial: { area: 'chaos', round: 1 }, stateOverride: { enemies }, layoutSeed: seed, random });
  await start(page);
  let options = { angleDeg: 50, powerRatio: .525 };
  if (chain) {
    const [{ buildPlayableBattlefield }, { planShot }] = await Promise.all([
      import('../../src/game/battlefieldPlacement.js'), import('../../src/game/shotGeometry.js')]);
    const layout = buildPlayableBattlefield({ area: 'chaos', round: 1, enemies, seed,
      prototype: 'regional-elevated-v1', worldScale: 1.5 });
    let found = false;
    for (let angleDeg = 0; angleDeg <= 75 && !found; angleDeg += 2.5) for (let i = 1; i <= 40; i++) {
      const powerRatio = i / 40, r = angleDeg * Math.PI / 180;
      const shot = planShot({ layout, enemies, pull: { ready: true, powerRatio, direction: { x: Math.cos(r), y: -Math.sin(r) } } });
      if (shot?.contacts.some(c => c.trigger === 'obstacle')) { options = { angleDeg, powerRatio }; found = true; break; }
    }
    expect(found).toBe(true);
  }
  await dragPull(page, options);
  await page.clock.install({ time: new Date('2026-10-26T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await page.mouse.up();
  for (let i = 0; i < 350; i++) {
    await page.clock.runFor(16);
    if (await arena(page).getAttribute('data-shot-review') === 'true') break;
  }
  await phase(page, 'reviewing');
  return (await snapshot(page)).events.find(e => e.name === 'resolveProjectile').result;
}

for (const [random, kind, text] of [[.1, 'log-strike', '단일 타격'], [.3, 'ice-guard', '50% 감소'],
  [.6, 'jar-burst', '전체 적 폭발'], [.9, 'aim-inversion', '조작 반전']]) {
  test(`Chaos ice contact shows the committed ${kind} outcome, without redrawing or replaying it`, async ({ page }) => {
    const event = await begin(page, random);
    expect(event.obstacleEffects).toHaveLength(1);
    expect(event.obstacleEffects[0].kind).toBe(kind);
    expect(event.obstacleEffects[0].obstacleId).toBe('chaos-1-obstacle-1');
    const notice = page.getByTestId('chaos-obstacle-notice');
    await expect(notice).toHaveCount(1);
    await expect(notice).toHaveAttribute('data-effect', kind);
    await expect(notice).toContainText(text);
    await expect(page.locator('.battle-status')).toContainText('혼돈');
    await expect(page.locator('.battle-status')).toContainText(text);
    const trace = await snapshot(page);
    if (kind === 'ice-guard') {
      await expect(page.getByTestId('obstacle-frost')).toBeVisible();
      expect(event.enemyAttack.damageReduction).toBe(.5);
      expect(trace.run.enemies.every(e => e.hp === 30)).toBe(true);
    } else await expect(page.getByTestId('obstacle-frost')).toHaveCount(0);
    if (kind === 'jar-burst') {
      await expect(page.getByTestId('city-ground-chain')).toBeVisible();
      expect(trace.run.enemies.every(e => e.hp === 28)).toBe(true);
      expect(trace.run.bonusScore).toBe(20);
    } else await expect(page.getByTestId('city-ground-chain')).toHaveCount(0);
    if (kind === 'log-strike') {
      await expect(page.getByTestId('chaos-magic-effect')).toHaveAttribute('data-effect', kind);
      expect(event.obstacleEffects[0].hits.map(h => h.damage)).toEqual([3]);
      expect(trace.run.bonusScore).toBe(3);
    }
    if (kind === 'aim-inversion') {
      await expect(page.getByTestId('chaos-magic-effect')).toHaveAttribute('data-effect', kind);
      await expect(page.getByTestId('chaos-magic-effect')).toBeInViewport();
      expect(trace.run.pendingAimInversion).toBe(true);
    }
    await page.screenshot({ path: `tmp/chaos-${kind}-feedback.png` });
    await page.clock.runFor(1750);
    await expect(notice).toHaveCount(0);
    await expect(page.getByTestId('obstacle-frost')).toHaveCount(0);
    await page.clock.runFor(3000); await phase(page, 'idle');
    await dragPull(page, { angleDeg: 10, powerRatio: .2 });
    await page.keyboard.press('Escape'); await page.mouse.up();
    await expect(notice).toHaveCount(0);
    expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
  });
}

test('Chaos chained props each show their actual burst once, regardless of their material', async ({ page }) => {
  const event = await begin(page, .6, { seed: 4927, chain: true });
  expect(event.obstacleEffects.length).toBeGreaterThan(1);
  const notices = page.getByTestId('chaos-obstacle-notice');
  await expect(notices).toHaveCount(event.obstacleEffects.length);
  await expect(page.getByTestId('city-ground-chain')).toHaveCount(event.obstacleEffects.length);
  expect(event.obstacleEffects.every(e => e.kind === 'jar-burst')).toBe(true);
  expect(new Set(await notices.evaluateAll(nodes => nodes.map(n => n.dataset.obstacleId))).size).toBe(event.obstacleEffects.length);
  await page.clock.runFor(5000); await phase(page, 'idle');
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('Chaos ice guard keeps static phone feedback and does not block the next aim', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await begin(page, .3);
  await expect(page.getByTestId('obstacle-frost')).toBeVisible();
  await expect(page.getByTestId('obstacle-frost')).toHaveCSS('animation-name', 'none');
  await expect(page.getByTestId('chaos-obstacle-notice')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'tmp/chaos-ice-guard-phone.png' });
  await page.clock.runFor(3500); await phase(page, 'idle');
  await dragPull(page); await phase(page, 'dragging');
  await page.keyboard.press('Escape'); await page.mouse.up();
});
