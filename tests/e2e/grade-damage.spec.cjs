const {test,expect,installGame,start,dragPull,snapshot,arena}=require('./support.cjs');
const {aimedShot}=require('./spear-support.cjs');
const {BattleEngine}=require('../../src/game/battleEngine.js');
for(const [grade,range,max] of [['B','1–6',6],['A','2–10',10]])test(`${grade} HUD and a real fiery hit use the new maximum ${max}`,async({page})=>{
 await installGame(page,{random:.999,enemyHp:40,initial:{weapons:[{...BattleEngine.WEAPON_CATALOG[0],grade}],inventory:{fireball:1}}});
 await start(page);await expect(page.locator('.candy-hud')).toContainText(range);
 await page.keyboard.press('1');await expect(page.locator('.candy-hud')).toContainText('피해 ×2');
 await page.clock.install({time:new Date('2026-10-26T00:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-26T00:00:01Z'));
 const shot=await aimedShot({piercing:false});await dragPull(page,shot);await page.mouse.up();
 for(let i=0;i<100;i++){await page.clock.runFor(100);if(await arena(page).getAttribute('data-aim-phase')==='reviewing')break;}
 const trace=await snapshot(page);expect(trace.lastEvent.damage).toBe(max*2);
 expect(trace.lastEvent.hits[0].damage).toBe(max*2);expect(trace.run.enemies[0].hp).toBe(40-max*2);
 expect(trace.lastEvent.scoreDelta).toBe(max*2*(grade==='A'?4:2));
});
