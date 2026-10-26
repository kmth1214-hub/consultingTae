import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { buildBattlefield, getDragDraw } from '../src/game/battlefieldModel.js';
import { planShot, getBallisticPath, sampleAtTime } from '../src/game/shotGeometry.js';
import { createGameSession } from '../src/game/gameSession.js';
import { getCandyDetails } from '../src/game/candyPresentation.js';
import {findPhysicalShot,commitFlight} from './helpers/physical-shot.mjs';

test('selecting Spear only prepares the next candy, without damage, damage RNG or an enemy turn',()=>{
  const run=engine.createRunState({area:'snow',round:1,inventory:{spear:1},rng:()=>.5});
  const before=structuredClone(run);let draws=0;
  const event=engine.useConsumable(run,'spear',{rng:()=>{draws++;return .5;}});
  assert.deepEqual(run.enemies,before.enemies,'Selecting Spear must not damage enemies before launch');
  assert.deepEqual(event.hits,[]);assert.equal(draws,0);assert.equal(event.enemyAttack,null);
  assert.equal(run.spearArmed,true);assert.equal(run.ammo,9);assert.equal(run.inventory.spear,0);
});

function fixture({stacked=false,rolling=false}={}) {
  const layout=buildBattlefield({area:'city',round:1,enemies:[]});
  const pull={direction:{x:1,y:0},powerRatio:.9,ready:true};
  const draw=getDragDraw(pull,true), start={x:layout.launcher.x+draw.pouch.x,y:layout.launcher.y+draw.pouch.y};
  const arc=getBallisticPath({layout,start,direction:pull.direction,powerRatio:pull.powerRatio});
  const positions=rolling?[30,65,100,140].map(dx=>({x:arc.end.x+dx,y:890}))
    :[.12,.20,.28,.34].map(time=>sampleAtTime(arc,time));
  const enemies=positions.map((p,i)=>({id:`enemy-${i}`,kind:'washing-robot',alive:true,hp:20,maxHp:20,isBoss:false,attackCount:0}));
  layout.enemies=positions.map((p,i)=>({id:enemies[i].id,kind:enemies[i].kind,isBoss:false,x:p.x,y:900,size:60,
    collider:{id:enemies[i].id,x:p.x,y:p.y,radius:rolling?8:18}}));
  if(stacked) layout.obstacles=[{id:'far-log',kind:'log',x:3000,y:740,width:80,height:160,
    polygon:[{x:3000,y:740},{x:3080,y:740},{x:3080,y:900},{x:3000,y:900}]}];
  return {layout,pull,enemies};
}

test('piercing follows swept contacts in path order, passes living targets and stops at the third actual target',()=>{
  for(const stacked of [false,true]) for(const rolling of [false,true]) {
    const f=fixture({stacked,rolling});
    const shot=planShot({...f,piercing:true,windAvailable:true});
    assert.deepEqual(shot.hitIds,['enemy-0','enemy-1','enemy-2']);
    assert.equal(shot.path.kind,'ballistic');assert.equal(shot.enemyContacts.length,3);
    assert.equal(shot.impactKind,'enemy');
    assert.ok(shot.enemyContacts[2].distance>shot.enemyContacts[0].distance);
    assert.ok(Math.abs(shot.enemyContacts[2].time-shot.directHitTime)<1e-5);
    for(const c of shot.enemyContacts) {
      const circle=f.layout.enemies.find(e=>e.id===c.id).collider;
      assert.ok(Math.abs(Math.hypot(c.point.x-circle.x,c.point.y-circle.y)-(circle.radius+10))<.02);
    }
    const run=engine.createRunState({inventory:{spear:1},rng:()=>.5});run.enemies=structuredClone(f.enemies);
    engine.useConsumable(run,'spear',{rng(){throw new Error('selection roll');}});
    const event=engine.resolveProjectile(run,{damage:4,hitIds:shot.hitIds,shotMeta:shot,rng:()=>.5});
    assert.deepEqual(event.hits.map(h=>h.damage),[4,3,2]);
    assert.deepEqual(run.enemies.map(e=>e.hp),[16,17,18,20]);
    assert.equal(event.modifier,'spear');assert.equal(run.spearArmed,false);assert.equal(run.ammo,8);
  }
});

test('off-path targets, space behind the last contact, reverse shots and a solid intervening wall cannot cause remote damage',()=>{
  const f=fixture();f.layout.enemies[1].collider.y-=200;
  f.layout.enemies[2].collider.y-=200;f.layout.enemies[3].collider.y-=200;
  const one=planShot({...f,piercing:true});
  assert.deepEqual(one.hitIds,['enemy-0']);assert.ok(one.directHitTime>one.enemyContacts[0].time);
  const back=planShot({...f,pull:{...f.pull,direction:{x:-1,y:0}},piercing:true});
  assert.deepEqual(back.hitIds,[]);assert.equal(back.reverse,true);
  const wallX=(f.layout.enemies[0].x+f.layout.enemies[1].x)/2;
  f.layout.enemies[1].collider.y+=200;
  f.layout.obstacles=[{id:'wall',polygon:[{x:wallX,y:0},{x:wallX+4,y:0},{x:wallX+4,y:900},{x:wallX,y:900}]}];
  const blocked=planShot({...f,piercing:true});
  assert.deepEqual(blocked.hitIds,['enemy-0']);assert.equal(blocked.impactKind,'obstacle');
});

