import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { createGameSession } from '../src/game/gameSession.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { planShot } from '../src/game/shotGeometry.js';

const sessionFor = (area, round, seed = 0) => {
  const session = createGameSession({ rng: () => .5, layoutRng: () => seed / 0x100000000,
    storage: { getItem: () => null, setItem() {} },
    engine: { ...BattleEngine, createRunState(options) {
      const run = BattleEngine.createRunState({ ...options, area, round, rng: () => .5 });
      run.enemies.forEach(enemy => { enemy.hp = 10; enemy.maxHp = 10; });
      return run;
    } } });
  session.actions.startCharacterSelect();
  assert.equal(session.actions.startRun('adventurer').accepted, true);
  return session;
};

const pullFor = (layout, enemies, supportId) => {
  for (let angle = 0; angle <= 80; angle += 2.5) for (let step = 1; step <= 20; step++) {
    const radians = angle * Math.PI / 180;
    const pull = { ready: true, powerRatio: step / 20,
      direction: { x: Math.cos(radians), y: -Math.sin(radians) } };
    const shot = planShot({ layout, enemies, pull });
    if (shot?.contacts.some(contact => contact.obstacleId === supportId && contact.riderMotion)
      && shot.hitIds.length === 0) return pull;
  }
  throw new Error(`No clear support shot: ${layout.area}/${layout.round}/${supportId}`);
};

test('actual public shots topple each regional support, cause one fall and retain regional effects', () => {
  for (const [area, round] of [['snow', 2], ['city', 2], ['chaos', 1], ['chaos', 2]]) {
    const session = sessionFor(area, round);
    const before = session.getSnapshot().run;
    const layout = buildPlayableBattlefield({ area, round, enemies: before.enemies,
      seed: before.layoutSeed, prototype: before.battlefieldPrototype });
    const support = layout.obstacles.find(item => item.supportsEnemyId);
    assert.ok(support);
    const pull = pullFor(layout, before.enemies, support.id);
    const reservation = session.actions.beginShot({ launchId: 1, pull });
    assert.equal(reservation.accepted, true);
    const contact = reservation.flight.contacts.find(item => item.obstacleId === support.id);
    assert.ok(contact.riderMotion);
    const event = session.actions.fireShot({ shotId: reservation.shotId, encounterId: reservation.encounterId });
    assert.equal(event.accepted, true);
    const fallHits = event.hits.filter(hit => hit.id === support.supportsEnemyId && hit.source === 'rider-fall');
    assert.equal(fallHits.length, 1, `${area}/${round} rider must land once`);
    assert.equal(fallHits[0].damage, contact.riderMotion.fallDamage);
    assert.ok(event.obstacleEffects.some(effect => effect.obstacleId === support.id));
    const effect = event.obstacleEffects.find(item => item.obstacleId === support.id);
    if (area === 'snow') assert.equal(effect.kind, 'ice-guard');
    if (area === 'city') assert.equal(effect.kind, 'jar-burst');
    if (area === 'chaos') assert.ok(['log-strike', 'ice-guard', 'jar-burst', 'aim-inversion'].includes(effect.kind));
    const after = session.getSnapshot().run;
    assert.deepEqual(after.enemyLandingPositions[support.supportsEnemyId], contact.riderMotion.landing);
    assert.equal(session.actions.fireShot({ shotId: reservation.shotId, encounterId: reservation.encounterId }).accepted, false);
  }
});

test('a regional fall cannot be fabricated by the caller', () => {
  const session = sessionFor('snow', 2);
  const before = session.getSnapshot().run;
  const layout = buildPlayableBattlefield({ area: 'snow', round: 2, enemies: before.enemies,
    seed: before.layoutSeed, prototype: before.battlefieldPrototype });
  const support = layout.obstacles.find(item => item.supportsEnemyId);
  const pull = pullFor(layout, before.enemies, support.id);
  const reservation = session.actions.beginShot({ launchId: 1, pull });
  assert.equal(reservation.accepted, true);
  const event = session.actions.fireShot({ shotId: reservation.shotId, encounterId: reservation.encounterId,
    shotMeta: { riderFalls: [{ enemyId: 'forged', fallDamage: 999 }] } });
  assert.equal(event.accepted, true);
  assert.equal(event.hits.filter(hit => hit.source === 'rider-fall').length, 1);
  assert.notEqual(event.hits.find(hit => hit.source === 'rider-fall').id, 'forged');
});
