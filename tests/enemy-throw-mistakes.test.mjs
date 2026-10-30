import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { buildBattlefield } from '../src/game/battlefieldModel.js';
import { getEnemyAttackTarget } from '../src/game/enemyAttackPresentation.js';
import { createEnemyProjectileArc, sampleEnemyProjectile } from '../src/game/enemyProjectileMotion.js';

function run(kind='snake', isBoss=false) {
  const state=engine.createRunState({inventory:{},rng:()=>.5});
  state.enemies=[{id:'thrower',kind,isBoss,hp:20,maxHp:20,alive:true,attackCount:0}];
  return state;
}
test('ordinary thrown attacks miss at exactly ten percent and boss throws at five, with both mistake styles',()=>{
  for(const [kind,boss] of [['snake',false],['dry-ice',false],['snowball',false],['washing-robot',false],['cowardly-snowman',true],['oven-robot',true]]) {
    const counts={slip:0,overshoot:0,hit:0};
    for(let i=0;i<1000;i++) {
      const event=engine.resolveEnemyTurn(run(kind,boss),()=> (i+.5)/1000);
      counts[event.missStyle || 'hit']++;
      if(event.missed) {
        assert.equal(event.damage,0); assert.equal(event.blocked,false);
        assert.equal(event.playerHpBefore,event.playerHpAfter);
      }
    }
    assert.deepEqual(counts,boss?{slip:25,overshoot:25,hit:950}:{slip:50,overshoot:50,hit:900});
  }
  assert.equal(engine.resolveEnemyTurn(run(),()=>.899999).missed,false);
  assert.equal(engine.resolveEnemyTurn(run(),()=>.9).missStyle,'slip');
  assert.equal(engine.resolveEnemyTurn(run(),()=>.95).missStyle,'overshoot');
  assert.equal(engine.resolveEnemyTurn(run('oven-robot',true),()=>.949999).missed,false);
  assert.equal(engine.resolveEnemyTurn(run('oven-robot',true),()=>.95).missStyle,'slip');
  assert.equal(engine.resolveEnemyTurn(run('oven-robot',true),()=>.975).missStyle,'overshoot');
});

test('misses advance enemy order and boss count while preserving defense, Milk and ice until a hit',()=>{
  for(const defense of [false,true]) {
    const state=run('oven-robot',true);
    state.weapons.push({...engine.WEAPON_CATALOG.find(w=>w.id==='milk-candy'),instanceId:'milk'});
    state.milkShieldActive=true;
    state.defenseArmed=defense; state.nextAttackDamageMultiplier=.5;
    const before=structuredClone(state), miss=engine.resolveEnemyTurn(state,()=>.96);
    assert.equal(miss.missed,true); assert.equal(state.turnNumber,before.turnNumber+1);
    assert.equal(state.enemies[0].attackCount,1);
    assert.equal(state.playerHp,before.playerHp); assert.equal(state.ammo,before.ammo);
    assert.equal(state.defenseArmed,defense); assert.equal(state.milkShieldActive,true);
    assert.equal(state.nextAttackDamageMultiplier,.5);
    const hit=engine.resolveEnemyTurn(state,()=>.5);
    assert.equal(hit.blockedBy,defense?'defense':'milk'); assert.equal(hit.missed,false);
    assert.equal(state.defenseArmed,false); assert.equal(state.nextAttackDamageMultiplier,null);
    assert.equal(state.milkShieldActive,defense);
  }
  const state=run();
  state.enemies.push({...state.enemies[0],id:'next'});
  engine.resolveEnemyTurn(state,()=>.92);
  assert.equal(engine.resolveEnemyTurn(state,()=>.5).enemyId,'next');
  const ice=run(); ice.nextAttackDamageMultiplier=.5;
  engine.resolveEnemyTurn(ice,()=>.92);
  let roll=0;
  const hit=engine.resolveEnemyTurn(ice,()=>roll++===0?.5:.999);
  assert.equal(hit.damage,4); assert.equal(hit.damageReduction,.5); assert.equal(ice.nextAttackDamageMultiplier,null);
});

test('every third boss special and melee attack excludes mistakes without drawing a miss roll',()=>{
  for(const [kind,special] of [['pointy-boar','boar-charge'],['cowardly-snowman','frozen-breath'],['oven-robot','oven-overheat']]) {
    const state=run(kind,true); state.enemies[0].attackCount=2;
    let draws=0;
    const attack=engine.resolveEnemyTurn(state,()=>{draws++;return .999;});
    assert.equal(draws,1); assert.equal(attack.missed,false); assert.equal(attack.special,special);
    assert.equal(state.enemies[0].attackCount,3); assert.ok(attack.damage>0);
  }
  for(const kind of ['boar','pointy-boar']) {
    let draws=0; const attack=engine.resolveEnemyTurn(run(kind,kind==='pointy-boar'),()=>{draws++;return .999;});
    assert.equal(draws,1); assert.equal(attack.missed,false); assert.ok(attack.damage>0);
  }
});

test('committed mistake paths land short or pass above the player, never consuming presentation RNG',()=>{
  const layout=buildBattlefield({area:'snow',round:3,enemies:engine.createRoundEnemies('snow',3)});
  const source={x:layout.enemies[0].x-276*.25,y:900-276*.65};
  const original=Math.random;
  try {
    Math.random=()=>{throw new Error('presentation rolled');};
    assert.deepEqual(getEnemyAttackTarget({missed:false},layout),layout.player.impact);
    const before=structuredClone(layout);
    for(const missStyle of ['slip','overshoot']) {
      const target=getEnemyAttackTarget({missed:true,missStyle},layout);
      const arc=createEnemyProjectileArc({source,target}), end=sampleEnemyProjectile(arc,1);
      assert.equal(end.x,target.x); assert.equal(end.y,target.y);
      if(missStyle==='slip') assert.ok(target.x>layout.player.x+layout.player.width+100);
      else {
        const p=(source.x-layout.player.impact.x)/(source.x-target.x);
        assert.ok(sampleEnemyProjectile(arc,p).y<layout.player.y-100);
      }
    }
    assert.deepEqual(layout,before);
  } finally {Math.random=original;}
});
