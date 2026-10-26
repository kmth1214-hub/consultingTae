import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {buildPlayableBattlefield} from '../src/game/battlefieldPlacement.js';
import {planShot,sampleAtDistance} from '../src/game/shotGeometry.js';
function fixture(piercing=false) {
 const run=E.createRunState({area:'snow',round:1,rng:()=>.5,inventory:{spear:1},weapons:[{...E.WEAPON_CATALOG[0],grade:'A'}]});
 const layout=buildPlayableBattlefield({area:'snow',round:1,enemies:run.enemies,seed:0});
 run.enemies.slice(2).forEach(e=>{e.hp=0;e.alive=false;});
 run.toppledObstacleIds=layout.obstacles.map(o=>o.id);
 const rad=7.5*Math.PI/180;
 const shot=planShot({layout,enemies:run.enemies,toppledObstacleIds:run.toppledObstacleIds,piercing,
  pull:{ready:true,powerRatio:.95,direction:{x:Math.cos(rad),y:-Math.sin(rad)}}});
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
