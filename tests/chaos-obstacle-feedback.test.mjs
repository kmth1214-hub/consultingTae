import test from 'node:test';
import assert from 'node:assert/strict';
import { getChaosObstacleCues, getChaosEffectLabel } from '../src/game/chaosObstacleFeedback.js';

const prop = { id: 'chaos-1-obstacle-1', kind: 'ice', x: 1000, y: 744, width: 80, height: 156 };
const layout = { obstacles: [prop] };
const args = (kind = 'ice-guard') => ({ area: 'chaos', layout, event: { id: 1, source: 'weapon',
  shotMeta: { contacts: [{ obstacleId: prop.id, point: { x: 995, y: 800 }, direction: -1 }] },
  obstacleEffects: [{ obstacleId: prop.id, kind, hits: [{ id: 'target', damage: 3 }] }] } });

test('Chaos presentation follows the actual committed effect for every material, without any random draws', () => {
  const random = Math.random;
  Math.random = () => { throw new Error('presentation must not roll again'); };
  try {
    for (const material of ['ice', 'log', 'crate']) for (const kind of ['log-strike', 'ice-guard', 'jar-burst', 'aim-inversion']) {
      const input = args(kind); input.layout = { obstacles: [{ ...prop, kind: material }] };
      const before = structuredClone(input), cues = getChaosObstacleCues(input);
      assert.equal(cues.length, 1); assert.equal(cues[0].kind, kind);
      assert.equal(cues[0].label, getChaosEffectLabel(input.event.obstacleEffects[0]));
      assert.equal(cues[0].contact.obstacleKind, material);
      assert.deepEqual(cues[0].contact.point, { x: 995, y: 800 });
      assert.equal(cues[0].contact.direction, -1);
      assert.deepEqual(input, before);
      assert.deepEqual(getChaosObstacleCues(input), cues, 'stable keys across rerenders');
      cues[0].hits[0].damage = 100;
      assert.equal(input.event.obstacleEffects[0].hits[0].damage, 3);
    }
  } finally { Math.random = random; }
});

test('other regions, consumables, prior-round ids, unknown effects and duplicate props cannot replay Chaos cues', () => {
  assert.deepEqual(getChaosObstacleCues({ ...args(), area: 'snow' }), []);
  for (const source of ['spear', 'heal', 'item']) assert.deepEqual(getChaosObstacleCues({ ...args(), event: { ...args().event, source } }), []);
  const input = args();
  input.event.obstacleEffects.push({ obstacleId: 'chaos-0-obstacle-1', kind: 'jar-burst' },
    { obstacleId: prop.id, kind: 'jar-burst' }, { obstacleId: 'unknown', kind: 'oops' });
  assert.deepEqual(getChaosObstacleCues(input).map(c => c.kind), ['ice-guard']);
  input.event.id++;
  assert.notEqual(getChaosObstacleCues(input)[0].id, getChaosObstacleCues(args())[0].id);
});

test('legacy effects use a finite prop-centre fallback and invalid data does not fabricate cues', () => {
  const legacy = { area: 'chaos', layout, event: { id: 3, source: 'weapon', obstacleEffect: { kind: 'aim-inversion', obstacleId: prop.id } } };
  assert.deepEqual(getChaosObstacleCues(legacy)[0].contact.point, { x: 1040, y: 822 });
  for (const id of [undefined, NaN, -1, 0, '1']) assert.deepEqual(getChaosObstacleCues({ ...legacy, event: { ...legacy.event, id } }), []);
  assert.deepEqual(getChaosObstacleCues({ ...legacy, layout: { obstacles: [{ id: prop.id }] } }), []);
  assert.deepEqual(getChaosObstacleCues(), []);
  assert.equal(getChaosEffectLabel(null), null);
  const badContacts = { ...legacy, event: { ...legacy.event, shotMeta: { contacts: [null, { obstacleId: prop.id, point: { x: NaN, y: 0 } }] } } };
  assert.deepEqual(getChaosObstacleCues(badContacts)[0].contact.point, { x: 1040, y: 822 });
});
