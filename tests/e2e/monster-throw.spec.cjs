const { test, expect, installGame, start, dragPull, phase, hp, snapshot } = require('./support.cjs');

async function counterattack(page, kind, area, shield = false) {
  const enemies = [{ id: 'thrower', kind, hp: 20, maxHp: 20, isBoss: false, attackCount: 0, alive: true }];
  await installGame(page, { stateOverride: { area, round: 1, enemies }, initial: { inventory: { defense: 1 } } });
  await start(page);
  if (shield) await page.getByRole('button', { name: '방어 사용', exact: true }).click();
  await dragPull(page, { angleDeg: -5, powerRatio: .08 });
  await page.clock.install({ time: new Date('2026-10-26T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await page.mouse.up();
  for (let i = 0; i < 400; i++) {
    await page.clock.runFor(16);
    if (await page.getByTestId('enemy-attack').count()) break;
  }
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage', 'windup');
}
const position = async page => page.getByTestId('enemy-projectile').evaluate(node => {
  const values = node.getAttribute('transform').match(/translate\(([-\d.e+]+) ([-\d.e+]+)\)/);
  return { x: Number(values[1]), y: Number(values[2]), p: Number(node.dataset.progress) };
});

for (const [kind, area, ammo, arm] of [
  ['snake', 'forest', 'jelly', false], ['snowball', 'snow', 'snow', true],
  ['dry-ice', 'snow', 'ice', false], ['washing-robot', 'city', 'energy', true],
]) test(`${kind} prepares matching ammunition, releases it and follows a high rising and falling parabola`, async ({ page }) => {
  await counterattack(page, kind, area);
  const held = page.getByTestId('monster-held-projectile'), projectile = page.getByTestId('enemy-projectile');
  await expect(held).toBeVisible();
  await expect(held).toHaveAttribute('data-ammo', ammo);
  await expect(page.getByTestId('monster-throw-arm')).toHaveCount(arm ? 1 : 0);
  await expect(projectile).toHaveCSS('visibility', 'hidden');
  const body = page.locator('.monster.is-attacking .monster-body');
  await expect(body).toHaveCSS('animation-name', 'enemy-throw-load');
  const startTransform = await body.evaluate(node => getComputedStyle(node).transform);
  await page.clock.runFor(140);
  expect(await body.evaluate(node => getComputedStyle(node).transform)).not.toBe(startTransform);
  await page.screenshot({ path: `tmp/${kind}-throw-prepare.png` });
  await page.clock.runFor(220);
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage', 'travel');
  await expect(held).toHaveCount(0);
  await expect(projectile).toHaveAttribute('data-ammo', ammo);
  await expect(projectile).toBeVisible();
  const d = await page.getByTestId('enemy-projectile-trail').getAttribute('data-trajectory');
  const [sx, sy, cx, cy, tx, ty] = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const travel = Math.max(520, Math.min(1100, (sx + 23 - tx) / 4));
  await page.clock.runFor(Math.round(travel * .45));
  const apex = await position(page);
  expect(apex.p).toBeGreaterThan(.4); expect(apex.p).toBeLessThan(.65);
  const linearY = sy + (ty - sy) * apex.p;
  expect(linearY - apex.y).toBeGreaterThan(200);
  await expect(hp(page)).toHaveText('100');
  await expect(body).toHaveCSS('animation-name', 'enemy-throw-release');
  const ballBox = await projectile.boundingBox(), noticeBox = await page.locator('.enemy-warning').boundingBox();
  expect(ballBox.y > noticeBox.y + noticeBox.height || ballBox.y + ballBox.height < noticeBox.y
    || ballBox.x > noticeBox.x + noticeBox.width || ballBox.x + ballBox.width < noticeBox.x).toBe(true);
  await page.screenshot({ path: `tmp/${kind}-throw-apex.png` });
  await page.clock.runFor(Math.round(travel * .32));
  const falling = await position(page);
  expect(falling.x).toBeLessThan(apex.x);
  expect(falling.y).toBeGreaterThan(apex.y + 70);
  expect(falling.p).toBeLessThan(1);
  const tail = await page.getByTestId('enemy-projectile-trail').getAttribute('d');
  expect(tail).not.toBe(d);
  await expect(hp(page)).toHaveText('100');
  await page.clock.runFor(300);
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage', 'impact');
  await expect(hp(page)).toHaveText(String((await snapshot(page)).lastEvent.enemyAttack.playerHpAfter));
  await page.clock.runFor(800);
  await phase(page, 'idle');
  expect((await snapshot(page)).events.filter(e => e.name === 'resolveProjectile')).toHaveLength(1);
});

test('reduced-motion phone retains held ammunition and shield feedback with no throwing animations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await counterattack(page, 'snowball', 'snow', true);
  await expect(page.getByTestId('monster-held-projectile')).toBeVisible();
  await expect(page.locator('.monster-throw-grip')).toHaveCSS('animation-name', 'none');
  await page.clock.runFor(300);
  await expect(page.getByTestId('shield-impact')).toBeVisible();
  await expect(hp(page)).toHaveText('100');
  await page.clock.runFor(500);
  await phase(page, 'idle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect((await snapshot(page)).run.playerHp).toBe(100);
});
