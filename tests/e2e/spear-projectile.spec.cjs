const {test,expect,installGame,start,phase,snapshot,dragPull}=require('./support.cjs');
const {aimedShot}=require('./spear-support.cjs');

async function freeze(page) {
  await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
}
async function review(page) {
  for(let i=0;i<500;i++) {
    await page.clock.runFor(16);
    if(await page.locator('.battle-arena').getAttribute('data-aim-phase')==='reviewing') break;
  }
  await phase(page,'reviewing');
}
const loaded=page=>page.getByTestId('loaded-candy').locator('[data-candy-variant]');

for(const mobile of [false,true]) test(`${mobile?'phone':'desktop'} Spear remains harmless until launch, survives aim cancel, and only damages swept path contacts`,async({page})=>{
  if(mobile){await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
  await installGame(page,{initial:{area:'snow',inventory:{spear:1}},enemyHp:20});await start(page);
  const original=structuredClone((await snapshot(page)).run.enemies);
  await page.getByRole('button',{name:'창 사용',exact:true}).click();
  const prepared=await snapshot(page);
  expect(prepared.run.enemies).toEqual(original);expect(prepared.lastEvent.hits).toEqual([]);
  expect(prepared.run.ammo).toBe(9);expect(prepared.run.spearArmed).toBe(true);
  await expect(loaded(page)).toHaveAttribute('data-candy-variant','spear');
  await expect(page.locator('.candy-status-chips')).toContainText('관통');
  const aimed=await aimedShot({area:'snow'});
  await dragPull(page,aimed);await page.keyboard.press('Escape');await page.mouse.up();await phase(page,'idle');
  expect((await snapshot(page)).run.spearArmed).toBe(true);
  await freeze(page);await dragPull(page,aimed);
  await page.clock.runFor(240);
  await page.screenshot({path:`tmp/spear-loaded-${mobile?'phone':'desktop'}.png`});
  await page.mouse.up();await phase(page,'launching');
  await expect(page.getByTestId('projectile')).toHaveAttribute('data-projectile-kind','spear');
  if(!mobile) {await page.clock.runFor(240);await page.screenshot({path:'tmp/spear-flight.png'});}
  await review(page);
  const trace=await snapshot(page), hitIds=aimed.shot.hitIds;
  expect(trace.lastEvent.hits.map(h=>h.id)).toEqual(hitIds);
  expect(trace.lastEvent.hits.map(h=>h.damage)).toEqual(hitIds.map((_,i)=>4-i));
  for(const enemy of trace.run.enemies) {
    const index=hitIds.indexOf(enemy.id);
    expect(enemy.hp).toBe(index<0?20:20-(4-index));
  }
  expect(trace.run.spearArmed).toBe(false);expect(trace.run.ammo).toBe(8);
  expect(await page.getByTestId('spear-path-contact').evaluateAll(nodes=>nodes.map(n=>n.dataset.enemyId))).toEqual(hitIds);
  expect(trace.events.filter(e=>e.name==='resolveProjectile')).toHaveLength(1);
});

test('a missed Spear shot consumes the prepared modifier without selecting remote enemies',async({page})=>{
  await installGame(page,{initial:{area:'snow',inventory:{spear:1}}});await start(page);
  const before=(await snapshot(page)).run.enemies;
  await page.keyboard.press('2');await freeze(page);
  await dragPull(page,{angleDeg:-5,powerRatio:.08});await page.mouse.up();await review(page);
  const trace=await snapshot(page);
  expect(trace.run.enemies).toEqual(before);expect(trace.lastEvent.hits).toEqual([]);
  expect(trace.run.spearArmed).toBe(false);await expect(page.getByTestId('spear-path-contact')).toHaveCount(0);
});

test('Fireball has a flame silhouette in the pouch and in flight, doubles the actual hit and returns to normal after consumption',async({page})=>{
  await installGame(page,{initial:{inventory:{fireball:1}},enemyHp:20});await start(page);
  await page.keyboard.press('1');await expect(loaded(page)).toHaveAttribute('data-candy-variant','fireball');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(20);
  await freeze(page);await dragPull(page,await aimedShot({piercing:false}));
  await page.clock.runFor(240);
  await page.screenshot({path:'tmp/fireball-loaded.png'});
  await page.mouse.up();await phase(page,'launching');
  await expect(page.getByTestId('projectile')).toHaveAttribute('data-projectile-kind','fireball');
  await page.clock.runFor(240);await page.screenshot({path:'tmp/fireball-flight.png'});
  await review(page);
  const trace=await snapshot(page);
  expect(trace.lastEvent.damage).toBe(4);expect(trace.run.enemies[0].hp).toBe(16);
  expect(trace.run.fireballArmed).toBe(false);
  await expect(page.getByTestId('projectile')).toHaveAttribute('data-projectile-kind','fireball');
  await expect(loaded(page)).toHaveAttribute('data-candy-variant','normal');
});
