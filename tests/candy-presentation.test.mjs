import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';
import { getCandyDetails } from '../src/game/candyPresentation.js';

function run(grade = 'C') {
  return BattleEngine.createRunState({ rng: () => .5, weapons: [{ ...BattleEngine.WEAPON_CATALOG[0], grade }] });
}

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
  state.currentWeaponId = '0'; state.weaponQueue = ['0', '2'];
  state.effectCounters = { permanentWeaponHits: 5, projectileCollisions: 8 };
  state.roundEffects = { milkBossBlockUsed: true, windHomingUsed: true };
  state.pendingAimInversion = true; state.defenseArmed = true; state.nextAttackDamageMultiplier = .5;
  const before = structuredClone(state), details = getCandyDetails(state);
  assert.equal(details.passives.length, 5);
  assert.match(details.passives[0].text, /2\/3/);
  assert.match(details.passives.find(p => p.id === 'wizard-orb').text, /2\/3/);
  assert.match(details.passives.find(p => p.id === 'wind-candy').text, /사용 완료/);
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
