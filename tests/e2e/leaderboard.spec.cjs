const { test, expect } = require('./support.cjs');

test('leaderboard keeps exactly the top ten, hides server tie-break metadata, and fits a phone viewport', async ({ page }) => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    rank: index + 1,
    displayName: `Player ${index + 1}`,
    cookieId: index === 0 ? 'adventurer' : 'wind',
    score: 1000 - index * 10,
    ownerKey: `private-owner-${index}`,
    email: `player${index + 1}@example.test`,
    furthestArea: 'city',
    round: 5,
    durationMs: 1234
  }));
  await page.route('**/api/leaderboard', route => route.fulfill({
    json: { entries, personalBest: null }
  }));

  await page.goto('/');
  await page.locator('.home-leaderboard-entry button').click();
  await expect(page.locator('.leaderboard-table tbody tr')).toHaveCount(10);
  await expect(page.locator('.personal-best')).toHaveCount(0);
  const board = page.locator('.leaderboard-screen');
  await expect(board).toContainText('Player 1');
  await expect(board).toContainText('Player 10');
  const visibleText = await board.innerText();
  const accessibleText = await board.ariaSnapshot();
  for (const privateValue of ['ownerKey', 'private-owner-', '@example.test', 'furthestArea', 'durationMs', '1234', 'city', 'round']) {
    expect(visibleText).not.toContain(privateValue);
    expect(accessibleText).not.toContain(privateValue);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await page.locator('.home-leaderboard-entry button').click();
  await expect(page.locator('.leaderboard-table tbody tr')).toHaveCount(10);
});
