import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBattlefield } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { planShot } from '../src/game/shotGeometry.js';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { flightResultPayload } from '../src/game/shotResolution.js';

test('city blast propagates once and targets only nearby actual colliders', () => {
  const layout = buildBattlefield({ area: 'city', round: 1, enemies: [] });
  layout.obstacles = [500, 780, 1050].map((x, i) => ({
    id: `crate-${i}`, kind: 'crate', x, y: 720, width: 80, height: 180,
    polygon: [{x,y:720},{x:x+80,y:720},{x:x+80,y:900},{x,y:900}]
  }));
  layout.enemies = [{id:'near', x:850,y:900,size:92,collider:{id:'near',x:850,y:850,radius:38}},
    {id:'far',x:2500,y:900,size:92,collider:{id:'far',x:2500,y:850,radius:38}}];
  const enemies = layout.enemies.map(slot => ({id:slot.id,kind:'washing-robot',alive:true,hp:30,maxHp:30}));
  const shot = planShot({ layout, enemies,
    pull: { ready:true, powerRatio:.4, direction:{x:1,y:0} } });
  assert.equal(shot.contacts.length, 3);
  assert.equal(new Set(shot.contacts.map(c=>c.obstacleId)).size, 3);
  assert.ok(shot.contacts.some(c=>c.trigger==='blast'));
  assert.ok(shot.contacts.every(c=>!c.blast.targetIds.includes('far')));
  const run = engine.createRunState({area:'city',rng:()=>.5});
  run.enemies = structuredClone(enemies);
  const event = engine.resolveProjectile(run, {...flightResultPayload(shot),damage:0,rng:()=>.5});
  assert.equal(run.enemies[1].hp,30);
  assert.ok(run.enemies[0].hp<30);
  assert.equal(event.obstacleEffects.length,3);
});

test('city second-round layouts always provide a reachable pair of close crates', () => {
  const enemies=engine.createRoundEnemies('city',2);
  for(const seed of [0,1,7,36,4927,9999]) {
    const layout=buildPlayableBattlefield({area:'city',round:2,enemies,seed,worldScale:1.5,prototype:'regional-elevated-v1'});
    assert.ok(layout.obstacles.some((a,i)=>layout.obstacles.slice(i+1).some(b=>
      Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)<=420)));
  }
});
