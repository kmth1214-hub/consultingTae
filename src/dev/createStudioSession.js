import { BattleEngine } from '../game/battleEngine.js';
import { CHARACTERS, REGIONS } from '../game/gameData.js';
import { createGameSession } from '../game/gameSession.js';
import { buildPlayableBattlefield } from '../game/battlefieldPlacement.js';

/** A development-only entry into the real session, with no browser persistence. */
export function createStudioScenario({ area, round, characterId = 'adventurer', bossSpecial = false, seed = 0 } = {},
  { engine = BattleEngine, runOptions = {} } = {}) {
  if (!Object.hasOwn(REGIONS, area) || !Number.isInteger(round) || round < 1 || round > 3
    || !CHARACTERS.some(c => c.id === characterId) || typeof bossSpecial !== 'boolean'
    || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('Invalid studio battle settings');
  let rosterSeed = seed;
  const rosterRng = () => {
    rosterSeed = (Math.imul(rosterSeed, 1664525) + 1013904223) >>> 0;
    return rosterSeed / 0x100000000;
  };
  const run = engine.createRunState({ ...runOptions, area, round, characterId, playerHp: 100, ammo: 9, rng: rosterRng,
    studioMonsterPrototype: area !== 'forest' ? 'regional-monsters-v1' : null,
    inventory: { fireball: 3, spear: 3, defense: 3, heal: 3 } });
  run.studioWorldScale = 1.5;
  run.studioPrototype = area === 'forest' ? 'forest-elevated-v1' : 'regional-elevated-v1';
  run.enemyLandingPositions = {};
  if (round === 3 && bossSpecial) for (const enemy of run.enemies) if (enemy.isBoss) enemy.attackCount = 2;
  run.layoutSeed = seed;
  const layout = buildPlayableBattlefield({ area, round, enemies: run.enemies, seed,
    prototype: run.studioPrototype ?? null, worldScale: run.studioWorldScale });
  return { area, round, characterId, bossSpecial, seed, prototype: run.studioPrototype ?? null,
    enemies: structuredClone(run.enemies), layout, run };
}

export function createStudioSession(config = {},
  { engine = BattleEngine, rng = Math.random, now = Date.now } = {}) {
  const scenario = createStudioScenario(config, { engine, runOptions: { now: now(), snowRewardsUnlocked: true } });
  const seed = scenario.seed;
  const profile = new Map([['cookie-roguelike.profile.v1', JSON.stringify({ version: 1, snowAreaCleared: true })]]);
  const session = createGameSession({ rng, now, layoutRng: () => seed / 0x100000000,
    storage: { getItem: key => profile.get(key) ?? null, setItem: (key, value) => profile.set(key, value) },
    engine: { ...engine, createRunState() {
      return structuredClone(scenario.run);
    },
      // Bonus combat normally advances immediately. Keep this isolated test on
      // its chosen round; StudioPlay shows its result after playback settles.
      advanceRound() { return { accepted: false, reason: 'studio-round-complete' }; }
    }
  });
  session.actions.startCharacterSelect();
  if (!session.actions.startRun(scenario.characterId).accepted) throw new Error('Could not start studio battle');
  return session;
}
