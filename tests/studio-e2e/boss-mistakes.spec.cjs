const {test,expect,installGame,dragPull,phase,snapshot}=require('../e2e/support.cjs');

test('studio plays a giant boss mistake and can switch directly to its guaranteed special without persisting progress',async({page})=>{
  await installGame(page,{random:.96});
  await page.addInitScript(()=>localStorage.setItem('cookie-roguelike.profile.v1',JSON.stringify({version:1,snowAreaCleared:false})));
  await page.goto('/__dev/maps');
  await page.getByLabel('지역 선택').selectOption('city');
  await page.getByLabel('테스트 라운드').selectOption('3');
  await page.getByRole('button',{name:'테스트 플레이',exact:true}).click();
  await phase(page,'idle');
  await expect(page.locator('.monster--boss')).toHaveCSS('width','414px');
  await expect(page.getByTestId('boss-health')).toBeInViewport();
  await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
  async function counter() {
    await dragPull(page,{angleDeg:-5,powerRatio:.08});await page.mouse.up();
    for(let i=0;i<420;i++){await page.clock.runFor(16);if(await page.getByTestId('enemy-attack').count())break;}
  }
  await counter();
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-miss-style','slip');
  expect((await snapshot(page)).run.playerHp).toBe(100);
  await page.clock.runFor(240);
  await page.screenshot({path:'tmp/studio-giant-boss-slip.png'});
  await page.getByRole('checkbox',{name:'보스 특수 공격부터 확인',exact:true}).check();
  await page.getByRole('button',{name:'선택한 전투 시작',exact:true}).click();
  await phase(page,'idle');await counter();
  await expect(page.getByTestId('enemy-attack')).toHaveAttribute('data-special','oven-overheat');
  expect((await snapshot(page)).lastEvent.enemyAttack.missed).toBe(false);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('cookie-roguelike.profile.v1')))).toEqual({version:1,snowAreaCleared:false});
});
