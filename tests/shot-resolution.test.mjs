import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameSession} from '../src/game/gameSession.js';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {buildPlayableBattlefield,findForestLogOpportunity} from '../src/game/battlefieldPlacement.js';
export const pullAt=(angle=90,powerRatio=1)=>({ready:true,powerRatio,direction:{x:Math.cos(angle*Math.PI/180),y:-Math.sin(angle*Math.PI/180)}});
const make=options=>{
 const session=createGameSession({rng:()=>.5,layoutRng:()=>0,storage:{getItem:()=>null,setItem(){}},...options});
 session.actions.startCharacterSelect();session.actions.startRun('adventurer');return session;
};
const launch=(session,pull=pullAt(),launchId=1)=>session.actions.beginShot({launchId,pull});
const commit=(s,r,extra={})=>s.actions.fireShot({shotId:r.shotId,encounterId:r.encounterId,reviewResult:true,...extra});
const settle=s=>{const snap=s.getSnapshot();if(snap.shotReview)s.actions.completeShotReview(snap.shotReview.id);
 if(snap.enemyResponse)s.actions.completeEnemyResponse(snap.enemyResponse.id);};

test('the same real completed miss cannot spend ammo, roll damage or cause a second counterattack',()=>{
 let draws=0;const s=make({rng:()=>{draws++;return .5;}}),r=launch(s);
 const first=commit(s,r);assert.equal(first.missed,true);assert.equal(first.enemyAttack.damage,5);
 assert.equal(commit(s,r).accepted,false);settle(s);
 const before=structuredClone(s.getSnapshot().run),calls=draws;
 assert.equal(commit(s,r).reason,'stale-shot');assert.deepEqual(s.getSnapshot().run,before);assert.equal(draws,calls);
 assert.equal(before.playerHp,95);assert.equal(before.ammo,2);
});
test('cancelled or old flights cannot resolve/cancel the next pending shot',()=>{
 const s=make(),a=launch(s);s.actions.cancelShot(a.shotId);
 const b=launch(s,pullAt(90,.8),2),before=structuredClone(s.getSnapshot().run);
 assert.equal(commit(s,a).accepted,false);s.actions.cancelShot(a.shotId);
 assert.equal(s.actions.useConsumable('heal').reason,'flight-pending');
 assert.equal(s.actions.fireShot().reason,'flight-pending');assert.deepEqual(s.getSnapshot().run,before);
 assert.equal(commit(s,b).accepted,true);assert.equal(s.getSnapshot().run.ammo,2);
});
test('caller copies and fabricated hits cannot alter the reserved physical collision result',()=>{
 const s=make(),r=launch(s);assert.deepEqual(r.flight.hitIds,[]);
 const id=s.getSnapshot().run.enemies[0].id;r.flight.hitIds.push(id);r.flight.contacts.push({obstacleId:'fake'});
 const event=commit(s,r,{hitIds:[id],selectedTargetId:id,shotMeta:{impactKind:'enemy'}});
 assert.equal(event.accepted,true);assert.deepEqual(event.hits,[]);assert.equal(s.getSnapshot().run.enemies[0].hp,4);
});
test('unreserved physical payloads and missing completion ids cannot mutate combat or route a screen',()=>{
 const s=make(),before=s.getSnapshot();
 s.actions.completeEnemyResponse();s.actions.completeBossTransition();s.actions.advanceBossTransition();
 assert.equal(s.getSnapshot(),before);
 assert.equal(s.actions.fireShot({shotMeta:{impactKind:'enemy'},hitIds:[before.run.enemies[0].id]}).accepted,false);
 assert.deepEqual(s.getSnapshot().run,before.run);
 for(const request of [{launchId:0,pull:pullAt()},{launchId:1,pull:pullAt(90,2)},{launchId:1,pull:{ready:true,direction:{x:0,y:0},powerRatio:.5}}])
  assert.equal(s.actions.beginShot(request).accepted,false);
});
test('entering a fresh run invalidates previous flights even when a local launch id is reused',()=>{
 const s=make(),old=launch(s);s.actions.startCharacterSelect();s.actions.startRun('adventurer');
 const next=launch(s),before=structuredClone(s.getSnapshot().run);
 assert.notEqual(old.encounterId,next.encounterId);assert.equal(commit(s,old).reason,'stale-shot');
 assert.deepEqual(s.getSnapshot().run,before);assert.equal(commit(s,next).accepted,true);
});
test('a previous clearing flight cannot affect the next round after reward progression',()=>{
 const s=make({engine:{...E,createRunState:o=>{const r=E.createRunState({...o,weapons:[{...E.WEAPON_CATALOG[0],grade:'A'}]});return r;}}});
 const run=s.getSnapshot().run,layout=buildPlayableBattlefield({area:'forest',round:1,enemies:run.enemies,seed:0});
 // A real physical log hit is enough when the first enemy has 1 HP.
 run.enemies[0].hp=1;
 const opportunity=findForestLogOpportunity(layout),r=launch(s,opportunity.pull);
 const event=commit(s,r);assert.equal(event.roundCleared,true);settle(s);
 const choice=s.getSnapshot().run.rewardChoices;
 s.actions.spinRewardSlot('stone');
 s.actions.selectReward('consumable',choice.consumables[0].choiceId);s.actions.continueAfterReward();
 const before=structuredClone(s.getSnapshot().run);assert.equal(before.round,2);
 assert.equal(commit(s,r).accepted,false);assert.deepEqual(s.getSnapshot().run,before);
});
test('canonical physical Forest collision and post-settlement chain preserve their real effect summaries',()=>{
 const s=make({layoutRng:()=>5/0x100000000,engine:{...E,createRunState:o=>{
   const r=E.createRunState(o);r.enemies.forEach(e=>{e.hp=e.maxHp=20;});return r;
 }}});
 const r=launch(s,pullAt(20,.9));
 assert.ok(r.flight.contacts.length>1);assert.ok(r.flight.contacts.some(c=>c.trigger==='obstacle'));
 const e=commit(s,r);assert.equal(e.accepted,true);
 assert.equal(new Set(e.obstacleEffects.map(f=>f.obstacleId)).size,e.obstacleEffects.length);
 assert.deepEqual(s.getSnapshot().run.toppledObstacleIds,r.flight.contacts.map(c=>c.obstacleId));
 assert.equal(e.obstacleEffects.flatMap(f=>f.hits).length,r.flight.contacts.filter(c=>c.logHit).length);
});
test('missing completion ids cannot redraw rewards or consume RNG after a clearing action',()=>{
 let draws=0;const s=make({rng:()=>{draws++;return .5;},engine:{...E,
  resolveProjectile:(run,options)=>E.resolveProjectile(run,{...options,damage:1000})}});
 s.actions.fireShot({hitIds:s.getSnapshot().run.enemies.map(e=>e.id)});
 const before=s.getSnapshot(),calls=draws;assert.equal(before.screen,'reward');
 s.actions.completeEnemyResponse();s.actions.completeBossTransition();s.actions.completeShotReview();
 assert.equal(s.getSnapshot(),before);assert.equal(draws,calls);
});
