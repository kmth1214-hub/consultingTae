import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { BATTLEFIELD, buildBattlefield, getDragDraw, getLaunchSpeed } from '../src/game/battlefieldModel.js';
import { buildPlayableBattlefield } from '../src/game/battlefieldPlacement.js';
import { getPull, getBallisticPath, getHomingPath, sampleAtDistance, pathPrefixD,
  appendGroundRoll, findObstacleContact, planShot } from '../src/game/shotGeometry.js';
import { findMovingRiderContact } from '../src/game/shotGeometry.js';
import { simulateRiderFall, sampleRiderMotion } from '../src/game/forestLogPhysics.js';

const close = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const empty = () => buildBattlefield({ area: 'forest', round: 1, enemies: [] });
const pullAt = (angle, powerRatio) => ({ direction: { x: Math.cos(angle * Math.PI / 180),
  y: -Math.sin(angle * Math.PI / 180) }, powerRatio, ready: true });
const box = (id, x, y, w, h) => ({ id, polygon: [{ x, y }, { x: x + w, y },
  { x: x + w, y: y + h }, { x, y: y + h }] });
const circle = (id, p, radius = 10) => ({ id, collider: { id, x: p.x, y: p.y, radius } });
const living = ids => ids.map(id => ({ id, alive: true, hp: 4 }));

test('scaled studio shot starts at the visibly scaled pouch and keeps five-diameter roll cap', () => {
  const layout = buildBattlefield({ area: 'forest', round: 1, enemies: [], worldScale: 1.5 });
  const pull = pullAt(32, .45);
  const draw = getDragDraw(pull, true, 1.5);
  const shot = planShot({ layout, pull, enemies: [] });
  assert.ok(shot);
  close(shot.path.start.x, layout.launcher.x + draw.pouch.x);
  close(shot.path.start.y, layout.launcher.y + draw.pouch.y);
  assert.equal(layout.candyRadius, 15);
  assert.ok(shot.rollDistance <= 5 * layout.candyRadius * 2 + 1e-7);
});

test('Adventurer exclusive stone bounces once in every region; basic stone and Spear do not', () => {
  const layout = empty(), pull = pullAt(24, .6);
  const input = { layout, pull, enemies: [], prototype: 'forest-elevated-v1',
    loadedCandyId: 'adventurer-candy' };
  const bounced = planShot(input);
  assert.equal(bounced.abilityKind, 'bounce');
  assert.ok(bounced.bounce?.firstLandingTime > 0);
  assert.ok(bounced.bounce.secondLandingTime > bounced.bounce.firstLandingTime);
  assert.ok(bounced.path.samples.some(sample => sample.time > bounced.bounce.firstLandingTime
    && sample.time < bounced.bounce.secondLandingTime && sample.y < bounced.bounce.firstLanding.y));
  assert.ok(bounced.rollStartDistance > 0);
  assert.ok(bounced.rollDistance <= layout.candyRadius * 10);
  assert.ok(planShot({ ...input, prototype: null }).bounce);
  assert.equal(planShot({ ...input, loadedCandyId: 'basic-stone' }).bounce, undefined);
  assert.equal(planShot({ ...input, piercing: true }).bounce, undefined);
});

test('Alchemist splash is anchored to the first real candy collision in every region', () => {
  const layout = empty(), pull = pullAt(30, .55);
  const baseline = planShot({ layout, pull, enemies: [] });
  const contact = sampleAtDistance(baseline.path, baseline.path.length * .35);
  layout.enemies = [circle('near', contact, 20), circle('far', { x: contact.x + 400, y: contact.y }, 20)];
  const shot = planShot({ layout, pull, enemies: living(['near', 'far']),
    prototype: 'forest-elevated-v1', loadedCandyId: 'alchemist-candy' });
  assert.deepEqual(shot.hitIds, ['near']);
  assert.equal(shot.abilityContacts.length, 1);
  assert.equal(shot.abilityContacts[0].sourceId, 'near');
  assert.deepEqual(shot.abilityContacts[0].targetIds, ['near']);
  assert.equal(planShot({ layout, pull, enemies: living(['near', 'far']),
    prototype: null, loadedCandyId: 'alchemist-candy' }).abilityContacts.length, 1);
  assert.equal(planShot({ layout, pull, enemies: living(['near', 'far']),
    loadedCandyId: 'basic-stone' }).abilityContacts, undefined);
});

