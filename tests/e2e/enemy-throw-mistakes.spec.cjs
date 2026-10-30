const { test, expect, installGame, start, dragPull, phase, hp, snapshot } = require('./support.cjs');

async function launch(page) {
  await dragPull(page,{angleDeg:-5,powerRatio:.08}); await page.mouse.up();
  // Keep the 6720ms virtual-flight budget, with fewer browser round trips.
  // A 64ms step still observes even the shortest 150ms windup before impact.
  for(let elapsed=0;elapsed<6720;elapsed+=64) {
    await page.clock.runFor(64);
    if(await page.getByTestId('enemy-attack').count()) break;
  }
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage','windup');
}
async function setup(page,{boss=false,random=.92,shield=false,reduced=false}={}) {
  if(reduced) { await page.setViewportSize({width:390,height:844}); await page.emulateMedia({reducedMotion:'reduce'}); }
  const basic={id:'basic-stone',name:'기본 스톤',grade:'C',effect:'공통 피해'};
  await installGame(page,{initial:{area:boss?'city':'forest',round:boss?3:1,inventory:{defense:1},
    ...(boss?{weapons:[basic,basic,basic,basic]}:{})},random});
  await start(page);
  if(shield) await page.getByRole('button',{name:'방어 사용',exact:true}).click();
  await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await launch(page);
}
async function impact(page,boss=false,reduced=false) {
  const d=await page.getByTestId('enemy-projectile-trail').getAttribute('data-trajectory');
  const numbers=d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const [sx,sy,,,tx,ty]=numbers;
  const travel=reduced?100:Math.max(520,Math.min(1100,(sx+(boss?276:92)*.25-120)/4));
  await page.clock.runFor((reduced?150:340)+travel+32);
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-stage','impact');
  return {sx,sy,tx,ty};
}

for(const [style,random] of [['slip',.92],['overshoot',.98]])
  test(`a committed ${style} uses a separate trajectory, causes no player impact and preserves an armed shield`,async({page})=>{
    await setup(page,{random,shield:true});
    await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-miss-style',style);
    await expect(page.locator('.monster.is-attacking .monster-body')).toHaveCSS('animation-name',style==='slip'?'enemy-slip':'enemy-overthrow');
    const event=(await snapshot(page)).lastEvent.enemyAttack;
    expect(event.missed).toBe(true); expect(event.damage).toBe(0); expect(event.blocked).toBe(false);
    const target=await impact(page);
    expect(target.tx).toBe(style==='slip'?452:20); expect(target.ty).toBe(style==='slip'?886:560);
    await expect(page.getByTestId('enemy-miss-impact')).toBeVisible();
    if(style==='overshoot') {
      const label=await page.getByTestId('enemy-miss-impact').locator('text').boundingBox();
      const map=await page.locator('.battle-arena').boundingBox();
      expect(label.x).toBeGreaterThanOrEqual(map.x);
    }
    await expect(page.getByTestId('player-impact')).toHaveCount(0);
    await expect(page.getByTestId('shield-impact')).toHaveCount(0);
    await expect(page.getByTestId('player-cookie')).not.toHaveAttribute('data-player-pose','hurt');
    await expect(page.getByTestId('player-shield')).toBeVisible(); await expect(hp(page)).toHaveText('100');
    await page.screenshot({path:`tmp/enemy-mistake-${style}.png`});
    await page.clock.runFor(700); await phase(page,'idle');
    expect((await snapshot(page)).run.defenseArmed).toBe(true);
    await expect(page.locator('.battle-status')).toContainText('적 투척 빗나감');
    await page.evaluate(()=>{
      const original=window.BattleEngine.resolveProjectile;
      window.BattleEngine.resolveProjectile=(run,options)=>original(run,{...options,rng:()=>.5});
    });
    await launch(page); await impact(page);
    await expect(page.getByTestId('shield-impact')).toBeVisible();
    expect((await snapshot(page)).lastEvent.enemyAttack.blockedBy).toBe('defense');
    expect((await snapshot(page)).run.defenseArmed).toBe(false);
  });

test('a giant boss may miss ordinary throws but its third attack remains the real special',async({page})=>{
  await setup(page,{boss:true,random:.96});
  expect((await snapshot(page)).lastEvent.enemyAttack.missed).toBe(true);
  await impact(page,true); await page.clock.runFor(700); await phase(page,'idle');
  await launch(page); expect((await snapshot(page)).lastEvent.enemyAttack.missed).toBe(true);
  await impact(page,true); await page.clock.runFor(700); await phase(page,'idle');
  await launch(page);
  const event=(await snapshot(page)).lastEvent.enemyAttack;
  expect(event.missed).toBe(false); expect(event.attemptedSpecial).toBe('oven-overheat');
  expect((await snapshot(page)).run.enemies[0].attackCount).toBe(3);
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-special','oven-overheat');
});

test('reduced-motion phone still communicates the miss, retains protection and returns to aiming',async({page})=>{
  await setup(page,{random:.92,shield:true,reduced:true});
  await expect(page.locator('.monster.is-attacking .monster-body')).toHaveCSS('animation-name','none');
  await impact(page,false,true);
  await expect(page.getByTestId('enemy-miss-impact')).toBeVisible(); await expect(hp(page)).toHaveText('100');
  await page.clock.runFor(500); await phase(page,'idle');
  expect((await snapshot(page)).run.defenseArmed).toBe(true);
  expect((await snapshot(page)).events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
});
