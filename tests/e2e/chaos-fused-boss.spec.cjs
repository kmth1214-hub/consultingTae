const {test,expect,installGame,start,dragPull,phase,arena,hp,ammo,snapshot}=require('./support.cjs');
const {aimedShot}=require('./spear-support.cjs');
const fused = hp => ({id:'chaos-fused-boss',kind:'chaos-fused-boss',hp,maxHp:56,isBoss:true,attackCount:0,normalAttackCount:0,alive:true});
async function paused(page) {
  await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
}
async function advanceUntil(page, predicate, max=150) {
  for(let i=0;i<max;i++) { if(await predicate()) return; await page.clock.runFor(100); }
  throw new Error('Timed out advancing the committed boss playback');
}

test('Chaos final opens as one illustrated 621-unit boss with full 56 HP',async({page})=>{
  await installGame(page,{initial:{area:'chaos',round:3}});await start(page);
  await expect(page.locator('.monster--boss')).toHaveCount(1);
  await expect(page.locator('.monster--boss')).toHaveCSS('width','621px');
  await expect(page.locator('.monster--boss')).toHaveAttribute('aria-label',/혼돈의 융합 군주, 체력 56\/56/);
  await expect(page.locator('.monster-art--fused')).toBeVisible();
  expect(await page.locator('.monster-art--fused').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'tmp/chaos-fused-desktop.png'});
});

for(const setting of ['shield','phone-ice','milk','fatal']) test(`actual shot reviews then splits with a single ${setting} landing outcome`,async({page})=>{
  const phone=setting==='phone-ice';
  if(phone) {await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
  if(setting==='milk') await page.addInitScript(()=>localStorage.setItem('cookie-roguelike.profile.v1','{"version":1,"snowAreaCleared":true}'));
  await installGame(page,{initial:{area:'chaos',round:3,playerHp:setting==='fatal'?1:100,
    inventory:{defense:1,spear:1}},stateOverride:{enemies:[fused(29)],...(phone?{nextAttackDamageMultiplier:.5}:{})}});
  await start(page,setting==='milk'?'우유맛 쿠키':'모험가맛 쿠키');await paused(page);
  await page.clock.runFor(240);
  if(phone) await page.screenshot({path:'tmp/chaos-fused-phone.png'});
  if(setting==='shield') await page.keyboard.press('3');
  const shot=await aimedShot({area:'chaos',round:3,piercing:false,enemies:[fused(29)]});
  await dragPull(page,shot);await page.mouse.up();
  await advanceUntil(page,async()=>await arena(page).getAttribute('data-aim-phase')==='reviewing');
  const event=(await snapshot(page)).lastEvent;
  expect(event.bossSplit.remainingHp).toBe(27);expect(event.enemyAttack).toBe(null);
  await expect(page.locator('.monster--boss')).toHaveCount(1);await expect(arena(page)).toHaveAttribute('data-boss-phase','fused');
  await expect(hp(page)).toHaveText(setting==='fatal'?'1':'100');
  await expect(ammo(page)).toHaveText('2');
  await advanceUntil(page,async()=>await page.getByTestId('boss-split-transition').count()>0);
  await expect(arena(page)).toHaveAttribute('data-aim-phase','splitting');
  const calls=(await snapshot(page)).events.length;
  await page.keyboard.press('1');expect((await snapshot(page)).events.length).toBe(calls);
  if(setting==='shield') {
    await page.clock.runFor(500);
    const airborne=await page.getByTestId('boss-split-body').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.y)));
    expect(airborne.every(y=>y<900)).toBe(true);
    await page.screenshot({path:'tmp/chaos-split-flight.png'});
  }
  await advanceUntil(page,async()=>await page.getByTestId('boss-split-transition').getAttribute('data-stage')==='impact');
  await expect(page.getByTestId('boss-landing-shock')).toHaveCount(1);
  await expect(page.locator('.scene-scenery > [data-obstacle-id]')).toHaveCount(3);
  expect(await page.locator('.scene-scenery > [data-obstacle-id]').evaluateAll(nodes=>nodes.every(n=>n.dataset.obstacleId.includes('split')))).toBe(true);
  const expected=setting==='fatal'?'0':phone?'99':setting==='shield'||setting==='milk'?'100':'98';
  await expect(hp(page)).toHaveText(expected);
  await expect(page.getByTestId('player-cookie')).toHaveAttribute('data-player-pose',setting==='fatal'?'defeated':phone?'hurt':'blocked');
  await page.screenshot({path:`tmp/chaos-split-${setting}-landing.png`});
  await page.clock.runFor(1000);
  const after=await snapshot(page);
  expect(after.events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
  expect(after.run.enemies.reduce((sum,e)=>sum+e.hp,0)).toBe(27);
  if(setting==='fatal') await expect(page.getByRole('heading',{name:'다음엔 조금 더 멀리',exact:true})).toBeVisible();
  else {
    await phase(page,'idle');await expect(page.locator('.monster--boss')).toHaveCount(3);
    for(const boss of await page.locator('.monster--boss').all()) await expect(boss).toHaveCSS('width','414px');
    if(setting==='shield') {
      await page.keyboard.press('2');expect((await snapshot(page)).run.enemies).toEqual(after.run.enemies);
      const next=await aimedShot({area:'chaos',round:3,enemies:after.run.enemies,encounterPhase:'split'});
      await dragPull(page,next);await page.mouse.up();
      await advanceUntil(page,async()=> (await snapshot(page)).events.filter(e=>e.name==='resolveProjectile').length===2);
      const nextEvent=(await snapshot(page)).lastEvent;
      expect(nextEvent.modifier).toBe('spear');
      expect(nextEvent.hits.every(hit=>next.shot.hitIds.includes(hit.id))).toBe(true);
    }
  }
});

test('hiding a split playback settles it without repeating combat',async({page})=>{
  await installGame(page,{initial:{area:'chaos',round:3},stateOverride:{enemies:[fused(29)]}});
  await start(page);await paused(page);
  const shot=await aimedShot({area:'chaos',round:3,piercing:false,enemies:[fused(29)]});
  await dragPull(page,shot);await page.mouse.up();
  await advanceUntil(page,async()=>await page.getByTestId('boss-split-transition').count()>0);
  const before=await snapshot(page);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await phase(page,'idle');await page.clock.runFor(2500);
  const after=await snapshot(page);expect(after.run).toEqual(before.run);expect(after.events.length).toBe(before.events.length);
});
