const { test, expect, installGame, phase, start, dragPull } = require('./support.cjs');

for (const scenario of [{ name: 'forward', angleDeg: -5, powerRatio: .6 },
  { name: 'reverse', angleDeg: 185, powerRatio: .25 }]) test(`${scenario.name} grounded candy visibly rolls with dust following before combat completes`, async ({ page }) => {
  await installGame(page, { layoutSeed: 4927 });
  await start(page);
  await dragPull(page, scenario);
  await page.clock.install();
  await page.evaluate(() => {
    window.__rollFrames = [];
    let seen = false;
    const started = performance.now();
    function sample(now) {
      const candy = document.querySelector('[data-testid="projectile"]');
      if (candy) seen = true;
      if (candy?.dataset.rolling === 'true' && getComputedStyle(candy).visibility !== 'hidden') {
        const dust = document.querySelector('[data-testid="roll-dust"]') || document.querySelector('.roll-dust');
        const a = candy.getBoundingClientRect(), b = dust.getBoundingClientRect();
        window.__rollFrames.push({ time: now, transform: candy.getAttribute('transform'),
          dustDistance: Math.hypot(b.x + b.width / 2 - a.x - a.width / 2, b.y + b.height / 2 - a.y - a.height / 2) });
      }
      if ((!seen || candy) && now - started < 5000) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await page.mouse.up();
  for (let i = 0; i < 100; i++) {
    await page.clock.runFor(16);
    if (await page.getByTestId('projectile').getAttribute('data-rolling') === 'true') break;
  }
  await page.clock.runFor(80);
  await expect(page.getByTestId('roll-shadow')).toBeVisible();
  await page.screenshot({ path: `tmp/candy-roll-${scenario.name}.png` });
  await page.clock.runFor(5000);
  await expect(page.getByTestId('projectile')).toHaveCount(0);
  await phase(page, 'idle');
  const frames = await page.evaluate(() => window.__rollFrames);
  expect(frames.length).toBeGreaterThanOrEqual(8);
  expect(frames.at(-1).time - frames[0].time, 'rolling must remain readable for at least 220ms').toBeGreaterThanOrEqual(220);
  expect(new Set(frames.map(frame => frame.transform)).size).toBeGreaterThanOrEqual(8);
  expect(Math.max(...frames.map(frame => frame.dustDistance)), 'dust must stay next to the rolling candy').toBeLessThan(85);
});
