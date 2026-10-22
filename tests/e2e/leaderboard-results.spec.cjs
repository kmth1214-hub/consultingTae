const { test, expect, installGame, phase, start, shoot, dragPull } = require('./support.cjs');

function boardPayload(entries = [{ rank: 1, displayName: 'Top Player', cookieId: 'wind', score: 900,
  furthestArea: 'city', round: 5, durationMs: 1234 }], personalBest = null) {
  return { entries, personalBest };
}

test('main defeat submits final score, displays save feedback, and returns from board to the exact result', async ({ page }) => {
  await installGame(page, { initial: { ammo: 1 } });
  let submitted;
  await page.route('**/api/leaderboard', async route => {
    if (route.request().method() === 'POST') {
      submitted = JSON.parse(route.request().postData());
      await route.fulfill({ json: { saved: true, record: { rank: 11, cookieId: 'adventurer', score: submitted.score } } });
    } else await route.fulfill({ json: boardPayload() });
  });
  await start(page);
  await dragPull(page, { powerRatio: .08 });
  await page.mouse.up();
  await expect(page.locator('.results-screen')).toBeVisible();
  await expect(page.locator('.record-save-status--saved')).toBeVisible();
  const resultText = await page.locator('.result-stats').innerText();
  expect(submitted).toMatchObject({ cookieId: 'adventurer', furthestArea: 'forest', round: 1, durationMs: expect.any(Number) });
  expect(Number.isSafeInteger(submitted.score)).toBe(true);
  expect(JSON.stringify(submitted)).not.toMatch(/userId|displayName|email|bonusScore/);

  await page.getByRole('button', { name: '리더보드 보기' }).click();
  await expect(page.locator('.leaderboard-screen h1')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Top Player' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '900' })).toBeVisible();
  await expect(await page.locator('.leaderboard-screen').innerText()).not.toMatch(/furthestArea|durationMs|1234|city|5 라운드/);
  await page.locator('.leaderboard-actions button').click();
  await expect(page.locator('.results-screen h1')).toBeVisible();
  expect(await page.locator('.result-stats').innerText()).toBe(resultText);
});

test('home board handles retry and shows only the selected public fields plus outside-top-10 best', async ({ page }) => {
  let getRequests = 0;
  await page.route('**/api/leaderboard', async route => {
    if (route.request().method() === 'POST') return route.fulfill({ json: { saved: false, record: { rank: 12, cookieId: 'wizard', score: 120 } } });
    getRequests++;
    if (getRequests === 1) return route.fulfill({ json: { entries: null } });
    return route.fulfill({ json: boardPayload([{ rank: 1, displayName: 'Player One', cookieId: 'alchemist', score: 400,
      furthestArea: 'city', round: 5, durationMs: 5000 }], { rank: 12, cookieId: 'wizard', score: 120, round: 3, durationMs: 7000 }) });
  });
  await page.goto('/');
  await page.locator('.home-leaderboard-entry button').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('.leaderboard-message--error button').click();
  await expect(page.locator('.leaderboard-table')).toBeVisible();
  await expect(page.locator('.personal-best')).toBeVisible();
  await expect(page.getByText('#12')).toBeVisible();
  await expect(await page.locator('.leaderboard-screen').innerText()).not.toMatch(/furthestArea|durationMs|round|7000|city/);
  await page.locator('.leaderboard-actions button').click();
  await expect(page.locator('.home-shell h1')).toBeVisible();
});

test('main clear submits once and the optional bonus result never submits bonus score', async ({ page }) => {
  await installGame(page, { initial: { area: 'city', round: 5 }, fastCombat: true });
  let posts = 0;
  let submitted;
  await page.route('**/api/leaderboard', async route => {
    if (route.request().method() === 'POST') {
      posts++;
      submitted = JSON.parse(route.request().postData());
      await route.fulfill({ json: { saved: true, record: { rank: 1, cookieId: submitted.cookieId, score: submitted.score } } });
    } else await route.fulfill({ json: boardPayload() });
  });
  await start(page);
  await dragPull(page, { powerRatio: .08 });
  await page.mouse.up();
  await expect(page.locator('.reward-screen')).toBeVisible();
  await page.locator('.reward-section').nth(0).getByRole('button').first().click();
  if (await page.locator('.fusion-choice').isVisible()) await page.locator('.fusion-choice .secondary-button').click();
  await page.locator('.reward-section').nth(1).getByRole('button').first().click();
  await page.locator('.continue-button').click();
  await expect(page.locator('.results-screen h1')).toBeVisible();
  await expect(page.locator('.record-save-status--saved')).toBeVisible();
  const mainScore = submitted.score;
  await page.locator('.results-screen .primary-button').click();
  await phase(page, 'idle');
  for (let round = 1; round <= 3; round++) {
    if (round < 3) await shoot(page, { short: true });
    else {
      await dragPull(page, { powerRatio: .08 });
      await page.mouse.up();
      await expect(page.locator('.results-screen')).toBeVisible();
    }
  }
  const summary = await page.locator('.result-stats').innerText();
  expect(summary).toContain(mainScore.toLocaleString());
  expect(posts).toBe(1);
  expect(submitted.score).toBe(mainScore);
  await expect(page.getByRole('button', { name: '리더보드 보기' })).toHaveCount(0);
});
