import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {buildPlayableBattlefield} from '../src/game/battlefieldPlacement.js';
import {planShot,sampleAtDistance} from '../src/game/shotGeometry.js';
import {createStudioSession} from '../src/dev/createStudioSession.js';
function fixture(piercing=false) {
 const run=E.createRunState({area:'snow',round:1,rng:()=>.5,inventory:{spear:1},weapons:[{...E.WEAPON_CATALOG[0],grade:'A'}]});
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
 run.weapons.push({id:'wind-candy',grade:'C'});run.enemies[0].hp=1;
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