test('Wizard exclusive stone splits into two paths at the apex in every region', () => {
  const layout = empty(), pull = pullAt(45, .55);
  const input = { layout, pull, enemies: [] };
  const ordinary = planShot(input);
  const split = planShot({ ...input, prototype: 'forest-elevated-v1', loadedCandyId: 'wizard-orb' });
  assert.ok(split.splitOrbs);
  assert.equal(split.splitOrbs.children.length, 2);
  assert.deepEqual(split.path.samples, ordinary.path.samples);
  assert.ok(split.splitOrbs.children[0].path.end.x !== split.splitOrbs.children[1].path.end.x);
  close(split.splitOrbs.splitTime, -pull.direction.y * getLaunchSpeed(pull.powerRatio) / BATTLEFIELD.gravity, .02);
  const child = split.splitOrbs.children[0];
  const p = sampleAtDistance(child.path, child.path.length * .5);
  layout.enemies = [circle('child-target', p, 22)];
  const struck = planShot({ ...input, prototype: 'forest-elevated-v1', loadedCandyId: 'wizard-orb',
    enemies: living(['child-target']) });
  assert.ok(struck.splitOrbs.children.some(orb => orb.hit?.enemyId === 'child-target'));
  assert.ok(planShot({ ...input, prototype: null, loadedCandyId: 'wizard-orb',
    enemies: living(['child-target']) }).splitOrbs);
  assert.equal(planShot({ ...input, loadedCandyId: 'basic-stone',
    enemies: living(['child-target']) }).splitOrbs, undefined);
  assert.equal(planShot({ ...input, prototype: 'forest-elevated-v1', loadedCandyId: 'wizard-orb',
    enemies: living(['child-target']), piercing: true }).splitOrbs, undefined);
});

test('a low Wizard shot splits near one third of its first flight before landing', () => {
  const layout = empty(), pull = pullAt(-4, .55);
  const shot = planShot({ layout, pull, enemies: [], prototype: 'forest-elevated-v1',
    loadedCandyId: 'wizard-orb' });
  assert.ok(shot.splitOrbs);
  close(shot.splitOrbs.splitTime, shot.path.durationSeconds / 3, .08);
});

test('a small Wizard orb only records a wobble when crossing a log', () => {
  const layout = empty(), pull = pullAt(45, .55);
  const first = planShot({ layout, pull, enemies: [], prototype: 'forest-elevated-v1',
    loadedCandyId: 'wizard-orb' });
  const p = sampleAtDistance(first.splitOrbs.children[0].path,
    first.splitOrbs.children[0].path.length * .6);
  layout.obstacles = [{ ...box('wobble-log', p.x - 8, p.y - 8, 16, 16),
    kind: 'log', x: p.x - 8, y: p.y - 8, width: 16, height: 16 }];
  const shot = planShot({ layout, pull, enemies: [], prototype: 'forest-elevated-v1',
    loadedCandyId: 'wizard-orb' });
  assert.ok(shot.splitOrbs.children.some(child => child.wobbles.some(w => w.obstacleId === 'wobble-log')));
  assert.equal(shot.contacts.some(contact => contact.trigger === 'orb'), false);
});

test('elevated launcher pulls start at its actual pouch and the supported target remains hittable', () => {
  const enemies = BattleEngine.createRoundEnemies('forest', 2, { rng: () => .5 });
  const layout = buildPlayableBattlefield({ area: 'forest', round: 2, enemies,
    seed: 0, prototype: 'forest-elevated-v1' });
  assert.ok(layout.launcherPlatform);
  const pull = pullAt(45, .5), draw = getDragDraw(pull);
  const shot = planShot({ layout, pull, enemies });
  assert.ok(shot);
  assert.equal(shot.path.start.x, layout.launcher.x + draw.pouch.x);
  assert.equal(shot.path.start.y, layout.launcher.y + draw.pouch.y);
  const rider = layout.enemies.find(slot => slot.supportObstacleId);
  assert.ok(rider.collider.y < layout.groundY - rider.size * .52);
  assert.ok(layout.obstacles.some(prop => prop.id === rider.supportObstacleId));
});
const physicalStack = (id, x, kind = 'log') => ({ ...box(id, x, 744, 80, 156),
  kind, x, y: 744, width: 80, height: 156 });

test('a moving rider collider is hit at its falling position, not its abandoned support position', () => {
  const slot = { id: 'rider', supportObstacleId: 'support', elevation: 'high',
    x: 700, y: 664, size: 92, collider: { id: 'rider', x: 700, y: 664 - 92 * .52, radius: 92 * .42 } };
  const fall = simulateRiderFall({ riderSlot: slot, supportMotion: { samples: [
    { x: 700, y: 800, angle: 0, time: 0 }, { x: 702, y: 800, angle: .01, time: 1 / 240 } ] },
    layout: { width: 3600, groundY: 900 }, startTime: .3 });
  const now = .3 + Math.min(.4, fall.durationSeconds / 2);
  const foot = sampleRiderMotion(fall, now);
  const y = foot.y - slot.size * .52;
  const path = line({ x: foot.x - 100, y }, { x: foot.x + 100, y });
  assert.ok(findMovingRiderContact(path, slot, fall, now - .5, 10) !== null);
  const far = line({ x: foot.x - 100, y: y - 300 }, { x: foot.x + 100, y: y - 300 });
  assert.equal(findMovingRiderContact(far, slot, fall, now - .5, 10), null);
});
function line(a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return { length, samples: [{ ...a, time: 0, distance: 0 }, { ...b, time: 1, distance: length }] };
}
const prefixEnd = d => {
  const numbers = d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
  return { x: numbers.at(-2), y: numbers.at(-1) };
};

