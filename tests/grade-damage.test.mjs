import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleEngine as E} from '../src/game/battleEngine.js';
import {getCandyDetails} from '../src/game/candyPresentation.js';
const weapon=(id,grade='A')=>({...E.WEAPON_CATALOG.find(w=>w.id===id),grade});
const run=weapons=>E.createRunState({area:'chaos',round:3,weapons,inventory:{fireball:1,spear:1},rng:()=>.5});

test('grade tables preserve five weighted buckets and C-only zero protection',()=>{
  const samples=[0,.019999,.02,.419999,.420001,.819999,.820001,.919999,.920001,1];
  const buckets=[0,0,1,1,2,2,3,3,4,4];
  for(const [grade,table] of Object.entries({C:[0,1,2,3,4],B:[1,2,3,5,6],A:[2,4,6,8,10]})) {
    samples.forEach((sample,i)=>assert.equal(E.rollWeaponDamage(()=>sample,grade,0),table[buckets[i]]));
    assert.equal(E.rollWeaponDamage(()=>0,grade,2),grade==='C'?1:table[0]);
    assert.equal(E.rollWeaponDamage(()=>-1,grade.toLowerCase(),0),table[0]);
    const s=run([weapon('adventurer-candy',grade)]);
    assert.deepEqual(getCandyDetails(s).damage,{min:table[0],max:table[4],multiplier:1});
  }
  assert.throws(()=>E.rollWeaponDamage(()=>0,'S',0),RangeError);
});

test('A fireball and conditional bonuses use the new damage table without changing score multipliers',()=>{
  for(const [grade,max,multiplier] of [['C',4,1],['B',6,2],['A',10,4]]) {
    const s=run([weapon('adventurer-candy',grade)]);
    const e=E.resolveProjectile(s,{hitIds:[s.enemies[0].id],rng:()=>.999});
    assert.equal(e.hits[0].damage,max);assert.equal(e.scoreDelta,max*multiplier);
  }
  const s=run([weapon('wizard-orb'),weapon('wind-candy')]);
  s.effectCounters.projectileCollisions=2;E.useConsumable(s,'fireball');
  const e=E.resolveProjectile(s,{selectedTargetId:s.enemies[0].id,hitIds:[s.enemies[0].id],rng:()=>.999});
  assert.equal(e.damage,20);assert.equal(e.bonusDamage,2);assert.equal(e.hits[0].damage,22);
  assert.equal(s.enemies[0].hp,34);assert.equal(e.bossSplit,undefined);
});

test('arithmetic maximum chain fixture can defeat a wounded fused boss before splitting',()=>{
  const s=run([weapon('wizard-orb')]);s.enemies[0].hp=29;s.effectCounters.projectileCollisions=2;
  E.useConsumable(s,'fireball');let draws=0;
  // Synthetic contact stream verifies arithmetic/precedence, not reachable geometry.
  const e=E.resolveProjectile(s,{hitIds:[s.enemies[0].id],rng:()=>draws++===0?.999:0,
    shotMeta:{contacts:Array.from({length:4},(_,i)=>({obstacleId:`fixture-${i}`,obstacleKind:'log',
      obstacleTargetIds:[s.enemies[0].id],time:i})),directHitTime:5}});
  assert.equal(e.bonusDamage,2);assert.equal(s.terminal,'bonus-clear');assert.equal(e.bossSplit,undefined);
  assert.equal(s.playerHp,100);assert.equal(e.hits.reduce((sum,h)=>sum+h.damage,0),29);
});

test('Spear keeps its separate 2–5 range even with A grade and C zero history',()=>{
  const s=run([weapon('wizard-orb')]);s.zeroRollsThisRound=2;E.useConsumable(s,'spear');
  assert.deepEqual(getCandyDetails(s).damage,{min:2,max:5,multiplier:1});
  const e=E.resolveProjectile(s,{hitIds:[s.enemies[0].id],rng:()=>.999});
  assert.equal(e.damage,5);assert.equal(e.bonusDamage,0);assert.equal(s.zeroRollsThisRound,2);
});
