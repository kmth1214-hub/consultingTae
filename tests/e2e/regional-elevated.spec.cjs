const { test, expect, installGame, start, phase, snapshot, dragPull } = require('./support.cjs');

for (const [area, round, expected] of [
  ['forest', 1, 0], ['forest', 2, 1], ['snow', 1, 0], ['snow', 2, 1],
  ['city', 1, 0], ['city', 2, 1], ['chaos', 1, 3], ['chaos', 2, 3]
]) test(`${area} round ${round} shows ${expected} supported enemies in the public arena`, async ({ page }) => {
  await installGame(page, { initial: { area, round }, layoutSeed: 0 });
  await start(page);
  const trace = await snapshot(page);
  expect(trace.run.battlefieldPrototype).toBe(area === 'forest' ? 'forest-elevated-v1' : 'regional-elevated-v1');
  expect(trace.run.battlefieldWorldScale).toBe(1.5);
  const supports = page.locator('.battle-arena [data-supports-enemy]');
  await expect(supports).toHaveCount(expected);
  const y = await page.locator('.battle-arena .monster').evaluateAll(nodes => nodes.map(node => Number.parseFloat(node.style.top)));
  expect(y.filter(value => value < 900)).toHaveLength(expected);
  expect(y.filter(value => value === 900)).toHaveLength(y.length - expected);
  await expect(page.locator('.minimap-enemy')).toHaveCount(y.length);
  if (area === 'snow' || area === 'city') await expect(supports.locator('.supported-stack-top')).toHaveCount(expected);
});

test('a public Snow support hit drops its rider, applies frost guard and moves the minimap marker', async ({ page }) => {
  const [{ BattleEngine }, { buildPlayableBattlefield }, { planShot }] = await Promise.all([
    import('../../src/game/battleEngine.js'), import('../../src/game/battlefieldPlacement.js'),
    import('../../src/game/shotGeometry.js')]);
  const enemies = BattleEngine.createRoundEnemies('snow', 2, { rng: () => .5 });
  const layout = buildPlayableBattlefield({ area: 'snow', round: 2, enemies, seed: 0,
    prototype: 'regional-elevated-v1', worldScale: 1.5 });
  const support = layout.obstacles.find(item => item.supportsEnemyId);
  let target;
  for (let angleDeg = 0; angleDeg <= 80 && !target; angleDeg += 2.5)
    for (let step = 1; step <= 20 && !target; step++) {
      const radians = angleDeg * Math.PI / 180;
      const powerRatio = step / 20;
      const shot = planShot({ layout, enemies, pull: { ready: true, powerRatio,
        direction: { x: Math.cos(radians), y: -Math.sin(radians) } } });
      if (shot?.contacts.some(contact => contact.obstacleId === support.id && contact.riderMotion)
        && !shot.hitIds.length) target = { angleDeg, powerRatio };
    }
  expect(target).toBeTruthy();
  await installGame(page, { initial: { area: 'snow', round: 2 }, layoutSeed: 0,
    enemyHp: 10 });
  await start(page);
  await dragPull(page, target); await page.mouse.up();
  await phase(page, 'idle');
  const trace = await snapshot(page);
  expect(trace.run.toppledObstacleIds).toContain(support.id);
  expect(trace.lastEvent.hits.filter(hit => hit.source === 'rider-fall')).toHaveLength(1);
  expect(trace.lastEvent.obstacleEffects.some(effect => effect.kind === 'ice-guard')).toBe(true);
  const rider = trace.lastEvent.hits.find(hit => hit.source === 'rider-fall');
  expect(trace.run.enemyLandingPositions[rider.id].y).toBe(900);
  const monsterY = await page.locator(`.monster[data-enemy-id="${rider.id}"]`).evaluate(node => Number.parseFloat(node.style.top));
  expect(monsterY).toBe(900);
  const markerY = await page.locator(`[data-minimap-enemy="${rider.id}"]`).evaluate(node => Number.parseFloat(node.style.top));
  expect(markerY).toBeGreaterThan(60);
});