test('mouse vectors use a 12px dead zone, opposite direction, saturation and fixed CSS-pixel scale', () => {
  const zero = getPull({ x: 0, y: 0 }, 220);
  assert.deepEqual(zero.direction, { x: 1, y: 0 });
  assert.equal(zero.ready, false);
  assert.equal(getPull({ x: 11, y: 0 }, 220).ready, false);
  assert.equal(getPull({ x: 12, y: 0 }, 220).ready, true);
  assert.equal(getPull({ x: 12, y: 0 }, 220).powerRatio, 0);
  for (const [x, y] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const delta = { x: x * 100, y: y * 100 }, p = getPull(delta, 220);
    assert.equal(Math.sign(p.direction.x), -x);
    assert.equal(Math.sign(p.direction.y), -y);
    close(p.powerRatio, (Math.sqrt(20000) - 12) / 208);
    // Camera transforms are deliberately absent from this API.
    assert.deepEqual(getPull(delta, 220), p);
  }
  assert.equal(getPull({ x: -9999, y: 0 }, 220).powerRatio, 1);
  assert.equal(getPull({ x: NaN, y: 0 }, 220), null);
  assert.equal(getPull({ x: 5, y: 0 }, 12), null);
});

test('sampled ballistics match independent equations, refine physical bounds and preserve power/direction', () => {
  const layout = empty(), start = { x: 284, y: 812 }, direction = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
  const path = getBallisticPath({ start, direction, powerRatio: .8, layout });
  const speed = 240 + 1720 * .8;
  for (const p of path.samples) {
    close(p.x, start.x + direction.x * speed * p.time);
    close(p.y, start.y + direction.y * speed * p.time + 600 * p.time ** 2);
    assert.ok(Number.isFinite(p.distance) && p.time <= 8);
  }
  close(path.end.y, 890);
  const weaker = getBallisticPath({ start, direction, powerRatio: .5, layout });
  assert.ok(path.end.x > weaker.end.x);
  const reverse = getBallisticPath({ start, direction: { x: -1, y: -.2 }, powerRatio: 1, layout });
  assert.equal(reverse.endKind, 'bounds'); assert.ok(reverse.end.x < -10);
  assert.ok(reverse.samples.every((p, i) => !i || p.x < reverse.samples[i - 1].x));
  const down = getBallisticPath({ start, direction: { x: 0, y: 1 }, powerRatio: 1, layout });
  assert.ok(down.durationSeconds < .1); close(down.end.y, 890);
  const ceiling = getBallisticPath({ start, direction: { x: 0, y: -1 }, powerRatio: 1,
    layout: { ...layout, minY: 0 } });
  assert.equal(ceiling.endKind, 'ground'); close(ceiling.end.y, 890);
  assert.ok(ceiling.samples.some(p => p.y < 0));
  const timeout = getBallisticPath({ start, direction: { x: 0, y: -1 }, powerRatio: 0,
    layout: { ...layout, groundY: 1e9, minY: -1e9 } });
  assert.equal(timeout.endKind, 'timeout'); close(timeout.durationSeconds, 8);
  assert.equal(getBallisticPath({ start: { x: 1, y: 891 }, direction, powerRatio: 1, layout }), null);
  assert.equal(getBallisticPath({ start, direction: { x: 0, y: 0 }, powerRatio: 1, layout }), null);
  const ground = getBallisticPath({ start: { x: 10, y: 890 }, direction: { x: 0, y: 1 }, powerRatio: 1, layout });
  assert.equal(ground.length, 0); assert.equal(ground.endKind, 'ground');
});

