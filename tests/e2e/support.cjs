const { test: base, expect } = require('@playwright/test');

// The built app has no test entry point. Install observation/fixtures before its UMD
// engine assignment; normal cases delegate every action unchanged to the real engine.
async function installGame(page, fixture = {}) {
  await page.addInitScript(config => {
    Math.random = () => typeof config.random === 'number' ? config.random : .5;
    {
      // Browser assertions need one repeatable battlefield; production keeps a fresh seed per round.
      const layoutSeed = Number.isInteger(config.layoutSeed) ? config.layoutSeed : 13;
      const nativeRandomValues = Crypto.prototype.getRandomValues;
      Crypto.prototype.getRandomValues = function (values) {
        if (values instanceof Uint32Array && values.length === 1) {
          values[0] = layoutSeed >>> 0;
          return values;
        }
        return nativeRandomValues.call(this, values);
      };
    }
    const trace = { run: null, lastEvent: null, lastAction: null, events: [], creates: 0 };
    window.__gameTest = trace;
    let api;
    Object.defineProperty(window, 'BattleEngine', { configurable: true, get: () => api, set(real) {
      api = { ...real };
      api.createRunState = options => {
        const seeded = trace.creates++ === 0;
        const initial = seeded ? { ...options, ...config.initial } : options;
        if (seeded && config.allWeapons) initial.weapons = real.WEAPON_CATALOG.map(weapon => ({ ...weapon, grade: 'C' }));
        const run = real.createRunState(initial);
        if (seeded) {
          Object.assign(run, config.stateOverride || {});
          if (config.enemyHp) run.enemies.forEach(enemy => { enemy.hp = config.enemyHp; enemy.maxHp = config.enemyHp; });
        }
        trace.run = structuredClone(run);
        // The session assigns its layout seed immediately after createRunState returns.
        queueMicrotask(() => { if (!trace.lastAction) trace.run = structuredClone(run); });
        return run;
      };
      for (const name of ['resolveProjectile', 'useConsumable', 'drawRewardChoices', 'applyRewardChoice', 'advanceRound', 'chooseCampReward', 'startBonusRoute']) {
        api[name] = (...args) => {
          if (name === 'resolveProjectile' && config.fastCombat) args[1] = { ...args[1], damage: 1000,
            hitIds: real.getLivingEnemies(args[0]).map(enemy => enemy.id) };
          const result = real[name](...args);
          trace.run = structuredClone(args[0]);
          trace.lastAction = name;
          trace.lastEvent = structuredClone(result);
          trace.events.push({ name, result: structuredClone(result) });
          return result;
        };
      }
    } });
  }, fixture);
}

const test = base.extend({
  browserHealth: [async ({ page }, use, testInfo) => {
    const errors = [], assetFailures = [];
    await page.route('**/api/leaderboard', async route => {
      if (route.request().method() === 'POST') {
        const submission = route.request().postDataJSON();
        return route.fulfill({ json: { saved: true, record: { rank: 1, cookieId: submission.cookieId, score: submission.score } } });
      }
      return route.fulfill({ json: { entries: [], personalBest: null } });
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`); });
    page.on('response', response => {
      if (response.url().startsWith(testInfo.project.use.baseURL) && response.status() >= 400
        && ['image', 'script', 'stylesheet'].includes(response.request().resourceType()))
        assetFailures.push(`${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', request => {
      if (['image', 'script', 'stylesheet'].includes(request.resourceType())
        && request.url().startsWith(testInfo.project.use.baseURL) && !/ABORTED/.test(request.failure()?.errorText || ''))
        assetFailures.push(`${request.failure()?.errorText} ${request.url()}`);
    });
    await use();
    if (testInfo.status !== testInfo.expectedStatus || errors.length || assetFailures.length) {
      const state = await page.evaluate(() => ({ screen: document.querySelector('.app')?.className,
        phase: document.querySelector('.battle-arena')?.dataset.aimPhase,
        headings: [...document.querySelectorAll('h1')].map(node => node.textContent),
        viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        trace: window.__gameTest, body: document.body.innerText })).catch(() => ({ closed: true }));
      await testInfo.attach('game-diagnostics', { body: JSON.stringify({ errors, assetFailures, ...state }, null, 2), contentType: 'application/json' });
    }
    expect(errors, 'browser runtime/console errors').toEqual([]);
    expect(assetFailures, 'failed built-app assets').toEqual([]);
  }, { auto: true }]
});

const arena = page => page.getByRole('group', { name: '전투 맵', exact: true });
const phase = (page, value) => expect(arena(page)).toHaveAttribute('data-aim-phase', value);
const ammo = page => page.locator('.battle-stats > span').nth(1).locator('strong');
const hp = page => page.locator('.battle-stats > span').nth(0).locator('strong');
const snapshot = page => page.evaluate(() => structuredClone(window.__gameTest));
async function start(page, character = '모험가맛 쿠키') {
  await page.goto('/');
  await page.getByRole('button', { name: '모험 시작' }).click();
  await page.getByRole('button', { name: new RegExp(`^${character} `) }).click();
  await phase(page, 'idle');
}
async function grabMap(page) {
  await phase(page, 'idle');
  const box = await arena(page).boundingBox();
  const point = { x: box.x + box.width * .5, y: box.y + box.height * .40 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await phase(page, 'dragging');
  return point;
}
async function dragPull(page, { angleDeg = 45, powerRatio = .8, reverse = false, origin } = {}) {
  const start = origin || await grabMap(page);
  const box = await arena(page).boundingBox();
  const maxDrag = Math.min(220, .34 * Math.min(box.width, box.height));
  const distance = 12 + powerRatio * (maxDrag - 12);
  const radians = (reverse ? 135 : angleDeg) * Math.PI / 180;
  await page.mouse.move(start.x - Math.cos(radians) * distance, start.y + Math.sin(radians) * distance);
  return start;
}
async function shoot(page, { short = false, angleDeg = 45, powerRatio, reverse = false, finalHeading } = {}) {
  await dragPull(page, { angleDeg, powerRatio: powerRatio ?? (short ? .08 : .8), reverse });
  await page.mouse.up();
  await phase(page, 'launching');
  if (finalHeading) await expect(page.getByRole('heading', { name: finalHeading, exact: true })).toBeVisible();
  else await phase(page, 'idle');
}
async function selectRewards(page, merge = false) {
  await expect(page.getByRole('heading', { name: '다음 한 발을 위한 선물', exact: true })).toBeVisible();
  await page.locator('.reward-section').nth(0).getByRole('button').first().click();
  if (await page.getByRole('heading', { name: '같은 등급의 사탕을 발견했어요', exact: true }).isVisible())
    await page.getByRole('button', { name: merge ? /등급으로 합성/ : '따로 보유', exact: !merge }).click();
  const items = page.locator('.reward-section').nth(1).getByRole('button');
  if (await items.count()) await items.first().click();
  await page.locator('.continue-button').click();
}
module.exports = { test, expect, installGame, arena, phase, ammo, hp, snapshot, start, grabMap, dragPull, shoot, selectRewards };
