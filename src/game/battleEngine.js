import '../../assets/js/battle-engine.js';

const BattleEngine = globalThis.BattleEngine;
if (!BattleEngine || typeof BattleEngine.createRunState !== 'function') {
  throw new Error('The battle engine failed to initialize.');
}

export { BattleEngine };