test('ground roll uses friction, signed landing speed, bounded samples, and world-edge clipping', () => {
  const layout = empty(), start = { x: 100, y: 890 };
  const grounded = getBallisticPath({ start, direction: { x: 1, y: 0 }, powerRatio: 1, layout });
  assert.equal(grounded.endKind, 'ground'); close(grounded.length, 0);
  assert.equal(BATTLEFIELD.maxRollDiameters, 5);
  assert.equal(BATTLEFIELD.groundRollDeceleration, 16000);

  const strong = appendGroundRoll(grounded, BATTLEFIELD.maxSpeed, layout);
  close(strong.rollDistance, 100); close(strong.path.end.x, 200); close(strong.path.end.y, 890);
  close(strong.rollStartDistance, grounded.length);
  assert.equal(strong.path.rollStartDistance, grounded.length);
  assert.equal(strong.path.endKind, 'ground');
  assert.ok(strong.path.samples.slice(1).every((p, i) => p.distance - strong.path.samples[i].distance <= 4 + 1e-8));
  assert.ok(strong.path.samples.every((p, i) => !i || (p.time > strong.path.samples[i - 1].time
    && p.distance > strong.path.samples[i - 1].distance)));
  const lastTime = (BATTLEFIELD.maxSpeed - Math.sqrt(BATTLEFIELD.maxSpeed ** 2
    - 2 * BATTLEFIELD.groundRollDeceleration * 100)) / BATTLEFIELD.groundRollDeceleration;
  close(strong.path.durationSeconds, lastTime);
  close(sampleAtDistance(strong.path, 50).x, 150);
  assert.match(pathPrefixD(strong.path, 50), /L150,890$/);

  const weak = appendGroundRoll(grounded, 240, layout);
  close(weak.rollDistance, 240 ** 2 / (2 * BATTLEFIELD.groundRollDeceleration));
  const reverse = appendGroundRoll(grounded, -400, layout);
  close(reverse.path.end.x, 95);
  const stationary = appendGroundRoll(grounded, .99, layout);
  assert.equal(stationary.rollDistance, 0); assert.equal(stationary.path.rollStartDistance, null);
  const vertical = appendGroundRoll(grounded, 0, layout);
  assert.equal(vertical.rollDistance, 0);

  const edgeLayout = { ...layout, width: 150 };
  const nearEdge = getBallisticPath({ start: { x: 145, y: 890 }, direction: { x: 1, y: 0 }, powerRatio: 1, layout: edgeLayout });
  const clipped = appendGroundRoll(nearEdge, BATTLEFIELD.maxSpeed, edgeLayout);
  close(clipped.rollDistance, 15); close(clipped.path.end.x, 160); assert.equal(clipped.path.endKind, 'bounds');
  assert.throws(() => appendGroundRoll({ ...grounded, endKind: 'bounds' }, 100, layout), TypeError);
  assert.throws(() => appendGroundRoll(grounded, NaN, layout), TypeError);
});

test('planShot rolls only after an unobstructed landing and reports the first roll contact', () => {
  const layout = empty(), pull = pullAt(0, 1), baseline = planShot({ layout, pull, enemies: [] });
  assert.equal(baseline.impactKind, 'ground');
  assert.equal(baseline.rollDistance, 100);
  assert.ok(baseline.rollStartDistance > 0);
  const targetPoint = sampleAtDistance(baseline.path, baseline.rollStartDistance + 35);
  const laterTarget = sampleAtDistance(baseline.path, baseline.rollStartDistance + 72);
  layout.enemies = [circle('roll-target', targetPoint), circle('later-roll-target', laterTarget)];
  const hit = planShot({ layout, pull, enemies: living(['roll-target', 'later-roll-target']) });
  assert.equal(hit.impactKind, 'enemy'); assert.deepEqual(hit.hitIds, ['roll-target']);
  assert.equal(hit.rollDistance, 100);
  assert.ok(hit.impactDistance > hit.rollStartDistance);

  const blockedLayout = empty(), openPath = planShot({ layout: blockedLayout, pull, enemies: [] });
  const rollStart = sampleAtDistance(openPath.path, openPath.rollStartDistance);
  const wallX = rollStart.x + 42;
  blockedLayout.obstacles = [{ ...box('roll-wall', wallX, 896, 12, 14), kind: 'log' }];
  const wallOnly = planShot({ layout: blockedLayout, pull, enemies: [] });
  assert.equal(wallOnly.contacts[0].obstacleId, 'roll-wall');
  assert.equal(wallOnly.contacts[0].obstacleKind, 'log'); assert.deepEqual(wallOnly.hitIds, []);
  assert.ok(wallOnly.contacts[0].rolling);
  assert.ok(wallOnly.contacts[0].distance > wallOnly.rollStartDistance);

  const contact = wallOnly.contacts[0].point;
  blockedLayout.enemies = [circle('roll-tie', { x: contact.x + 20, y: contact.y })];
  const tied = planShot({ layout: blockedLayout, pull, enemies: living(['roll-tie']) });
  assert.equal(tied.contacts[0].obstacleId, 'roll-wall');
  assert.ok(tied.contacts[0].distance <= tied.impactDistance);
  blockedLayout.enemies = [circle('far-target', { x: contact.x + 150, y: contact.y }),
    circle('near-target', { x: contact.x + 70, y: contact.y })];
  const wallWithTargets = planShot({ layout: blockedLayout, pull, enemies: living(['far-target', 'near-target']) });
  assert.equal(wallWithTargets.contacts[0].obstacleId, 'roll-wall');
  assert.deepEqual(wallWithTargets.contacts[0].obstacleTargetIds, ['near-target', 'far-target']);

  const beforeGroundLayout = empty(), ordinary = planShot({ layout: beforeGroundLayout, pull, enemies: [] });
  const flightTarget = sampleAtDistance(ordinary.path, ordinary.path.length * .55);
  beforeGroundLayout.enemies = [circle('flight-target', flightTarget)];
  const beforeLanding = planShot({ layout: beforeGroundLayout, pull, enemies: living(['flight-target']) });
  assert.equal(beforeLanding.impactKind, 'enemy'); assert.equal(beforeLanding.rollDistance, 0);
  assert.equal(beforeLanding.rollStartDistance, null); assert.equal(beforeLanding.path.rollStartDistance, null);

  const windEnemies = BattleEngine.createRoundEnemies('city', 3);
  const homingLayout = buildBattlefield({ area: 'city', round: 3, enemies: windEnemies });
  const homing = planShot({ layout: homingLayout, pull: pullAt(25, .6), enemies: windEnemies, windAvailable: true });
  assert.equal(homing.path.kind, 'homing'); assert.equal(homing.rollDistance, 0);
  assert.equal(homing.rollStartDistance, null);
});

