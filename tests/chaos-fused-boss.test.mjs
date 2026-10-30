import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as E } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';
import { buildPlayableBattlefield, isPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { getCameraPose, worldToScreen } from '../src/game/battlefieldCamera.js';

const create = options => E.createRunState({ area: 'chaos', round: 3, rng: () => 0, inventory: {}, ...options });
const fire = (s, damage, options = {}) => E.resolveProjectile(s, { hitIds: [s.enemies[0].id], damage, rng: () => 0, ...options });

test('only Chaos final starts with a 56 HP fused boss', () => {
  const s = create();
  assert.equal(s.enemies.length, 1); assert.equal(s.enemies[0].kind, 'chaos-fused-boss');
  assert.equal(s.enemies[0].hp, 56); assert.equal(s.chaosBossPhase, 'fused');
  assert.deepEqual(['forest','snow','city'].map(area => E.createRoundEnemies(area, 3)[0].hp), [10,12,15]);
  assert.equal(E.createRoundEnemies('chaos', 1, {rng:()=>0}).length, 9);
});

test('29 HP remains fused and 28 splits with exact 8/9/11 HP, no extra enemy turn or refill', () => {
  const s = create();
  assert.equal(fire(s, 27).bossSplit, undefined);
  const ammo = s.ammo, score = s.bonusScore;
  s.roundEffects.windHomingUsed = true; s.roundEffects.milkBossBlockUsed = true;
  s.toppledObstacleIds = ['old']; s.obstacleDebris = [{obstacleId:'old'}];
  const event = fire(s, 1);
  assert.equal(s.chaosBossPhase, 'split'); assert.equal(event.enemyAttack, null);
  assert.deepEqual(s.enemies.map(e=>e.hp), [8,9,11]);
  assert.equal(s.enemies.reduce((sum,e)=>sum+e.hp,0), 28);
  assert.equal(s.ammo, ammo-1); assert.equal(s.bonusScore, score+1);
  assert.deepEqual(s.roundEffects, {windHomingUsed:true,milkBossBlockUsed:true});
  assert.deepEqual(s.toppledObstacleIds, []); assert.deepEqual(s.obstacleDebris, []);
  assert.equal(event.bossSplit.shock.damage, 1);
  assert.deepEqual(s.enemies.map(e=>e.attackCount), [0,0,0]);
  assert.equal(fire(s, 0).bossSplit, undefined);
});

test('all positive residual totals preserve HP; zero shares never resurrect', () => {
  for (let remaining=1;remaining<=28;remaining++) {
    const s=create(), event=fire(s,56-remaining);
    assert.equal(event.bossSplit.remainingHp,remaining);
    assert.equal(s.enemies.reduce((n,e)=>n+e.hp,0),remaining);
    for (const e of s.enemies) assert.equal(e.alive,e.hp>0);
  }
});

test('all shot and chain damage settles before splitting, and a lethal chain takes victory priority', () => {
  for (const hp of [4,5]) {
    const s=create(); s.enemies[0].hp=hp;
    const event=fire(s,1,{shotMeta:{contacts:[{obstacleId:'prop',obstacleKind:'crate',time:2,
      obstacleTargetIds:[s.enemies[0].id]}],directHitTime:1}});
    if(hp===4) { assert.equal(event.bossSplit,undefined); assert.equal(s.terminal,'bonus-clear'); assert.equal(s.playerHp,100); }
    else { assert.equal(event.bossSplit.remainingHp,1); assert.equal(s.enemies.reduce((sum,e)=>sum+e.hp,0),1); }
  }
  const s=create(); assert.equal(fire(s,56).bossSplit,undefined); assert.equal(s.terminal,'bonus-clear');
});

test('special types are independent and ordinary attacks still cycle through all three bosses', () => {
  const s=create(), attacks=Array.from({length:9},()=>E.resolveEnemyTurn(s,()=>0));
  assert.deepEqual(attacks.filter(a=>a.attemptedSpecial).map(a=>a.attemptedSpecial),Array(3).fill('boar-charge'));
  assert.deepEqual(attacks.filter(a=>!a.attemptedSpecial).map(a=>a.attackKind),
    ['pointy-boar','cowardly-snowman','oven-robot','pointy-boar','cowardly-snowman','oven-robot']);
  for(const [sample,kind] of [[.1,'boar-charge'],[.5,'frozen-breath'],[.9,'oven-overheat']]) {
    const x=create(); x.enemies[0].attackCount=2;
    assert.equal(E.resolveEnemyTurn(x,()=>sample).attemptedSpecial,kind);
  }
});

test('fused normal throwing retains misses while specials cannot miss', () => {
  const s=create(); s.enemies[0].normalAttackCount=1;
  s.defenseArmed=true;
  const miss=E.resolveEnemyTurn(s,()=>.999);
  assert.equal(miss.missed,true); assert.equal(s.defenseArmed,true);
  s.enemies[0].attackCount=2;
  const special=E.resolveEnemyTurn(s,()=>.999);
  assert.equal(special.missed,false); assert.equal(special.blocked,true);
});

test('landing shock applies once, obeys defense/Milk/ice consumption, and can be fatal', () => {
  for (const kind of ['plain','defense','milk','ice','both']) {
    const s=kind==='milk' ? create({weapons:[{id:'milk-candy',grade:'C'},
      {id:'basic-stone',grade:'C'}, {id:'basic-stone',grade:'C'}]}) : create();
    if(kind==='defense'||kind==='both') s.defenseArmed=true;
    if(kind==='ice'||kind==='both') s.nextAttackDamageMultiplier=.5;
    const event=fire(s,28,{rng:()=>.999});
    assert.ok(event.bossSplit, `expected split for ${kind}: ${event.reason || s.terminal || 'none'}`);
    const shock=event.bossSplit.shock;
    assert.equal(shock.damage,kind==='plain'?3:kind==='ice'?1:0);
    assert.equal(s.playerHp,100-shock.damage);
    assert.equal(event.enemyAttack,null); assert.equal(s.defenseArmed,false);
    assert.equal(s.nextAttackDamageMultiplier,null);
    if(kind==='milk') assert.equal(s.roundEffects.milkBossBlockUsed,true);
  }
  const s=create({playerHp:1}); const e=fire(s,28);
  assert.equal(e.bossSplit.shock.damage,1); assert.equal(s.terminal,'defeat');
});

test('each split boss retains its existing special and max HP rules', () => {
  const s=create(); fire(s,28);
  for(const e of s.enemies) e.attackCount=2;
  assert.deepEqual(Array.from({length:3},()=>E.resolveEnemyTurn(s,()=>0).attemptedSpecial),
    ['boar-charge','frozen-breath','oven-overheat']);
  assert.equal(s.enemies[2].maxHp,26);
});

test('last-ammo defeat keeps its existing priority, while a lethal last shot still wins', () => {
  const s=create({ammo:1});
  const event=fire(s,28);
  assert.equal(event.bossSplit,undefined);assert.equal(s.terminal,'defeat');
  assert.equal(s.playerHp,100);assert.equal(event.enemyAttack,null);
  const lethal=create({ammo:1});
  assert.equal(fire(lethal,56).roundCleared,true);assert.equal(lethal.terminal,'bonus-clear');
});

test('session gates review, split, stale callbacks and fatal result routing without rerolling', () => {
  let calls=0;
  const session=createGameSession({rng:()=>{calls++;return .5;},layoutRng:()=>0,
    storage:{getItem:()=>null,setItem(){}},engine:{...E,createRunState:()=>{
      const s=create({playerHp:1});s.enemies[0].hp=29;return s;
    }}});
  session.actions.startCharacterSelect();session.actions.startRun('adventurer');
  const id=session.getSnapshot().run.enemies[0].id;
  // A real C roll of 2 crosses threshold; the engine resolves shock once.
  const event=session.actions.fireShot({hitIds:[id],reviewResult:true});
  assert.ok(event.bossSplit); const snapshot=session.getSnapshot(), count=calls, transitionId=snapshot.bossTransition.id;
  assert.equal(snapshot.screen,'battle');
  assert.equal(session.actions.fireShot().reason,'splitting');
  assert.equal(session.actions.useConsumable('heal').reason,'splitting');
  session.actions.completeBossTransition(transitionId);assert.ok(session.getSnapshot().bossTransition);
  session.actions.completeShotReview(snapshot.shotReview.id);
  session.actions.advanceBossTransition(-1);assert.equal(session.getSnapshot().bossTransition.stage,'flight');
  session.actions.advanceBossTransition(transitionId);assert.equal(session.getSnapshot().bossTransition.stage,'impact');
  session.actions.completeBossTransition(transitionId);assert.equal(session.getSnapshot().screen,'bonus-results');
  session.actions.completeBossTransition(transitionId);assert.equal(calls,count);
});

test('split placement provides three reachable non-overlapping props and fused body uses 414 units', () => {
  for(const seed of [0,1,14,4927,0xffffffff]) {
    const s=create(), old=buildPlayableBattlefield({area:'chaos',round:3,enemies:s.enemies,seed});
    assert.equal(old.enemies[0].size,414);
    fire(s,28);
    const layout=buildPlayableBattlefield({area:'chaos',round:3,enemies:s.enemies,seed,encounterPhase:'split'});
    assert.equal(layout.obstacles.length,3);assert.equal(isPlayableBattlefield(layout,s.enemies),true);
    for(const prop of layout.obstacles) {
      assert.match(prop.id,/split/);assert.equal(old.obstacles.some(o=>o.id===prop.id),false);
      for(const boss of layout.enemies) assert.ok(prop.x+prop.width<boss.x-boss.size/2||prop.x>boss.x+boss.size/2);
    }
    for(const viewport of [{width:1440,height:800},{width:390,height:660}]) {
      const pose=getCameraPose({mode:'split',layout,viewport});
      for(const boss of layout.enemies) {
        const peak=worldToScreen({x:boss.x,y:layout.groundY-276-260},pose);
        assert.ok(peak.y>0);assert.ok(peak.x>0&&peak.x<viewport.width);
      }
    }
  }
});
