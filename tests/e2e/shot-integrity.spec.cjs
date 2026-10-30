const {test,expect,installGame,start,dragPull,arena,phase,snapshot,selectRewards}=require('./support.cjs');
const {aimedShot}=require('./spear-support.cjs');
const {BattleEngine}=require('../../src/game/battleEngine.js');
const {buildPlayableBattlefield}=require('../../src/game/battlefieldPlacement.js');
async function pause(page) {
 await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
 await page.clock.runFor(240);
}
async function until(page,predicate) {
 for(let i=0;i<140;i++){if(await predicate())return;await page.clock.runFor(100);}
 throw new Error('Shot did not reach its expected playback boundary');
}
async function shootReview(page,pull) {
 await dragPull(page,pull);await page.mouse.up();
 await until(page,async()=>await arena(page).getAttribute('data-aim-phase')==='reviewing');
}

test('after all stacks fall, a visible first impact cannot remotely kill the last enemy and advance the round',async({page})=>{
 const enemies=BattleEngine.createRoundEnemies('snow',1,{rng:()=>.5});
 const layout=buildPlayableBattlefield({area:'snow',round:1,enemies,seed:0});
 enemies.forEach((e,i)=>{e.hp=i<2?1:0;e.alive=i<2;});
 await installGame(page,{initial:{area:'snow',weapons:[{...BattleEngine.WEAPON_CATALOG[0],grade:'A'},
  {...BattleEngine.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'},
  {...BattleEngine.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'}]},
  stateOverride:{enemies,toppledObstacleIds:layout.obstacles.map(o=>o.id)}});
 await start(page);await pause(page);
 await shootReview(page,{angleDeg:7.5,powerRatio:.88});
 const trace=await snapshot(page);
 expect(trace.lastEvent.hits.map(h=>h.id)).toEqual([enemies[0].id]);
 expect(trace.run.enemies[1].hp).toBe(1);expect(trace.lastEvent.roundCleared).toBe(false);
 await expect(page.getByRole('heading',{name:/눈 지역 1 \/ 3/})).toBeVisible();
 await expect(page.locator(`[data-enemy-id="${enemies[1].id}"]`).first()).toBeVisible();
 await page.screenshot({path:'tmp/shot-integrity-remote-hit-fixed.png'});
 await page.clock.runFor(4000);await phase(page,'idle');
 expect((await snapshot(page)).events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
 await expect(page.locator('.reward-screen')).toHaveCount(0);
});

for(const area of ['forest','snow','city','chaos'])test(`a full-power long ${area} miss causes exactly one response and never skips its stage`,async({page})=>{
 await installGame(page,{initial:{area,round:1}});await start(page);await pause(page);
 const before=await snapshot(page);
 await shootReview(page,{angleDeg:45,powerRatio:1});
 const after=await snapshot(page);
 expect(after.lastEvent.hits).toEqual([]);expect(after.lastEvent.obstacleEffects).toEqual([]);
 expect(after.run.enemies).toEqual(before.run.enemies);expect(after.run.round).toBe(1);
  expect(after.run.ammo).toBe(2);expect(after.lastEvent.enemyAttack).not.toBe(null);
 await page.clock.runFor(4000);await phase(page,'idle');
 const settled=await snapshot(page);expect(settled.events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
 await page.clock.runFor(5000);
 expect((await snapshot(page)).run).toEqual(settled.run);
});

test('resize cancels one flight; duplicate pointer-up and late old frames cannot resolve the next launch twice',async({page})=>{
 await installGame(page,{initial:{inventory:{fireball:1}}});await start(page);await pause(page);
 await page.keyboard.press('1');
 await dragPull(page,{angleDeg:45,powerRatio:1});await page.mouse.up();await page.clock.runFor(150);
 await page.setViewportSize({width:1430,height:900});await phase(page,'idle');
  let trace=await snapshot(page);expect(trace.run.ammo).toBe(3);expect(trace.run.fireballArmed).toBe(true);
 expect(trace.events.filter(e=>e.name==='resolveProjectile')).toHaveLength(0);
 await page.clock.runFor(5000);
 await dragPull(page,{angleDeg:45,powerRatio:1});await page.mouse.up();
 await page.evaluate(()=>document.querySelector('.battle-arena').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,button:0,isPrimary:true,pointerType:'mouse'})));
 await until(page,async()=>await arena(page).getAttribute('data-aim-phase')==='reviewing');
 await page.clock.runFor(5000);await phase(page,'idle');
 trace=await snapshot(page);expect(trace.events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
  expect(trace.run.ammo).toBe(2);expect(trace.run.fireballArmed).toBe(false);
});

test('a cancelled hidden flight cannot revive when a fresh round starts after a real clearing shot',async({page})=>{
 await installGame(page,{enemyHp:1});await start(page);await pause(page);
 await dragPull(page,{angleDeg:45,powerRatio:1});await page.mouse.up();await page.clock.runFor(100);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await phase(page,'idle');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 const pull=await aimedShot({piercing:false});
 await shootReview(page,pull);await page.clock.runFor(2100);
 await expect(page.getByRole('heading',{name:'다음 전투의 보상',exact:true})).toBeVisible();
 await selectRewards(page);await phase(page,'idle');
 const next=await snapshot(page);expect(next.run.round).toBe(2);expect(next.run.maxAmmo).toBe(4);expect(next.run.ammo).toBe(next.run.maxAmmo);
 await page.clock.runFor(8000);
 expect((await snapshot(page)).run).toEqual(next.run);
 expect((await snapshot(page)).events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
});