test('a fast candy topples two distinct stacks then directly hits an enemy', () => {
  const layout = empty();
  layout.obstacles = [{ ...box('first', 400, 780, 35, 120), kind: 'log' },
    { ...box('second', 600, 780, 35, 120), kind: 'log' }];
  layout.enemies = [circle('target', { x: 715, y: 867 }, 20)];
  const shot = planShot({ layout, pull: pullAt(0, 1), enemies: living(['target']) });
  assert.equal(shot.impactKind, 'enemy');
  assert.deepEqual(shot.hitIds, ['target']);
  assert.deepEqual(shot.contacts.map(contact => contact.obstacleId), ['first', 'second']);
  assert.ok(shot.contacts[0].distance < shot.contacts[1].distance);
  assert.ok(shot.contacts[0].time < shot.contacts[1].time);
  assert.ok(shot.contacts[1].distance < shot.impactDistance);
  assert.deepEqual(shot.contacts.map(contact => contact.rolling), [false, false]);
  for (const contact of shot.contacts) {
    const point = sampleAtDistance(shot.path, contact.distance);
    close(point.x, contact.point.x, .001); close(point.y, contact.point.y, .001);
  }
  const noFirst = planShot({ layout, pull: pullAt(0, 1), enemies: living(['target']),
    toppledObstacleIds: ['first'] });
  assert.ok(noFirst.contacts.every(contact => contact.obstacleId !== 'first'));
});

test('a grounded candy can start a three-stack chain after its own motion ends, with physical Forest damage only', () => {
  const layout = { ...empty(), obstacles: [physicalStack('a', 600), physicalStack('b', 745), physicalStack('c', 890)],
    enemies: [circle('target', { x: 1100, y: 850 }, 38)] };
  const options = { layout, pull: pullAt(-12.5, .84), enemies: living(['target']) };
  const before = structuredClone(options), shot = planShot(options);
  assert.deepEqual(shot.contacts.map(c => [c.obstacleId, c.trigger, c.sourceObstacleId, c.chainDepth]),
    [['a', 'candy', null, 0], ['b', 'obstacle', 'a', 1], ['c', 'obstacle', 'b', 2]]);
  assert.deepEqual(shot.hitIds, []);
  assert.ok(shot.contacts[1].time > shot.directHitTime);
  assert.ok(shot.contacts[2].time > shot.contacts[1].time);
  assert.equal(shot.contacts[2].distance, shot.impactDistance);
  assert.deepEqual(shot.contacts.map(c => c.logHit?.id ?? null), [null, null, 'target']);
  assert.ok(shot.simulationSeconds > shot.contacts[2].time);
  const state = BattleEngine.createRunState({ rng: () => .5 });
  state.enemies = [{ id: 'target', kind: 'snake', hp: 20, maxHp: 20, alive: true, attackCount: 0 }];
  const event = BattleEngine.resolveProjectile(state, { damage: 0, hitIds: [], rng: () => .5,
    shotMeta: { contacts: shot.contacts, directHitTime: shot.directHitTime } });
  assert.deepEqual(event.hits.map(h => [h.id, h.damage]), [['target', 3]]);
  assert.equal(state.score, 3);
  assert.equal(state.ammo, 2);
  assert.deepEqual(state.toppledObstacleIds, ['a', 'b', 'c']);
  assert.deepEqual(options, before);
  assert.deepEqual(planShot(options), shot, 'planning is deterministic and consumes no randomness');
});

