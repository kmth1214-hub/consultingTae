import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { getCandyDetails } from '../src/game/candyPresentation.js';

function run(grade = 'C') {
  return BattleEngine.createRunState({ rng: () => .5, weapons: [{ ...BattleEngine.WEAPON_CATALOG[0], grade }] });
}

test('candy HUD explains the loaded ability and Spear replacement in all regions', () => {
  const state = run();
  state.area = 'forest';
  state.studioPrototype = 'forest-elevated-v1';
  const ordinary = getCandyDetails(state);
  assert.ok(ordinary.currentAbility);
  assert.equal(ordinary.buffs.includes(ordinary.currentAbility), false);
  state.spearArmed = true;
  const spear = getCandyDetails(state);
  assert.ok(spear.currentAbility);
  assert.notEqual(spear.currentAbility, ordinary.currentAbility);
  state.studioPrototype = null;
  assert.match(getCandyDetails(state).currentAbility, /창 관통/);
});

test('Wizard HUD describes split orb damage in the regular game', () => {
  const state = BattleEngine.createRunState({ characterId: 'wizard', rng: () => .5 });
  state.studioPrototype = 'forest-elevated-v1';
  assert.ok(getCandyDetails(state).currentAbility);
  state.studioPrototype = null;
  state.currentWeaponId = state.weapons.find(weapon => weapon.id === 'basic-stone').instanceId;
  assert.match(getCandyDetails(state).currentAbility, /공통 피해/);
});

test('HUD ranges use the actual engine roll endpoints for every grade and zero protection', () => {
  for (const [grade, expected] of [['C', [0, 4]], ['B', [1, 6]], ['A', [2, 10]]]) {
    const state = run(grade), details = getCandyDetails(state);
    assert.deepEqual([details.damage.min, details.damage.max], expected);
    state.zeroRollsThisRound = 2;
    const capped = getCandyDetails(state);
    assert.equal(capped.damage.min, grade === 'C' ? 1 : expected[0]);
    assert.equal(capped.damage.min, BattleEngine.rollWeaponDamage(() => 0, grade, 2));
    assert.equal(capped.damage.max, BattleEngine.rollWeaponDamage(() => .999, grade, 2));
    state.fireballArmed = true;
    const fiery = getCandyDetails(state);
    assert.equal(fiery.damage.multiplier, 2);
    assert.match(fiery.buffs[0], /×2/);
    assert.equal(fiery.damage.min, capped.damage.min);
  }
});

test('owned passive abilities are deduplicated with actual counters and available/used flags', () => {
  const state = run();
  state.weapons = [...BattleEngine.WEAPON_CATALOG, BattleEngine.WEAPON_CATALOG[0]].map((w, i) => ({ ...w, instanceId: String(i) }));
  state.currentWeaponId = '1'; state.weaponQueue = ['1', '3'];
  state.effectCounters = { permanentWeaponHits: 5, projectileCollisions: 8 };
  state.roundEffects = { windHomingUsed: true };
  state.pendingAimInversion = true; state.defenseArmed = true; state.nextAttackDamageMultiplier = .5;
  const before = structuredClone(state), details = getCandyDetails(state);
  assert.equal(details.passives.length, 5);
  assert.match(details.passives[0].text, /튀어/);
  assert.match(details.passives.find(p => p.id === 'wizard-orb').text, /2\/3/);
  assert.match(details.passives.find(p => p.id === 'wind-candy').text, /4점/);
  assert.equal(details.buffs.length, 3);
  assert.equal(details.next.id, 'wizard-orb');
  assert.equal(details.reshuffleNext, false);
  assert.deepEqual(state, before);
});

test('the last queue entry cannot invent the reshuffled next candy or consume randomness', () => {
  const state = run(), original = Math.random;
  try {
    Math.random = () => { throw new Error('HUD cannot consume random rolls'); };
    const details = getCandyDetails(state);
    assert.equal(details.next, null);
    assert.equal(details.reshuffleNext, true);
    assert.equal(getCandyDetails(null), null);
    assert.equal(getCandyDetails({ weapons: [] }), null);
    state.weapons[0].grade = 'unknown';
    assert.equal(getCandyDetails(state), null);
  } finally { Math.random = original; }
});