test('Spear applies obstacle and enemy contacts in actual chronological order and cannot damage an untouched target',()=>{
  const run=engine.createRunState({area:'city',round:1,inventory:{spear:1},rng:()=>.5});
  run.enemies=run.enemies.slice(0,2);run.enemies[0].hp=1;run.enemies[1].hp=20;
  engine.useConsumable(run,'spear');
  const [first,second]=run.enemies;
  const result=engine.resolveProjectile(run,{damage:4,hitIds:[first.id],rng:()=>.5,
    shotMeta:{contacts:[{obstacleId:'jar',obstacleKind:'crate',time:2}],
      directHitTime:3,enemyContacts:[{id:first.id,time:1}]}});
  assert.equal(result.hits[0].id,first.id);assert.equal(result.hits[0].damage,1);
  assert.equal(run.enemies[1].hp,18); // only the jar's legitimate regional effect
  assert.equal(result.hits.filter(h=>h.id===first.id).length,1);
});

test('arming, rejected launches and cancellation preserve the modifier; accepted misses consume it and reset the preparation slot',()=>{
  const session=createGameSession({storage:{getItem:()=>null,setItem(){}},rng:()=>.5,
    engine:{...engine,createRunState:o=>engine.createRunState({...o,inventory:{spear:2}})}});
  session.actions.startCharacterSelect();session.actions.startRun('adventurer');
  session.actions.useConsumable('spear');session.actions.setAim({phase:'dragging'});
  assert.equal(session.actions.fireShot().reason,'aiming');assert.equal(session.getSnapshot().run.spearArmed,true);
  session.actions.resetAim();assert.equal(session.getSnapshot().run.spearArmed,true);
  const before=structuredClone(session.getSnapshot().run);
  assert.equal(session.actions.fireShot({hitIds:['fake'],shotMeta:{enemyContacts:[{id:'fake',time:0,distance:0,point:{x:0,y:0}}]}}).accepted,false);
  assert.deepEqual(session.getSnapshot().run,before);
  const result=session.actions.fireShot({hitIds:[]});assert.equal(result.modifier,'spear');
  assert.equal(session.getSnapshot().run.spearArmed,false);assert.equal(session.getSnapshot().run.consumableUsedSinceShot,false);
  const normal=fixture();normal.layout.enemies=normal.layout.enemies.slice(0,1);
  const shot=planShot({...normal,piercing:false});assert.equal(shot.enemyContacts,undefined);
});

test('Spear HUD advertises its real initial range and falloff without a random draw',()=>{
  const run=engine.createRunState({inventory:{spear:1},rng:()=>.5});
  engine.useConsumable(run,'spear');const before=structuredClone(run);
  const details=getCandyDetails(run);
  assert.deepEqual(details.damage,{min:2,max:5,multiplier:1});
  assert.ok(details.buffs.some(b=>b.includes('실제 닿은 적 최대 3마리')));assert.deepEqual(run,before);
});

test('the session accepts actual planner contacts and rejects malformed or reordered contact streams before mutating combat',()=>{
  const f=fixture({stacked:true}), shot=planShot({...f,piercing:true});
  shot.rolling = shot.rollStartDistance !== null && shot.impactDistance > shot.rollStartDistance;
  const session=createGameSession({rng:()=>.5,storage:{getItem:()=>null,setItem(){}},
    engine:{...engine,createRunState:o=>({...engine.createRunState({...o,inventory:{spear:1}}),enemies:structuredClone(f.enemies)})}});
  session.actions.startCharacterSelect();session.actions.startRun('adventurer');session.actions.useConsumable('spear');
  for(const change of [
    meta=>{meta.enemyContacts[0].time=-1;},
    meta=>{meta.enemyContacts[0].point.x=NaN;},
    meta=>{meta.enemyContacts.reverse();},
    meta=>{meta.enemyContacts[1].id=meta.enemyContacts[0].id;},
    meta=>{meta.enemyContacts[2].time=meta.directHitTime+1;}
  ]) {
    const meta=structuredClone(shot);change(meta);
    const before=structuredClone(session.getSnapshot().run);
    assert.equal(session.actions.fireShot({hitIds:shot.hitIds,shotMeta:meta}).accepted,false);
    assert.deepEqual(session.getSnapshot().run,before);
  }
  const physical=findPhysicalShot(session,shot=>shot.hitIds.length>0&&shot.contacts.length===0);
  const result=commitFlight(session,physical);
  assert.equal(result.accepted,true);
  assert.deepEqual(result.hits.map(h=>h.id),physical.flight.hitIds);
  assert.deepEqual(result.hits.map(h=>h.damage),physical.flight.hitIds.map((_,i)=>4-i));
});
