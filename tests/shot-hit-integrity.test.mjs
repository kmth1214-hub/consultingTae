import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {buildPlayableBattlefield} from '../src/game/battlefieldPlacement.js';
import {planShot,sampleAtDistance} from '../src/game/shotGeometry.js';
import {createStudioSession} from '../src/dev/createStudioSession.js';
function fixture(piercing=false) {
 const run=E.createRunState({area:'snow',round:1,rng:()=>.5,inventory:{spear:1},weapons:[
  {...E.WEAPON_CATALOG[0],grade:'A'},
  {...E.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'},
  {...E.WEAPON_CATALOG.find(w=>w.id==='basic-stone'),grade:'C'}]});
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
 run.weapons.push({id:'wind-candy',instanceId:'wind-test',grade:'C'});run.weaponQueue[0]='wind-test';run.currentWeaponId='wind-test';run.enemies[0].hp=1;
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
 assert.equal(event.accepted,true);
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

test('only a reserved Alchemist impact can supply splash contacts; Spear replaces that ability', () => {
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
 assert.ok(reserved.flight.abilityContacts.length);
 const event=session.actions.fireShot({shotId:reserved.shotId,encounterId:reserved.encounterId,
  shotMeta:{abilityContacts:[{targetIds:run.enemies.map(e=>e.id),radius:999}]}});
 assert.equal(event.accepted,true);
 assert.ok(event.shotMeta.abilityContacts.length);
 assert.equal(event.shotMeta.abilityContacts.every(c=>c.radius===180),true);
 const spearSession=createStudioSession({area:'forest',round:2,characterId:'alchemist',seed:0},{rng:()=>.5});
 assert.equal(spearSession.actions.useConsumable('spear').accepted,true);
 const spear=spearSession.actions.beginShot({launchId:2,pull:chosen});
 assert.equal(spear.accepted,true);
 assert.equal(spear.flight.abilityContacts,undefined);
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
 assert.equal(reservation.flight.splitOrbs?.children.length,2);
 const event=session.actions.fireShot({shotId:reservation.shotId,encounterId:reservation.encounterId,
  shotMeta:{childHits:[{orbId:'left',enemyId:'fake',time:0}]}});
 assert.equal(event.accepted,true);
 assert.equal(event.shotMeta.childHits.length,
  reservation.flight.splitOrbs.children.filter(child=>child.hit).length);
 assert.equal(event.shotMeta.splitTime,reservation.flight.splitOrbs.splitTime);
 assert.deepEqual(session.getSnapshot().run.toppledObstacleIds,
  reservation.flight.contacts.map(contact=>contact.obstacleId));
});