test('chains stop across empty gaps and spent props, and reverse impulses propagate to the left', () => {
  const layout = { ...empty(), obstacles: [physicalStack('a', 600), physicalStack('b', 745), physicalStack('c', 2000)] };
  const args = { layout, pull: pullAt(-12.5, .85), enemies: [] };
  assert.deepEqual(planShot(args).contacts.map(c => c.obstacleId), ['a', 'b']);
  assert.deepEqual(planShot({ ...args, toppledObstacleIds: ['b'] }).contacts.map(c => c.obstacleId), ['a']);
  const reverse = { ...empty(), launcher: { ...empty().launcher, x: 1200 },
    obstacles: [physicalStack('a', 1000), physicalStack('b', 855), physicalStack('c', 710)] };
  const shot = planShot({ layout: reverse, pull: pullAt(192.5, .85), enemies: [] });
  assert.equal(shot.reverse, true);
  assert.deepEqual(shot.contacts.map(c => c.chainDepth), [0, 1, 2]);
  assert.ok(shot.contacts.every(c => c.direction === -1));
});

test('direct candy and moving stacks compete chronologically without duplicate activation for every material', () => {
  for (const [area, kind] of [['forest', 'log'], ['snow', 'ice'], ['city', 'crate'], ['chaos', 'crate']]) {
    const layout = { ...empty(), area, obstacles: [physicalStack('a', 600, kind), physicalStack('b', 745, kind), physicalStack('c', 890, kind)] };
    for (const angle of [-12.5, 0, 10]) {
      const shot = planShot({ layout, pull: pullAt(angle, .85), enemies: [] });
      assert.equal(new Set(shot.contacts.map(c => c.obstacleId)).size, shot.contacts.length);
      assert.ok(shot.contacts.every((c, i) => c.obstacleMotion && (!i || c.time >= shot.contacts[i - 1].time)));
      for (const c of shot.contacts.filter(c => c.trigger === 'obstacle')) {
        const parent = shot.contacts.find(p => p.obstacleId === c.sourceObstacleId);
        assert.ok(parent.time < c.time);
        assert.ok(parent.obstacleMotion.obstacleHits.some(h => h.id === c.obstacleId));
      }
    }
  }
});

test('Forest contacts attach the physical log result and extend playback until its settlement', () => {
  const layout = empty();
  layout.area = 'forest';
  layout.obstacles = [{ ...box('physical', 400, 744, 80, 156),
    id: 'physical', kind: 'log', x: 400, y: 744, width: 80, height: 156 }];
  layout.enemies = [circle('target', { x: 610, y: 852 }, 38)];
  const shot = planShot({ layout, pull: pullAt(0, 1), enemies: living(['target']) });
  const contact = shot.contacts[0];
  assert.ok(contact.logMotion.samples.length > 1);
  assert.deepEqual(contact.logEndPose, contact.logMotion.endPose);
  assert.deepEqual(contact.logHit, contact.logMotion.hit);
  assert.equal(contact.logMotion.startTime, contact.time);
  assert.ok(shot.simulationSeconds >= contact.time + contact.logMotion.durationSeconds);
  assert.equal(shot.directHitTime, shot.path.durationSeconds);
});

test('weak contact drops the candy and preserves the total five-diameter roll cap', () => {
  const layout = empty();
  layout.obstacles = [{ ...box('weak', 320, 780, 35, 120), kind: 'log' }];
  const shot = planShot({ layout, pull: pullAt(0, .1), enemies: [] });
  assert.deepEqual(shot.contacts.map(contact => contact.obstacleId), ['weak']);
  assert.equal(shot.impactKind, 'ground');
  assert.ok(shot.rollDistance > 0 && shot.rollDistance <= 100);
  assert.ok(shot.path.end.y <= layout.groundY - layout.candyRadius);
  assert.ok(shot.path.samples.every((sample, i) => i === 0
    || (sample.time > shot.path.samples[i - 1].time
      && sample.distance > shot.path.samples[i - 1].distance)));
});

test('distance sampling and preview use stored arc length and reject malformed tables', () => {
  const layout = empty(), pull = pullAt(55, .85);
  const shot = planShot({ layout, pull, enemies: [] });
  const d = shot.path.length * .3, p = sampleAtDistance(shot.path, d);
  assert.deepEqual(prefixEnd(shot.previewD), { x: p.x, y: p.y });
  assert.ok(Math.abs(p.time / shot.path.durationSeconds - .3) > .02);
  assert.deepEqual(sampleAtDistance(shot.path, -1), shot.path.samples[0]);
  assert.deepEqual(sampleAtDistance(shot.path, 1e9), shot.path.samples.at(-1));
  const custom = { length: 10, samples: [{ x: 0, y: 0, time: 0, distance: 0 },
    { x: 6, y: 8, time: 2, distance: 10 }] };
  assert.deepEqual(sampleAtDistance(custom, 5), { x: 3, y: 4, time: 1, distance: 5 });
  assert.equal(pathPrefixD(custom, 5), 'M0,0 L3,4');
  for (const invalid of [{ length: 0, samples: [] }, { ...custom, length: 11 },
    { length: 10, samples: [custom.samples[1], custom.samples[0]] },
    { length: 0, samples: [{ x: NaN, y: 0, time: 0, distance: 0 }] }]) {
    assert.throws(() => sampleAtDistance(invalid, 1), TypeError);
    assert.throws(() => pathPrefixD(invalid, 1), TypeError);
  }
});

