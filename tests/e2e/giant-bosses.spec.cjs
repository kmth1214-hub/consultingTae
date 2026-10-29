const { test, expect, installGame, start, dragPull } = require('./support.cjs');

for (const [area, kind] of [['forest','pointy-boar'],['snow','cowardly-snowman'],['city','oven-robot']])
  test(`${area} boss has a three-times body, regional armor and a named HP bar`, async ({page}) => {
    await installGame(page, { initial:{area,round:3} }); await start(page);
    const boss = page.locator('.monster--boss');
    await expect(boss).toHaveCSS('width','414px');
    await expect(page.getByTestId('boss-armor')).toHaveAttribute('data-kind', kind);
    await expect(page.getByTestId('boss-health')).toBeVisible();
    await expect(page.getByTestId('boss-health')).toContainText('/');
    await page.screenshot({path:`tmp/giant-boss-${area}.png`});
    await dragPull(page,{angleDeg:-5,powerRatio:.08});
    await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
    await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
    await page.mouse.up();
    for(let i=0;i<400;i++) { await page.clock.runFor(16); if(await page.getByTestId('enemy-attack').count()) break; }
    await page.clock.runFor(240); // Complete the response-camera transition within windup.
    await expect(page.locator('.monster--boss .monster-body')).toHaveCSS('animation-name','boss-heavy-load');
    await expect(page.getByTestId('boss-health')).toBeInViewport();
    if(area !== 'forest') {
      const d = await page.getByTestId('enemy-projectile-trail').getAttribute('data-trajectory');
      const [x,y] = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const placement = await boss.evaluate(node=>({x:parseFloat(node.style.left),y:parseFloat(node.style.top)}));
      expect(x).toBeCloseTo(placement.x-414*.25); expect(y).toBeCloseTo(placement.y-414*.65);
    }
  });

test('the 4.5-times fused Chaos boss and nameplate fit on a reduced-motion phone', async ({page})=>{
  await page.setViewportSize({width:390,height:844}); await page.emulateMedia({reducedMotion:'reduce'});
  await installGame(page,{initial:{area:'chaos',round:3}}); await start(page);
  const bosses=page.locator('.monster--boss'), bars=page.getByTestId('boss-health');
  await expect(bosses).toHaveCount(1); await expect(bars).toHaveCount(1);
  await expect(bosses).toHaveCSS('width','621px');
  const boxes=[];
  await expect(bars).toBeInViewport(); boxes.push(await bars.boundingBox());
  const candy = await page.locator('.candy-hud').boundingBox();
  for(const box of boxes) expect(box.y).toBeGreaterThan(candy.y+candy.height);
  await page.screenshot({path:'tmp/giant-boss-chaos-phone.png'});
});
