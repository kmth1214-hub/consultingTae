import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {buildPlayableBattlefield} from '../src/game/battlefieldPlacement.js';
import {planShot,sampleAtDistance,activatePlannedAbility} from '../src/game/shotGeometry.js';
import {buildBattlefield} from '../src/game/battlefieldModel.js';
import {createStudioScenario,createStudioSession} from '../src/dev/createStudioSession.js';
function fixture(piercing=false) {
 const run=E.createRunState({area:'snow',round:1,rng:()=>.5,inventory:{spear:1},weapons:[
  {...E.WEAPON_CATALOG[0],grade:'A'},
  {...E.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'},
  {...E.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'}]});
 // Preserve the original five-slot collision fixture independently of regional pacing.
 run.enemies=Array.from({length:5},(_,i)=>({...run.enemies[0],id:`collision-${i}`,kind:i?'snowball':'dry-ice'}));
 const layout=buildPlayableBattlefield({area:'snow',round:1,enemies:run.enemies,seed:0});
 run.enemies.slice(2).forEach(e=>{e.hp=0;e.alive=false;});
 run.toppledObstacleIds=layout.obstacles.map(o=>o.id);
 const rad=7.5*Math.PI/180;
 const shot=planShot({layout,enemies:run.enemies,toppledObstacleIds:run.toppledObstacleIds,piercing,
  pull:{ready:true,powerRatio:.88,direction:{x:Math.cos(rad),y:-Math.sin(rad)}}});
 return {run,layout,shot};
}
const meta=shot=>({contacts:[],directHitTime:shot.directHitTime,...(shot.enemyContacts?{enemyContacts:shot.enemyContacts}:{})});
test('an ordinary candy stops at its first real contact and cannot kill the last enemy behind it',()=>{
 const {run,layout,shot}=fixture();
 const point=sampleAtDistance(shot.path,shot.impactDistance);
 assert.ok(point.x<1000);assert.equal(layout.enemies[1].collider.x,1330);
 const event=E.resolveProjectile(run,{hitIds:shot.hitIds,shotMeta:meta(shot),rng:()=>.999});
 assert.equal(run.enemies[0].alive,false);
 assert.equal(run.enemies[1].hp,4,'enemy beyond the impact must remain alive');
 assert.equal(event.roundCleared,false);assert.equal(run.terminal,null);
 assert.deepEqual(shot.hitIds,[run.enemies[0].id]);
});
test('the physical engine boundary also rejects extra ordinary targets beyond the one candy impact',()=>{
 const {run,shot}=fixture();
 E.resolveProjectile(run,{hitIds:run.enemies.slice(0,2).map(e=>e.id),shotMeta:meta(shot),rng:()=>.999});
 assert.equal(run.enemies[1].hp,4);
});
test('Adventurer rebound independently rolls damage for each monster it physically touches',()=>{
 const run=E.createRunState({area:'forest',round:2,rng:()=>.5,weapons:[
  {...E.WEAPON_CATALOG.find(w=>w.id==='adventurer-candy'),grade:'A'}]});
 const layout=buildBattlefield({area:'forest',round:2,enemies:[]});
 const rad=30*Math.PI/180,pull={ready:true,powerRatio:.55,
  direction:{x:Math.cos(rad),y:-Math.sin(rad)}};
 const open=planShot({layout,pull,enemies:[]});
 const first=sampleAtDistance(open.path,open.path.length*.35);
 layout.enemies=[{id:run.enemies[0].id,collider:{id:run.enemies[0].id,x:first.x,y:first.y,radius:20}}];
 const firstShot=planShot({layout,pull,enemies:run.enemies,loadedCandyId:'adventurer-candy',loadedCandyGrade:'A'});
 const second=firstShot.path.samples.find(point=>point.time>=firstShot.bounces[0].time+.18);
 layout.enemies.push({id:run.enemies[1].id,collider:{id:run.enemies[1].id,x:second.x,y:second.y,radius:20}});
 const shot=planShot({layout,pull,enemies:run.enemies,loadedCandyId:'adventurer-candy',loadedCandyGrade:'A'});
 assert.equal(shot.hitIds.length,2);
 run.enemies.slice(0,2).forEach(enemy=>{enemy.hp=20;enemy.maxHp=20;});
 run.enemies.slice(2).forEach(enemy=>{enemy.hp=0;enemy.alive=false;});
 let draws=0;
 const event=E.resolveProjectile(run,{hitIds:shot.hitIds,shotMeta:meta(shot),
  rng:()=>draws++===0?.5:.999});
 assert.deepEqual(event.hits.map(hit=>hit.damage),[6,10]);
 assert.equal(run.enemies[0].hp,14);assert.equal(run.enemies[1].hp,10);
 assert.equal(draws,2);
});
test('Spear may hit the same second enemy only by actually continuing into its collider',()=>{
 const {run,layout,shot}=fixture(true);E.useConsumable(run,'spear');
 assert.equal(shot.hitIds.length,2);
 for(const hit of shot.enemyContacts){const c=layout.enemies.find(e=>e.id===hit.id).collider;
  assert.ok(Math.hypot(hit.point.x-c.x,hit.point.y-c.y)<=c.radius+layout.candyRadius+1e-3);}
 const event=E.resolveProjectile(run,{hitIds:shot.hitIds,shotMeta:meta(shot),rng:()=>.999});
 assert.deepEqual(event.hits.map(h=>h.id),shot.hitIds);assert.equal(event.roundCleared,true);
});
test('even a physical Wind override cannot introduce a second non-piercing damage target',()=>{
 const {run,shot}=fixture();
 run.weapons.push({id:'wind-candy',instanceId:'wind-test',grade:'C'});run.weaponQueue[0]='wind-test';run.currentWeaponId='wind-test';run.enemies[0].hp=1;run.windArmedMode='homing';
 E.resolveProjectile(run,{selectedTargetId:run.enemies[0].id,hitIds:[run.enemies[1].id],damage:10,shotMeta:meta(shot),rng:()=>.5});
 assert.equal(run.enemies[0].hp,0);assert.equal(run.enemies[1].hp,4);
});

test('a reserved studio shot topples the support, scores only actual rider fall damage, and preserves the landing position', () => {
 const session=createStudioSession({area:'forest',round:2,seed:0},{rng:()=>.5,now:()=>1000});
 const before=session.getSnapshot().run;
 const layout=buildPlayableBattlefield({area:'forest',round:2,enemies:before.enemies,seed:before.layoutSeed,
  prototype:before.studioPrototype});
 const support=layout.obstacles.find(o=>o.supportsEnemyId);
 const angle=9*Math.PI/180,pull={ready:true,powerRatio:1,direction:{x:Math.cos(angle),y:-Math.sin(angle)}};
 const planned=planShot({layout,pull,enemies:before.enemies});
 const contact=planned.contacts.find(c=>c.obstacleId===support.id);
 assert.ok(contact?.riderMotion);assert.notEqual(contact.logHit?.id,support.supportsEnemyId);
 const reservation=session.actions.beginShot({launchId:1,pull});
 assert.equal(reservation.accepted,true);
 const event=session.actions.fireShot({shotId:reservation.shotId,encounterId:reservation.encounterId,
  shotMeta:{riderFalls:[{enemyId:'forged',fallDamage:999}]}});
 assert.equal(event.accepted,true,JSON.stringify(event));
 const fallHit=event.hits.find(hit=>hit.source==='rider-fall');
 assert.equal(fallHit?.id,support.supportsEnemyId);
 assert.equal(fallHit.damage,contact.riderMotion.fallDamage);
 assert.equal(event.shotMeta.riderFalls[0].enemyId,support.supportsEnemyId);
 assert.equal(event.shotMeta.contacts.some(c=>'riderMotion'in c),false);
 const after=session.getSnapshot().run;
 assert.equal(after.enemyLandingPositions[fallHit.id].y,900);
 const next=buildPlayableBattlefield({area:'forest',round:2,enemies:after.enemies,seed:after.layoutSeed,
  prototype:after.studioPrototype,enemyLandingPositions:after.enemyLandingPositions});
 assert.equal(next.enemies.find(e=>e.id===fallHit.id).collider.x,after.enemyLandingPositions[fallHit.id].x);
 assert.ok(after.toppledObstacleIds.includes(support.id));
});

test('only a reserved Alchemist activation can supply explosion contacts; Spear replaces that ability', () => {
 const session=createStudioSession({area:'forest',round:2,characterId:'alchemist',seed:0},{rng:()=>.5,now:()=>1000});
 const run=session.getSnapshot().run;
 const exclusive=run.weapons.find(weapon=>weapon.id==='alchemist-candy');
 run.weaponQueue=[exclusive.instanceId,...run.weaponQueue.filter(id=>id!==exclusive.instanceId)];
 run.currentWeaponId=exclusive.instanceId;
 const layout=buildPlayableBattlefield({area:'forest',round:2,enemies:run.enemies,seed:0,
  prototype:run.studioPrototype});
 let chosen;
 for (let angle=5;angle<=65&&!chosen;angle+=5) for (let power=.35;power<=1&&!chosen;power+=.15) {
  const rad=angle*Math.PI/180,pull={ready:true,powerRatio:Math.min(power,1),
   direction:{x:Math.cos(rad),y:-Math.sin(rad)}};
  const shot=planShot({layout,pull,enemies:run.enemies,prototype:run.studioPrototype,
   loadedCandyId:'alchemist-candy'});
  if (shot?.abilityContacts?.length) chosen=pull;
 }
 assert.ok(chosen);
 assert.equal(session.actions.fireShot({shotMeta:{abilityContacts:[{targetIds:run.enemies.map(e=>e.id)}]}}).accepted,false);
 const reserved=session.actions.beginShot({launchId:1,pull:chosen});
 assert.equal(reserved.accepted,true);
 assert.equal(reserved.flight.abilityContacts,undefined);
 const activated=session.actions.activateFlightAbility({shotId:reserved.shotId,encounterId:reserved.encounterId,
  simulationTime:Math.min(.12,(reserved.flight.abilityDeadlineTime??.24)/2),source:'space'});
 assert.equal(activated.accepted,true);
 assert.equal(activated.flight.abilityContacts.length,1);
 assert.equal(session.actions.activateFlightAbility({shotId:reserved.shotId,encounterId:reserved.encounterId,
  simulationTime:.13,source:'click'}).accepted,false);
 const event=session.actions.fireShot({shotId:reserved.shotId,encounterId:reserved.encounterId,
  shotMeta:{abilityContacts:[{targetIds:run.enemies.map(e=>e.id),radius:999}]}});
 assert.equal(event.accepted,true,JSON.stringify(event));
 assert.ok(event.shotMeta.abilityContacts.length);
 assert.equal(event.shotMeta.abilityContacts.every(c=>c.radius===300),true);
 const spearSession=createStudioSession({area:'forest',round:2,characterId:'alchemist',seed:0},{rng:()=>.5});
 assert.equal(spearSession.actions.useConsumable('spear').accepted,true);
 const spear=spearSession.actions.beginShot({launchId:2,pull:chosen});
 assert.equal(spear.accepted,true);
 assert.equal(spear.flight.abilityContacts,undefined);
});

test('Alchemist manual activation consumes the stone at its actual point without a grade roll', () => {
 for (const [roll, success] of [[.1, true], [.9, true]]) {
  let draws = 0;
  const session = createStudioSession({area:'forest',round:1,characterId:'alchemist',seed:0},
   {rng:()=>{draws++;return roll;},now:()=>1000});
  const run = session.getSnapshot().run;
  const exclusive = run.weapons.find(weapon=>weapon.id==='alchemist-candy');
  run.weaponQueue=[exclusive.instanceId,...run.weaponQueue.filter(id=>id!==exclusive.instanceId)];
  run.currentWeaponId=exclusive.instanceId;
  const angle=40*Math.PI/180;
  const reserved=session.actions.beginShot({launchId:25,pull:{ready:true,powerRatio:.7,
   direction:{x:Math.cos(angle),y:-Math.sin(angle)}}});
  assert.equal(reserved.accepted,true);
  const time=Math.min(.2,(reserved.flight.abilityDeadlineTime??.4)/2);
  const before=draws;
  const activated=session.actions.activateFlightAbility({shotId:reserved.shotId,
   encounterId:reserved.encounterId,simulationTime:time,source:'click'});
  assert.equal(activated.accepted,true);
  assert.equal(draws,before);
  assert.equal(activated.flight.abilityActivation.success,success);
  assert.equal(activated.flight.abilityActivation.radius,300);
  assert.equal(activated.flight.abilityContacts[0].success,success);
  assert.equal(activated.flight.impactKind,'explosion');
  assert.equal(activated.flight.path.durationSeconds,time);
  assert.deepEqual(activated.flight.hitIds,[]);
  assert.equal(session.actions.activateFlightAbility({shotId:reserved.shotId,
   encounterId:reserved.encounterId,simulationTime:time,source:'space'}).accepted,false);
 }
});

test('Alchemist auto contact and delayed ground activation obey the reserved deadline', () => {
 const session=createStudioSession({area:'forest',round:1,characterId:'alchemist',seed:0},{rng:()=>.9});
 const run=session.getSnapshot().run;
 const exclusive=run.weapons.find(weapon=>weapon.id==='alchemist-candy');
 run.weaponQueue=[exclusive.instanceId,...run.weaponQueue.filter(id=>id!==exclusive.instanceId)];
 run.currentWeaponId=exclusive.instanceId;
 const angle=20*Math.PI/180;
 const reservation=session.actions.beginShot({launchId:26,pull:{ready:true,powerRatio:.5,
  direction:{x:Math.cos(angle),y:-Math.sin(angle)}}});
 assert.equal(reservation.accepted,true);
 const base=reservation.flight;
 if(base.impactKind==='ground') {
  assert.equal(base.abilityDeadlineTime,base.path.durationSeconds+.5);
  assert.equal(session.actions.activateFlightAbility({shotId:reservation.shotId,
   encounterId:reservation.encounterId,simulationTime:base.abilityDeadlineTime+.01,source:'click'}).accepted,false);
 }
 const event=session.actions.fireShot({shotId:reservation.shotId,encounterId:reservation.encounterId});
 assert.equal(event.accepted,true);
 assert.equal(event.shotMeta.abilityContacts[0].kind,'explosion');
 assert.equal(event.shotMeta.abilityContacts[0].success,false);
 assert.deepEqual(event.shotMeta.abilityContacts[0].targetIds,[]);
});

test('all Alchemist grades guarantee manual click/space while automatic boundaries roll once',()=>{
 for(const [grade,chance,radius] of [['C',.2,300],['B',.45,375],['A',.7,450]])
 for(const source of ['click','space','auto-ground']) for(const roll of [chance-.001,chance]){
  let draws=0;
  const session=createStudioSession({area:'forest',round:1,characterId:'alchemist',weaponGrade:grade,seed:0},
   {rng:()=>{draws++;return roll;}});
  const r=session.actions.beginShot({launchId:99,pull:{ready:true,powerRatio:.08,direction:{x:1,y:.1}}});
  assert.equal(r.accepted,true);
  const time=source==='auto-ground'?r.flight.abilityDeadlineTime:.01;
  const before=draws;
  const options={shotId:r.shotId,encounterId:r.encounterId,simulationTime:time,source};
  const result=session.actions.activateFlightAbility(options);
  assert.equal(result.accepted,true);
  assert.equal(draws-before,source==='auto-ground'?1:0);
  assert.equal(result.flight.abilityActivation.success,source!=='auto-ground'||roll<chance);
  assert.equal(result.flight.abilityActivation.radius,radius);
  assert.equal(session.actions.activateFlightAbility(options).accepted,false);
  assert.equal(draws-before,source==='auto-ground'?1:0);
 }
});

test('a reserved Wizard shot owns its two child trajectories and rejects fabricated child metadata', () => {
 const session=createStudioSession({area:'forest',round:2,characterId:'wizard',seed:0},{rng:()=>.5});
 const run=session.getSnapshot().run;
 const exclusive=run.weapons.find(weapon=>weapon.id==='wizard-orb');
 run.weaponQueue=[exclusive.instanceId,...run.weaponQueue.filter(id=>id!==exclusive.instanceId)];
 run.currentWeaponId=exclusive.instanceId;
 const angle=40*Math.PI/180,pull={ready:true,powerRatio:.7,
  direction:{x:Math.cos(angle),y:-Math.sin(angle)}};
 const reservation=session.actions.beginShot({launchId:3,pull});
 assert.equal(reservation.accepted,true);
 assert.equal(reservation.flight.splitOrbs,undefined);
 const activated=session.actions.activateFlightAbility({shotId:reservation.shotId,encounterId:reservation.encounterId,
  simulationTime:Math.min(.2,(reservation.flight.abilityDeadlineTime??.4)/2),source:'click'});
 assert.equal(activated.accepted,true);
 assert.equal(activated.flight.splitOrbs?.children.length,2);
 const event=session.actions.fireShot({shotId:reservation.shotId,encounterId:reservation.encounterId,
  shotMeta:{childHits:[{orbId:'left',enemyId:'fake',time:0}]}});
 assert.equal(event.accepted,true);
 assert.equal(event.shotMeta.childHits.length,
  activated.flight.splitOrbs.children.filter(child=>child.hit).length);
 assert.equal(event.shotMeta.splitTime,activated.flight.splitOrbs.splitTime);
 assert.deepEqual(session.getSnapshot().run.toppledObstacleIds,
  activated.flight.contacts.map(contact=>contact.obstacleId));
});

test('a direct Wizard hit automatically splits after impact and children pass the struck enemy', () => {
 const session=createStudioSession({area:'forest',round:2,characterId:'wizard',seed:0},{rng:()=>.5});
 const run=session.getSnapshot().run;
 const exclusive=run.weapons.find(weapon=>weapon.id==='wizard-orb');
 run.weaponQueue=[exclusive.instanceId,...run.weaponQueue.filter(id=>id!==exclusive.instanceId)];
 run.currentWeaponId=exclusive.instanceId;
 const radians=60*Math.PI/180;
 const reserved=session.actions.beginShot({launchId:42,pull:{ready:true,powerRatio:.31,
  direction:{x:Math.cos(radians),y:-Math.sin(radians)}}});
 assert.equal(reserved.accepted,true);
 const base=reserved.flight;
 assert.equal(base.hitIds.length,1);
 const initialHp=run.enemies.find(enemy=>enemy.id===base.hitIds[0]).hp;
 assert.equal(base.abilityDeadlineTime,base.directHitTime);
 assert.equal(base.splitOrbs,undefined);
 const activated=session.actions.activateFlightAbility({shotId:reserved.shotId,
  encounterId:reserved.encounterId,simulationTime:base.abilityDeadlineTime,source:'auto-contact'});
 assert.equal(activated.accepted,true);
 assert.equal(activated.flight.abilityActivation.source,'auto-contact');
 assert.equal(activated.flight.splitOrbs.children.length,2);
 assert.equal(activated.flight.splitOrbs.splitTime,base.directHitTime);
 assert.ok(activated.flight.splitOrbs.children.every(child=>child.hit?.enemyId!==base.hitIds[0]));
 const event=session.actions.fireShot({shotId:reserved.shotId,encounterId:reserved.encounterId});
 assert.equal(event.accepted,true);
 assert.ok(session.getSnapshot().run.enemies.find(enemy=>enemy.id===base.hitIds[0]).hp<initialHp);
 assert.equal(event.shotMeta.abilityActivation.source,'auto-contact');
 assert.ok(event.shotMeta.childHits.every(hit=>hit.enemyId!==base.hitIds[0]));
});

test('automatic Wizard split can physically strike an enemy behind the first target', () => {
 const scenario=createStudioScenario({area:'forest',round:2,characterId:'wizard',seed:0});
 const layout=structuredClone(scenario.layout);
 const secondId=scenario.enemies[1].id;
 const second=layout.enemies.find(enemy=>enemy.id===secondId);
 second.collider={...second.collider,x:1078,y:798};
 const radians=60*Math.PI/180,pull={ready:true,powerRatio:.31,
  direction:{x:Math.cos(radians),y:-Math.sin(radians)}};
 const base=planShot({layout,enemies:scenario.enemies,pull,loadedCandyId:'wizard-orb',deferAbility:true});
 assert.deepEqual(base.hitIds,[scenario.enemies[0].id]);
 const activated=activatePlannedAbility({baseFlight:{...base,powerRatio:pull.powerRatio,flightStartMs:0},
  layout,enemies:scenario.enemies,kind:'split',time:base.directHitTime,source:'auto-contact'});
 assert.equal(activated.splitOrbs.children.length,2);
 assert.ok(activated.splitOrbs.children.some(child=>child.hit?.enemyId===secondId));
 assert.ok(activated.splitOrbs.children.every(child=>child.hit?.enemyId!==base.hitIds[0]));
});