test('swept polygon contacts catch thin walls, tangency, interior starts and avoid invisible AABB corners', () => {
  const path = line({ x: 0, y: 0 }, { x: 100, y: 0 });
  close(findObstacleContact(path, [box('thin', 50, -5, .01, 10)], 10).distance, 40, .0001);
  close(findObstacleContact(path, [box('tangent', 50, 10, 10, 10)], 10).distance, 50, .0001);
  assert.equal(findObstacleContact(path, [box('miss', 50, 10.01, 10, 10)], 10), null);
  assert.equal(findObstacleContact(path, [box('inside', -1, -1, 2, 2)], 10).distance, 0);
  const triangle = { id: 'triangle', polygon: [{ x: 40, y: 0 }, { x: 80, y: 40 }, { x: 40, y: 40 }] };
  assert.equal(findObstacleContact(line({ x: 70, y: -5 }, { x: 85, y: -5 }), [triangle], 3), null);
});

test('ordinary contacts stop at the first unique live id before the wall and preview/duration stop correctly', () => {
  const layout = empty(), pull = pullAt(0, 1);
  const base = planShot({ layout, pull, enemies: [] });
  const near = sampleAtDistance(base.path, 120), middle = sampleAtDistance(base.path, 240);
  const far = sampleAtDistance(base.path, 450);
  layout.enemies = [circle('far', far), circle('near', near), circle('middle', middle),
    circle('near', near), circle('dead', sampleAtDistance(base.path, 40)), circle('unknown', near)];
  layout.obstacles = [box('wall', 540, 600, 2, 300)];
  const enemies = [...living(['far', 'near', 'middle']), { id: 'dead', alive: false, hp: 0 }];
  const shot = planShot({ layout, pull, enemies });
  assert.deepEqual(shot.hitIds, ['near']);
  assert.equal(shot.selectedTargetId, null); assert.equal(shot.impactKind, 'enemy');
  assert.equal(shot.obstacleId, null); assert.ok(shot.blockerDistance > shot.impactDistance);
  assert.ok(shot.durationMs >= 420 && shot.durationMs <= 3200);
  const blocked = planShot({ layout, pull, enemies: living(['far']) });
  assert.equal(blocked.impactKind, 'obstacle'); assert.equal(blocked.obstacleId, 'wall');
  assert.deepEqual(blocked.hitIds, []);
  const expected = sampleAtDistance(blocked.path, Math.min(.3 * blocked.path.length, blocked.blockerDistance));
  assert.deepEqual(prefixEnd(blocked.previewD), { x: expected.x, y: expected.y });
  // An obstacle and monster both touching at start: the solid wins the tie.
  layout.obstacles = [box('touch', base.path.start.x - 1, base.path.start.y - 1, 2, 2)];
  layout.enemies = [circle('touching', base.path.start)];
  const tie = planShot({ layout, pull, enemies: living(['touching']) });
  assert.equal(tie.impactKind, 'obstacle'); assert.deepEqual(tie.hitIds, []);
  const ground = planShot({ layout: empty(), pull: pullAt(-90, 1), enemies: [] });
  assert.equal(ground.impactKind, 'ground');
  const reverse = planShot({ layout: empty(), pull: pullAt(180, 1), enemies: [], windAvailable: true });
  assert.equal(reverse.impactKind, 'bounds'); assert.equal(reverse.reverse, true);
  assert.equal(reverse.selectedTargetId, null);
  assert.equal(planShot({ layout: empty(), pull: { ...pull, ready: false }, enemies: [] }), null);
  assert.equal(planShot({ layout: {}, pull, enemies: [] }), null);
  assert.equal(planShot({ layout: { ...empty(), enemies: [null] }, pull, enemies: [] }), null);
});

test('a wall wins simultaneous moving-disc contact within one-millionth of a world unit', () => {
  const layout = empty(), pull = pullAt(0, 1);
  const base = planShot({ layout, pull, enemies: [] });
  const index = base.path.samples.findIndex(p => p.x >= 530);
  const a = base.path.samples[index - 1], b = base.path.samples[index];
  const t = (530 - a.x) / (b.x - a.x), segmentLength = b.distance - a.distance;
  const contact = { x: 530, y: a.y + (b.y - a.y) * t };
  const target = { x: contact.x + 20 * (b.x - a.x) / segmentLength,
    y: contact.y + 20 * (b.y - a.y) / segmentLength };
  layout.enemies = [circle('tie', target)];
  layout.obstacles = [box('wall', 540, 600, 2, 300)];
  const shot = planShot({ layout, pull, enemies: living(['tie']) });
  assert.equal(shot.impactKind, 'obstacle');
  assert.deepEqual(shot.hitIds, []);
});

