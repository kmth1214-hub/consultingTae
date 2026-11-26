const {test,expect,installGame,start,dragPull,phase,snapshot,arena}=require('./support.cjs');

test('manual Alchemist explosion succeeds even with an automatic failure roll',async({page})=>{
  await installGame(page,{random:.99,initial:{inventory:{}}});
  await start(page,'연금술사맛 쿠키');
  await dragPull(page,{angleDeg:80,powerRatio:1});await page.mouse.up();
  await phase(page,'launching');
  const box=await arena(page).boundingBox();
  await page.mouse.click(box.x+box.width*.55,box.y+box.height*.45);
  await phase(page,'idle');
  const meta=(await snapshot(page)).lastShotMeta;
  expect(meta.abilityActivation.success).toBe(true);
  expect(meta.abilityActivation.source).toBe('click');
});

test('Ginger acceleration leaves only past-path ghosts',async({page})=>{
  await installGame(page,{initial:{inventory:{}}});await start(page,'용감한 쿠키');
  await page.clock.install({time:new Date('2026-11-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-11-26T00:00:01Z'));
  await dragPull(page,{angleDeg:80,powerRatio:1});await page.mouse.up();
  for(let i=0;i<70;i++){
    await page.clock.runFor(16);
    if(await page.getByTestId('projectile').getAttribute('data-dash-active')==='true')break;
  }
  await expect(page.getByTestId('projectile')).toHaveAttribute('data-dash-active','true');
  const visible=await page.getByTestId('dash-afterimage').evaluateAll(nodes=>nodes.filter(n=>n.style.visibility==='visible').length);
  expect(visible).toBe(3);
});

test('Strawberry has a collider-sized rim on a narrow screen',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await installGame(page,{initial:{inventory:{}}});await start(page,'딸기맛 쿠키');
  await page.clock.install({time:new Date('2026-11-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-11-26T00:00:01Z'));
  await dragPull(page,{angleDeg:80,powerRatio:1});await page.mouse.up();
  await page.clock.runFor(16);
  // Geometry uses the same 10-unit circle scaled by the actual expanded candy radius.
  const rim=page.getByTestId('projectile').getByTestId('strawberry-collision-rim').locator('circle');
  await expect(rim).toHaveAttribute('r','10');
});
