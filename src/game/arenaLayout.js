import { buildBattlefield } from './battlefieldModel.js';

// Compatibility for consumers that need live state joined to canonical stable slots.
export function monsterPositions(enemies, area = 'forest', round = 1) {
  return buildBattlefield({ area, round, enemies }).enemies.map((placement, i) => ({ ...enemies[i], ...placement }));
}