test('Wind selects nearest endpoint target, bypasses solids visibly, and leaves flags/state unchanged', () => {
  const enemies = BattleEngine.createRoundEnemies('city', 3);
  const layout = buildBattlefield({ area: 'city', round: 3, enemies });
  const input = { layout, pull: pullAt(25, .6), enemies, windAvailable: true };
  const before = structuredClone(input), ordinary = planShot({ ...input, windAvailable: false });
  const expected = [...layout.enemies].sort((a, b) => Math.abs(a.x - ordinary.path.end.x)
    - Math.abs(b.x - ordinary.path.end.x))[0];
  const shot = planShot(input);
  assert.deepEqual(input, before);
  assert.equal(shot.selectedTargetId, expected.id);
  assert.deepEqual(shot.hitIds, [expected.id]);
  assert.equal(shot.path.kind, 'homing'); assert.equal(shot.path.endKind, 'target');
  assert.deepEqual(shot.path.end, { x: expected.collider.x, y: expected.collider.y });
  assert.equal(findObstacleContact(shot.path, layout.obstacles, 10), null);
  assert.ok(shot.path.samples.every((p, i) => !i || p.distance - shot.path.samples[i - 1].distance <= 4 + 1e-8));
  close(shot.path.durationSeconds, shot.path.length / 1400);
  const noTarget = planShot({ ...input, enemies: [] });
  assert.equal(noTarget.path.kind, 'ballistic'); assert.equal(noTarget.selectedTargetId, null);
  const reverse = planShot({ ...input, pull: pullAt(170, 1) });
  assert.equal(reverse.path.kind, 'ballistic'); assert.equal(reverse.selectedTargetId, null);
  const start = { x: 284, y: 812 }, target = { id: 't', x: 1000, y: 850, radius: 20 };
  assert.equal(getHomingPath({ start, target, layout, obstacles: [box('column', 280, 600, 8, 300)] }), null);
  assert.equal(getHomingPath({ start, target: { ...target, ...start }, layout, obstacles: [] }), null);
  assert.ok(getHomingPath({ start, target, layout, obstacles: [] }));
});

test('all real rounds and density extremes have an ordinary first-contact shot for every enemy', () => {
  let checked = 0;
  for (const area of ['forest', 'snow', 'city', 'chaos']) {
    for (let round = 1; round <= 3; round++) {
      for (const rng of [() => 0, () => .5, () => .999]) {
        const enemies = BattleEngine.createRoundEnemies(area, round, { rng });
        const layout = buildBattlefield({ area, round, enemies });
        for (const enemy of layout.enemies) {
          let witness = null;
          for (const angle of [35, 40, 45, 50, 55, 60, 65, 70]) {
            const radians = angle * Math.PI / 180, ux = Math.cos(radians), uy = -Math.sin(radians);
            // Independent analytic y at target x, accounting for power-dependent pouch position.
            const error = p => {
              const stretch = 12 + 60 * p, x0 = 284 - ux * stretch, y0 = 812 - uy * stretch;
              const speed = getLaunchSpeed(p), t = (enemy.collider.x - x0) / (ux * speed);
              return y0 + uy * speed * t + 600 * t * t - enemy.collider.y;
            };
            if (error(0) * error(1) > 0) continue;
            let low = 0, high = 1;
            for (let i = 0; i < 45; i++) {
              const mid = (low + high) / 2;
              if (error(mid) > 0) low = mid; else high = mid;
            }
            const shot = planShot({ layout, pull: pullAt(angle, (low + high) / 2), enemies });
            if (shot?.hitIds[0] === enemy.id && shot.impactKind === 'enemy') { witness = shot; break; }
          }
          assert.ok(witness, `No ordinary shot reaches ${enemy.id} (slots=${enemies.length})`);
          assert.equal(witness.selectedTargetId, null);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 100);
});

test('a meaningful low blocker can be cleared by a high ordinary shot', () => {
  const enemies = [{ id: 'target', kind: 'snake', isBoss: false, hp: 4, alive: true }];
  const layout = buildBattlefield({ area: 'forest', round: 1, enemies });
  const low = planShot({ layout, pull: pullAt(15, .8), enemies });
  assert.ok(low.contacts.length > 0);
  const high = planShot({ layout, pull: pullAt(55, 1), enemies });
  assert.ok(high.path.samples.some(p => p.x > 2300 && p.y < 700));
  assert.equal(high.contacts.length, 0);
  const draw = getDragDraw(pullAt(55, 1));
  close(high.path.start.x, layout.launcher.x + draw.pouch.x);
});
