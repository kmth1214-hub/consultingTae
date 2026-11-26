import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as E } from '../src/game/battleEngine.js';
import { buildBattlefield } from '../src/game/battlefieldModel.js';
import { collectVentHits, preparePhysicalFlight, flightResultPayload } from '../src/game/shotResolution.js';
import { pullAt } from './helpers/physical-shot.mjs';
const create = () => E.createRunState({ area:'city', round:3, inventory:{}, rng:()=>0 });
const layout = s => buildBattlefield({ area:s.area, round:s.round, enemies:s.enemies });
function expose(s) { s.enemies[0].attackCount = 2; return s.enemies[0]; }
function fire(s, extra={}) {
  const boss=s.enemies[0];
  return E.resolveProjectile(s,{hitIds:[boss.id],damage:0,rng:()=>.5,
    shotMeta:{ventHits:[{enemyId:boss.id,point:{x:0,y:0},time:0}]},...extra});
}
test('vent is exposed only before city oven third attack, shares the world collider',()=>{
  const s=create(); assert.equal(layout(s).enemies[0].vent,undefined);
  expose(s);const slot=layout(s).enemies[0];
  assert.equal(slot.vent.x,slot.collider.x-slot.collider.radius);
  assert.equal(slot.vent.radius,slot.size*.18);
  s.enemies[0].ventWeakened=true;assert.equal(layout(s).enemies[0].vent,undefined);
  s.area='chaos';assert.equal(layout(s).enemies[0].vent,undefined);
});
test('direct physical contacts hit vent; torso, child and explosion contacts cannot',()=>{
  const s=create(),boss=expose(s),l=layout(s),v=l.enemies[0].vent;
  const flight={hitIds:[],candyRadius:10,enemyContacts:[{id:boss.id,point:{x:v.x,y:v.y},time:.5}]};
  assert.equal(collectVentHits(l,flight).length,1);
  flight.enemyContacts[0].point.y+=v.radius+11;assert.deepEqual(collectVentHits(l,flight),[]);
  flight.enemyContacts=[];flight.childHits=[{enemyId:boss.id,point:v}];
  assert.deepEqual(collectVentHits(l,flight),[]);
  const prepared=preparePhysicalFlight(s,pullAt(90,.2),1,1,0);
  assert.deepEqual(flightResultPayload(prepared).shotMeta.ventHits,prepared.ventHits);
});
test('zero damage vent hit halves overheat and cancels ammo loss/healing; ice stacks',()=>{
  for(const ice of [false,true]){
    const s=create(),b=expose(s);b.hp=10;if(ice)s.nextAttackDamageMultiplier=.5;
    const ev=fire(s);assert.equal(ev.enemyAttack.overheatWeakened,true);
    assert.equal(ev.enemyAttack.damage,ice?2:4);
    assert.equal(ev.enemyAttack.ammoLost,0);assert.equal(ev.enemyAttack.healedEnemy,0);
    assert.equal(b.hp,10);assert.equal(b.ventWeakened,false);
    assert.equal(s.ammo,2);
  }
});
test('a real planned shot carries the vent collision through the engine payload',()=>{
  const s=create();expose(s);s.layoutSeed=0;
  const flight=preparePhysicalFlight(s,pullAt(16,.96),1,1,0);
  assert.equal(flight.ventHits.length,1);
  const ev=E.resolveProjectile(s,{...flightResultPayload(flight),damage:0,rng:()=>.5});
  assert.equal(ev.enemyAttack.overheatWeakened,true);
});
test('freeze preserves weakness until actual overheat; defenses consume it; kill skips response',()=>{
  const s=create(),b=expose(s);b.frozenNextAttack=true;
  assert.equal(fire(s).enemyAttack.frozenSkip,true);assert.equal(b.ventWeakened,true);
  assert.equal(b.attackCount,2);s.defenseArmed=true;
  const ev=E.resolveEnemyTurn(s,()=>.5);assert.equal(ev.blocked,true);
  assert.equal(ev.overheatWeakened,true);assert.equal(b.ventWeakened,false);
  const dead=create();expose(dead);assert.equal(fire(dead,{damage:100}).enemyAttack,null);
});
