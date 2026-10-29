import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';
import { buildPlayableBattlefield, isPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { getCandyDetails } from '../src/game/candyPresentation.js';

const make = (area, round, seed = 0) => {
  const session = createGameSession({ rng: () => .5, layoutRng: () => seed / 0x100000000,
    storage: { getItem: () => null, setItem() {} },
    engine: { ...BattleEngine, createRunState: options => BattleEngine.createRunState({ ...options, area, round }) } });
  session.actions.startCharacterSelect();
  assert.equal(session.actions.startRun('adventurer').accepted, true);
  return session;
};

const layoutFor = run => buildPlayableBattlefield({ area: run.area, round: run.round,
  enemies: run.enemies, seed: run.layoutSeed, prototype: run.battlefieldPrototype ?? run.studioPrototype ?? null,
  enemyLandingPositions: run.enemyLandingPositions ?? null, worldScale: run.studioWorldScale ?? 1 });

test('public Forest elevates one regular enemy only in round two and keeps studio abilities private', () => {
  for (const round of [1, 2, 3]) for (const seed of [0, 1, 4, 4927]) {
    const run = make('forest', round, seed).getSnapshot().run;
    const layout = layoutFor(run);
    assert.equal(run.battlefieldPrototype, 'forest-elevated-v1');
    assert.equal(run.studioPrototype, undefined);
    assert.equal(run.studioWorldScale, undefined);
    assert.equal(layout.worldScale, 1);
    assert.ok(isPlayableBattlefield(layout, run.enemies));
    const riders = layout.enemies.filter(enemy => enemy.supportObstacleId);
    const supports = layout.obstacles.filter(prop => prop.supportsEnemyId);
    assert.equal(riders.length, round === 2 ? 1 : 0);
    assert.equal(supports.length, riders.length);
    assert.ok(layout.enemies.filter(enemy => enemy.y < layout.groundY).length === riders.length);
    if (round === 2) {
      assert.equal(supports[0].supportsEnemyId, riders[0].id);
      assert.equal(riders[0].y, supports[0].y);
      assert.equal(layout.enemies.find(enemy => enemy.id !== riders[0].id).y, layout.groundY);
    }
    if (round === 3) assert.ok(layout.enemies.every(enemy => enemy.isBoss && enemy.y === layout.groundY));
    assert.equal(layout.player.contact.y, layout.launcher.contact.y);
    assert.equal(getCandyDetails(run).currentAbility, null);
    assert.deepEqual(layoutFor(run), layout);
  }
  const first = layoutFor(make('forest', 2, 0).getSnapshot().run);
  const next = layoutFor(make('forest', 2, 1).getSnapshot().run);
  assert.notDeepEqual(first.enemies.map(enemy => enemy.x), next.enemies.map(enemy => enemy.x));
});

test('a real public Forest support hit applies one fall and persists the survivor landing', () => {
  const session = make('forest', 2, 0), initial = session.getSnapshot().run;
  const layout = layoutFor(initial), support = layout.obstacles.find(prop => prop.supportsEnemyId);
  const rider = initial.enemies.find(enemy => enemy.id === support.supportsEnemyId);
  let reservation = null;
  for (let angle = 10; angle <= 75 && !reservation; angle += 5) for (let step = 2; step <= 20 && !reservation; step++) {
    const radians = angle * Math.PI / 180;
    const attempt = session.actions.beginShot({ launchId: angle * 100 + step,
      pull: { ready: true, direction: { x: Math.cos(radians), y: -Math.sin(radians) }, powerRatio: step / 20 } });
    if (!attempt.accepted) continue;
    if (attempt.flight.contacts.some(contact => contact.obstacleId === support.id && contact.riderMotion)) reservation = attempt;
    else session.actions.cancelShot(attempt.shotId);
  }
  assert.ok(reservation, 'a supported log must be reachable by an ordinary public shot');
  assert.equal(reservation.flight.splitOrbs, undefined);
  assert.equal(reservation.flight.abilityContacts?.length ?? 0, 0);
  const fall = reservation.flight.contacts.find(contact => contact.obstacleId === support.id).riderMotion;
  const event = session.actions.fireShot({ shotId: reservation.shotId, encounterId: reservation.encounterId });
  assert.equal(event.accepted, true);
  const hits = event.hits.filter(hit => hit.id === rider.id && hit.source === 'rider-fall');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].damage, fall.fallDamage);
  const after = session.getSnapshot().run;
  assert.ok(after.enemies.find(enemy => enemy.id === rider.id).alive);
  assert.deepEqual(after.enemyLandingPositions[rider.id], fall.landing);
  assert.equal(layoutFor(after).enemies.find(enemy => enemy.id === rider.id).y, layout.groundY);
  assert.equal(session.actions.fireShot({ shotId: reservation.shotId, encounterId: reservation.encounterId }).accepted, false);
});

test('other regions use their own public elevated mode', () => {
  for (const area of ['snow', 'city', 'chaos']) for (const round of [1, 2, 3]) {
    const run = make(area, round).getSnapshot().run;
    assert.equal(run.battlefieldPrototype, 'regional-elevated-v1');
    assert.equal(run.studioPrototype, undefined);
    assert.deepEqual(run.enemyLandingPositions, {});
    const layout = layoutFor(run);
    assert.equal(layout.prototype, 'regional-elevated-v1');
    const expected = round === 3 ? 0 : area === 'chaos' ? layout.enemies.length > 10 ? 3 : 2 : round === 2 ? 1 : 0;
    assert.equal(layout.enemies.filter(enemy => enemy.y < layout.groundY).length, expected);
  }
});

test('leaving Forest resets its landing coordinates before Snow builds a new battlefield', () => {
  const session = createGameSession({ rng: () => .999, layoutRng: () => 0,
    storage: { getItem: () => null, setItem() {} },
    engine: { ...BattleEngine,
      createRunState: options => BattleEngine.createRunState({ ...options, round: 3 }),
      resolveProjectile: (run, options) => BattleEngine.resolveProjectile(run, { ...options, damage: 1000 }) } });
  session.actions.startCharacterSelect();
  session.actions.startRun('adventurer');
  const boss = session.getSnapshot().run.enemies[0];
  assert.equal(session.actions.fireShot({ hitIds: [boss.id] }).accepted, true);
  const choices = session.getSnapshot().run.rewardChoices;
  const weapon = choices.weapons.find(item => item.id !== 'adventurer-candy') || choices.weapons[0];
  session.actions.selectReward('weapon', weapon.choiceId);
  if (session.getSnapshot().fusion) session.actions.resolveFusion(false);
  session.actions.selectReward('consumable', choices.consumables[0].choiceId);
  assert.equal(session.actions.continueAfterReward().accepted, true);
  assert.equal(session.getSnapshot().screen, 'camp');
  assert.equal(session.actions.chooseCampReward('heal').accepted, true);
  const run = session.getSnapshot().run;
  assert.equal(run.area, 'snow');
  assert.equal(run.battlefieldPrototype, 'regional-elevated-v1');
  assert.deepEqual(run.enemyLandingPositions, {});
  assert.ok(isPlayableBattlefield(layoutFor(run), run.enemies));
});
