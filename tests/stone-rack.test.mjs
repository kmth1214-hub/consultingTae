import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine as engine } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';

test('loading preserves acquisition order, ammo and individual duplicate stones', () => {
  const run = engine.createRunState({ rng: () => .5 });
  const ids = run.weapons.map(w => w.instanceId);
  assert.deepEqual(run.weaponQueue, ids);
  assert.equal(engine.loadStone(run, ids[2]).accepted, true);
  assert.deepEqual(run.weaponQueue, [ids[2], ids[0], ids[1]]);
  assert.equal(run.ammo, 3);
  engine.resolveProjectile(run, { hitIds: [], damage: 0, rng: () => .5 });
  assert.equal(engine.loadStone(run, ids[2]).reason, 'stone-unavailable');
  assert.deepEqual(run.weaponQueue, ids.slice(0, 2));
  assert.equal(run.ammo, 2);
});

test('last ammo stays empty and a reduced starting ammo truncates the queue', () => {
  const run = engine.createRunState({ ammo: 1, rng: () => .5 });
  assert.equal(run.weaponQueue.length, 1);
  engine.resolveProjectile(run, { hitIds: [], damage: 0, rng: () => .5 });
  assert.equal(run.ammo, 0);
  assert.deepEqual(run.weaponQueue, []);
  assert.equal(engine.getCurrentWeapon(run), null);
});

test('overheat removes the next stone and wind preparation locks loading', () => {
  const run = engine.createRunState({ area: 'city', round: 3, rng: () => .5 });
  run.enemies[0].attackCount = 2;
  const lost = run.weaponQueue[0];
  engine.resolveEnemyTurn(run, () => .5);
  assert.equal(run.weaponQueue.length, run.ammo);
  assert.equal(engine.loadStone(run, lost).accepted, false);
  run.windArmedMode = 'homing';
  assert.equal(engine.loadStone(run, run.weaponQueue[0]).reason, 'wind-armed');
});

test('session disallows loading while aiming or a physical flight is reserved', () => {
  const session = createGameSession({ rng: () => .5, layoutRng: () => 0 });
  session.actions.startCharacterSelect(); session.actions.startRun('adventurer');
  const id = session.getSnapshot().run.weaponQueue[2];
  assert.equal(session.actions.loadStone(id).accepted, true);
  session.actions.setAim({ phase: 'dragging' });
  assert.equal(session.actions.loadStone(id).accepted, false);
  session.actions.resetAim();
  const flight = session.actions.beginShot({ launchId: 1,
    pull: { ready: true, direction: { x: 1, y: 0 }, powerRatio: .1 } });
  assert.equal(flight.accepted, true);
  assert.equal(session.actions.loadStone(id).accepted, false);
  session.actions.cancelShot(flight.shotId);
  assert.equal(session.actions.loadStone(id).accepted, true);
});
