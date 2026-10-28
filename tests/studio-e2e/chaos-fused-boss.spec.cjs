const {test,expect,installGame,phase,arena,dragPull,snapshot}=require('../e2e/support.cjs');
const {aimedShot}=require('../e2e/spear-support.cjs');

test('studio Chaos final uses the fused special and real split without persisting or submitting records',async({page})=>{
  const requests=[];page.on('request',r=>{if(r.url().includes('/api/'))requests.push(r.url());});
  const enemy={id:'chaos-fused-boss',kind:'chaos-fused-boss',hp:29,maxHp:56,isBoss:true,attackCount:0,normalAttackCount:0,alive:true};
  await installGame(page,{stateOverride:{enemies:[enemy]}});
  await page.addInitScript(()=>localStorage.setItem('cookie-roguelike.profile.v1','{"version":1,"snowAreaCleared":false}'));
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('chaos');
  await page.getByLabel('테스트 라운드').selectOption('3');
  await page.getByRole('checkbox',{name:'보스 특수 공격부터 확인',exact:true}).check();
  await page.getByRole('button',{name:'테스트 플레이',exact:true}).click();await phase(page,'idle');
  expect((await snapshot(page)).run.enemies[0].hp).toBe(29);
  await expect(page.locator('.monster--boss')).toHaveCSS('width','621px');
  await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  await dragPull(page,{angleDeg:-5,powerRatio:.08});await page.mouse.up();
  for(let i=0;i<120;i++){await page.clock.runFor(100);if(await page.getByTestId('enemy-attack').count())break;}
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-special','frozen-breath');
  await expect(page.locator('.enemy-warning')).toContainText('혼돈의 융합 군주');
  await page.clock.runFor(2400);await phase(page,'idle');
  const shot=await aimedShot({area:'chaos',round:3,piercing:false,enemies:[enemy],worldScale:1.5});
  await dragPull(page,shot);await page.mouse.up();
  for(let i=0;i<150;i++){await page.clock.runFor(100);if(await page.getByTestId('boss-split-transition').count())break;}
  await expect(arena(page)).toHaveAttribute('data-aim-phase','splitting');
  await page.clock.runFor(450);await page.screenshot({path:'tmp/studio-chaos-split.png'});
  await page.clock.runFor(2400);await phase(page,'idle');
  await expect(page.locator('.monster--boss')).toHaveCount(3);
  expect((await snapshot(page)).run.enemies.reduce((n,e)=>n+e.hp,0)).toBe(27);
  expect(requests).toEqual([]);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1')))).toEqual({version:1,snowAreaCleared:false});
  await page.getByRole('button',{name:'다시 시작',exact:true}).click();await phase(page,'idle');
  await expect(page.locator('.monster--boss')).toHaveCount(1);
  await expect(page.locator('.monster--boss')).toHaveAttribute('aria-label',/체력 56\/56/);
});
