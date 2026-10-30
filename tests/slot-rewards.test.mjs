import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleEngine } from '../src/game/battleEngine.js';

const win = [0, 0, 0, .25, .5, .75, .25, .5, .75];
const miss = [0, .25, .5, .75, .5, .25, .25, .75, 0];
function sequence(values) { let i = 0; return () => values[i++ % values.length]; }
function ready(area = 'forest', round = 1) {
  const state = BattleEngine.createRunState({ area, round, rng: () => .5, inventory: {} });
  state.terminal = 'round-clear';
  BattleEngine.drawRewardChoices(state, () => .5);
  return state;
}

test('horizontal and diagonal matches award one exclusive stone, vertical alone does not', () => {
  const horizontal = ready();
  const event = BattleEngine.spinRewardSlot(horizontal, 'stone', sequence(win));
  assert.equal(event.accepted, true);
  assert.equal(event.result.prizeId, 'adventurer-candy');
  assert.deepEqual(event.result.winningLine, [0, 1, 2]);
  assert.equal(horizontal.weapons.length, 4);
  assert.equal(BattleEngine.spinRewardSlot(horizontal, 'stone', sequence(win)).accepted, false);
  const diagonal = ready();
  const diagonalBoard = [0, .25, .5, .25, 0, .75, .5, .75, 0];
  assert.deepEqual(BattleEngine.spinRewardSlot(diagonal, 'stone', sequence(diagonalBoard)).result.winningLine, [0, 4, 8]);
  const vertical = ready();
  const verticalBoard = [0, .25, .5, 0, .5, .75, 0, .75, .25];
  const loser = BattleEngine.spinRewardSlot(vertical, 'stone', sequence(verticalBoard));
  assert.equal(loser.result.winningLine, null);
  assert.equal(loser.result.prizeId, 'basic-stone');
});

test('winning reward samples every unlocked stone uniformly, including other cookies', () => {
  const firstThree = ['adventurer-candy', 'alchemist-candy', 'wizard-orb'];
  for (let index = 0; index < firstThree.length; index++) {
    const state = ready();
    const result = BattleEngine.spinRewardSlot(state, 'stone', sequence([...win, (index + .5) / 3]));
    assert.equal(result.result.prizeId, firstThree[index]);
    assert.equal(state.weapons.at(-1).grade, 'C');
  }
  const allFive = [...firstThree, 'milk-candy', 'wind-candy'];
  for (let index = 0; index < allFive.length; index++) {
    const state = BattleEngine.createRunState({ characterId: 'adventurer', area: 'forest', rng: () => .5,
      snowRewardsUnlocked: true, inventory: {} });
    state.terminal = 'round-clear';
    BattleEngine.drawRewardChoices(state, () => .5);
    const result = BattleEngine.spinRewardSlot(state, 'stone', sequence([...win, (index + .5) / 5]));
    assert.equal(result.result.prizeId, allFive[index]);
    assert.equal(state.weapons.at(-1).id, allFive[index]);
  }
});

test('a borrowed stone is one new instance and invalid prize RNG grants nothing', () => {
  const state = BattleEngine.createRunState({ characterId: 'milk', area: 'forest', rng: () => .5,
    snowRewardsUnlocked: true, inventory: {} });
  state.terminal = 'round-clear';
  BattleEngine.drawRewardChoices(state, () => .5);
  const before = state.weapons.length;
  assert.throws(() => BattleEngine.spinRewardSlot(state, 'stone', sequence([...win, 1])), /Invalid slot RNG/);
  assert.equal(state.weapons.length, before);
  assert.equal(state.slotReward.stoneSpinsRemaining, 1);
  const result = BattleEngine.spinRewardSlot(state, 'stone', sequence([...win, .99]));
  assert.equal(result.result.prizeId, 'wind-candy');
  assert.equal(state.weapons.length, before + 1);
  assert.equal(state.weapons.at(-1).grade, 'C');
});

test('slot stone is permanent and the next round refills the expanded deck', () => {
  const state = ready();
  BattleEngine.spinRewardSlot(state, 'stone', sequence(miss));
  assert.equal(state.ammo, 3);
  const choice = state.rewardChoices.consumables[0];
  assert.equal(BattleEngine.applyRewardChoice(state, 'consumable', choice.choiceId).accepted, true);
  assert.equal(BattleEngine.advanceRound(state, { rng: () => .5 }).accepted, true);
  assert.equal(state.ammo, 4);
  assert.equal(state.weapons.length, 4);
  state.terminal = 'round-clear';
  BattleEngine.drawRewardChoices(state, () => .5);
  BattleEngine.spinRewardSlot(state, 'stone', sequence(miss));
  BattleEngine.applyRewardChoice(state, 'consumable', state.rewardChoices.consumables[0].choiceId);
  BattleEngine.advanceRound(state, { rng: () => .5 });
  assert.equal(state.ammo, 5);
});

test('chaos has independent stone and consumable spins; a miss gives no item', () => {
  const state = ready('chaos', 1);
  assert.equal(state.slotReward.consumableSpinsRemaining, 1);
  BattleEngine.spinRewardSlot(state, 'stone', sequence(miss));
  const inventoryBefore = structuredClone(state.inventory);
  const result = BattleEngine.spinRewardSlot(state, 'consumable', sequence(miss));
  assert.equal(result.result.prizeId, null);
  assert.deepEqual(state.inventory, inventoryBefore);
  assert.equal(BattleEngine.advanceRound(state, { rng: () => .5 }).accepted, true);
  assert.equal(state.round, 2);
  const full = BattleEngine.createRunState({ area: 'chaos', rng: () => .5,
    inventory: { fireball: 3, spear: 3, defense: 3, heal: 3 } });
  full.terminal = 'round-clear';
  BattleEngine.drawRewardChoices(full, () => .5);
  assert.equal(full.slotReward.consumableSpinsRemaining, 0);
  assert.equal(full.selectedRewards.consumable, 'skip');
});

test('camp offers exactly two extra stone spins and waits before entering next region', () => {
  const state = ready('forest', 3);
  BattleEngine.spinRewardSlot(state, 'stone', sequence(win));
  BattleEngine.applyRewardChoice(state, 'consumable', state.rewardChoices.consumables[0].choiceId);
  assert.equal(BattleEngine.advanceRound(state, { rng: () => .5 }).pendingCamp, true);
  assert.equal(BattleEngine.chooseCampReward(state, 'weapon').slotReady, true);
  assert.equal(BattleEngine.finishCampSlot(state).accepted, false);
  BattleEngine.spinRewardSlot(state, 'stone', sequence(win));
  BattleEngine.spinRewardSlot(state, 'stone', sequence(miss));
  assert.equal(state.weapons.length, 6);
  assert.equal(BattleEngine.finishCampSlot(state, { rng: () => .5 }).accepted, true);
  assert.equal(state.area, 'snow');
  assert.equal(state.ammo, 6);
});
