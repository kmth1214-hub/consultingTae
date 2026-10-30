import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';

const stone = id => ({ ...engine.WEAPON_CATALOG.find(item => item.id === id), grade: 'C' });
function run(characterId, ids, area = 'forest', round = 2) {
  const state = engine.createRunState({ characterId, area, round,
    weapons: ids.map(stone), rng: () => .5, playerHp: 100 });
  state.weaponQueue = state.weapons.map(item => item.instanceId);
  state.currentWeaponId = state.weaponQueue[0];
  state.enemies.forEach(enemy => { enemy.hp = 100; enemy.maxHp = 100; });
  return state;
}
const fire = (state, { hitIds = [], damage = 0, windCrossed = false, ...rest } = {}) =>
  engine.resolveProjectile(state, { hitIds, damage, rng: () => .5,
    shotMeta: { windCrossed, enemyOrder: state.enemies.map(enemy => enemy.id) }, ...rest });

test('Wind Archer charges only with basic stones, caps each shot at two, and Q storm consumes four', () => {
  const state = run('wind', ['basic-stone','basic-stone','wind-candy','wind-candy','wind-candy'], 'city', 1);
  const [first,,last] = state.enemies;
  assert.equal(fire(state,{hitIds:[first.id],damage:1,windCrossed:true}).windChargeAfter,2);
  assert.equal(fire(state,{hitIds:[first.id],damage:1,windCrossed:true}).windChargeAfter,4);
  assert.equal(engine.armWindSkill(state).mode,'storm');
  assert.equal(state.windCharge,0);
  const event=fire(state,{hitIds:[last.id],damage:4,windCrossed:true});
  assert.equal(event.windMode,'storm');
  assert.equal(event.windChargeAfter,0,'own exclusive stone cannot recharge the skill');
  assert.deepEqual(event.hits.filter(hit=>hit.source==='wind-chain').map(hit=>hit.damage),[3,2]);
  assert.equal(state.windCooldownShots,3);
});

test('Wind Archer Q homing consumes one shot and unlocks after three further player launches', () => {
  const state=run('wind',Array(5).fill('wind-candy'));
  const target=state.enemies[0];
  assert.equal(engine.armWindSkill(state).mode,'homing');
  const guided=fire(state,{selectedTargetId:target.id,damage:1});
  assert.equal(guided.homingTargetId,target.id);
  assert.equal(state.windCooldownShots,3);
  for (const remaining of [2,1,0]) {
    assert.equal(engine.armWindSkill(state).reason,'cooldown');
    fire(state);
    assert.equal(state.windCooldownShots,remaining);
  }
  assert.equal(engine.armWindSkill(state).mode,'homing');
});

test('borrowed Wind stones charge themselves and only use Q storm without cooldown', () => {
  const state=run('wizard',Array(5).fill('wind-candy'),'city',1);
  const [first,,last]=state.enemies;
  assert.equal(engine.armWindSkill(state).reason,'not-charged');
  fire(state,{hitIds:[first.id],damage:1,windCrossed:false});
  assert.equal(state.windCharge,0);
  fire(state,{hitIds:[first.id],damage:1,windCrossed:true});
  assert.equal(state.windCharge,2);
  fire(state,{hitIds:[first.id],damage:1,windCrossed:true});
  assert.equal(state.windCharge,4);
  assert.equal(engine.armWindSkill(state).mode,'storm');
  fire(state,{hitIds:[last.id],damage:4,windCrossed:true});
  assert.equal(state.windCharge,2,'a borrowed Q shot can begin filling the next storm');
  assert.equal(state.windCooldownShots,0);
});

test('chain starts at actual last Spear contact, uses Fireball damage, and falls to zero', () => {
  const state=run('wizard',['wind-candy','wind-candy'], 'city', 1);
  state.windCharge=4;
  const ids=state.enemies.map(enemy=>enemy.id);
  assert.equal(engine.armWindSkill(state).mode,'storm');
  state.fireballArmed=true;
  const fiery=fire(state,{hitIds:[ids[5]],damage:2});
  assert.equal(fiery.hits[0].damage,4);
  assert.deepEqual(fiery.hits.filter(hit=>hit.source==='wind-chain').map(hit=>hit.damage),[3,2,1]);
  assert.equal(state.enemies[0].hp,100,'targets past the damage falloff remain unharmed');
  state.windCharge=4;
  assert.equal(engine.armWindSkill(state).mode,'storm');
  state.spearArmed=true;
  const pierced=fire(state,{hitIds:[ids[2],ids[4]],damage:4});
  assert.equal(pierced.windMode,'storm');
  assert.ok(pierced.hits.some(hit=>hit.source==='wind-chain'&&hit.id===ids[3]));
  assert.ok(pierced.hits.some(hit=>hit.source==='wind-chain'&&hit.id===ids[2]));
});

test('wind crossing without direct contact earns one point; a missed Q storm hurts nobody', () => {
  const state=run('wizard',Array(5).fill('wind-candy'));
  fire(state,{windCrossed:true});
  assert.equal(state.windCharge,1);
  state.windCharge=4;
  assert.equal(engine.armWindSkill(state).mode,'storm');
  const hp=state.enemies.map(enemy=>enemy.hp);
  const miss=fire(state,{windCrossed:false});
  assert.equal(miss.windMode,'storm');
  assert.deepEqual(state.enemies.map(enemy=>enemy.hp),hp);
  assert.equal(state.windCharge,0);
});
