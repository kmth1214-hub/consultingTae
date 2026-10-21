# Task: T02 Gameplay Rule Completion

## Status: pending

## Goal
Bring the existing battle engine into parity with confirmed first-release rules and lock every added rule with deterministic Node tests before React screens consume it.

## Decision Summary
- Preserve all existing damage probabilities, spillover order, enemy turns, item effects, boss third-attack cadence, standard rewards, and area progression.
- Add the confirmed character effects, one-random-consumable starting inventory, explicit duplicate-weapon merge choice, browser-persisted Snow unlock, and playable three-round Chaos bonus route.
- Bonus score uses the same HP-removed and grade multipliers as the main route but is kept separate; no QR, bonus reward, global claim, account, or leaderboard behavior is part of this release.

## Implementation

### I01. Extend run state and starting inventory
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `getRunSummary`, `AREAS`; modify
  - `tests/battle-engine.test.cjs` :: run creation and summary tests; modify
- **Signatures & Types**: preserve `createRunState(options)`; supported option fields: `area`, `round`, `characterId`, `weapons`, `inventory`, `playerHp`, `ammo`, `score`, `now`, `rng`. Add exported `startBonusRoute(state, options)` returning `{accepted, reason?, area?, round?}`.
- **Data & Schema Fields**: `RunState` adds `characterId:string`, `bonusScore:number`, `bonusMode:boolean`, `effectCounters:{permanentWeaponHits:number, projectileCollisions:number, consumablesUsed:number}`, and `roundEffects:{windHomingUsed:boolean, milkBossBlockUsed:boolean}`. Main `score` remains the standard-route score. `inventory` always has numeric keys `fireball`, `spear`, `defense`, `heal` in range 0–3.
- **Execution Flow / Logic**:
  1. If `options.inventory` is omitted, initialize all four counts to zero and give exactly one random consumable using the injected `rng`; when `options.inventory` is supplied, preserve it subject to the existing 0–3 cap.
  2. Initialize all counters to zero and set `bonusScore=0`, `bonusMode=false`; reset round-local effect flags on every `enterRound`.
  3. A successful Snow boss clear sets a run event/flag that the UI can persist; do not store the whole run.
  4. `getRunSummary` returns `score`, `bonusScore`, `finalScore` for the main route, `unusedConsumablePoints`, HP, area, round, furthest area, and duration. Keep bonus points separate from `finalScore`.
  5. `startBonusRoute` accepts only a completed City run (`terminal==='clear'`), then enters `chaos` round 1 with 9 ammo, retains main score/HP/inventory/weapons, resets `bonusScore`, and returns `{accepted:true,area:'chaos',round:1}`. Reject other states without mutation.
- **Error Handling**: use existing `accepted:false`/`reason` convention; reject repeated entry and invalid run state. Inject `rng` in every random decision so tests remain deterministic.

### I02. Implement owned-weapon effects and prompted fusion
- Related Files:
  - `assets/js/battle-engine.js` :: `resolveProjectile`, `useConsumable`, `resolveEnemyTurn`, `grantWeapon`, `applyRewardChoice`, `enterRound`; modify
  - `tests/battle-engine.test.cjs` :: character-effect and fusion tests; modify
- **Data & Schema Fields**: add/maintain `effectCounters.permanentWeaponHits`, `.projectileCollisions`, `.consumablesUsed`, `roundEffects.windHomingUsed`, `.milkBossBlockUsed`. Owned effect types are deduplicated by `weapon.id`; duplicate copies do not stack effects.
- **Execution Flow / Logic**:
  1. Count a permanent-weapon hit once when its projectile geometrically collides with at least one monster, even when rolled damage is zero; every actual monster collision along the path increments `projectileCollisions`. Separate geometry collisions from HP damage so a zero roll still triggers collision counters. Apply the Wizard's +1 on each third collision before resolving that collision's HP loss. Spear is a consumable and does not trigger permanent-weapon effects.
  2. If the Adventurer effect is owned, award +10 main or bonus points on every third permanent-weapon hit. If the Alchemist effect is owned, award +10 points in the active route for every accepted consumable use.
  3. If the Wizard effect is owned, add +1 projectile damage on each third permanent-projectile collision. If the Milk effect is owned, heal 1 HP on each third such collision (cap at 100) and block one enemy attack per boss round; reset only the boss-round block flag when a new boss round begins.
  4. If Wind is owned and unused this round, the selected target becomes a guaranteed hit, is processed before other path targets, and gains +1 damage when the selected target is a boss. Spend the homing charge on that projectile and reset it on the next round.
  5. Route all score awards to `state.score` during Forest/Snow/City and `state.bonusScore` during Chaos; use HP actually removed and weapon-grade multipliers for projectile damage points.
  6. For a duplicate C/B reward, `applyRewardChoice(state,'weapon',choiceId, options)` returns `{accepted:false,reason:'fusion-decision-required',fusionCandidate}` unless `options.mergeDuplicate` is provided. `mergeDuplicate:true` upgrades C→B or B→A; `false` adds a distinct copy. A-grade copies never fuse. Once resolved, mark the reward selected exactly once.
- **Error Handling**: invalid/repeated reward choices preserve the existing reasons; no count, grade, score, or ammo changes on rejected actions. Do not let a passive effect apply to consumable Spear damage.

### I03. Add complete Chaos route and browser unlock profile
- Related Files:
  - `assets/js/battle-engine.js` :: `createRoundEnemies`, `advanceRound`, `enterRound`, `resolveEnemyTurn`; modify
  - `src/game/profileStore.js` :: `loadProfile`, `saveProfile`, `markSnowCleared`; new
  - `tests/battle-engine.test.cjs` :: Chaos route and scoring tests; modify
  - `tests/profile-store.test.mjs` :: local-storage profile tests; new
- **Data & Schema Fields**: Chaos round 1 and 2 contain 9–13 random regular monsters from `snake`, `boar`, `dry-ice`, `snowball`, `washing-robot`, each 4 HP. Chaos round 3 contains `pointy-boar` 15 HP, `cowardly-snowman` 18 HP, `oven-robot` 23 HP; the bonus Oven Robot's max HP is 26. Profile schema: `cookie-roguelike.profile.v1` stores JSON `{version:1,snowAreaCleared:boolean}`.
- **Execution Flow / Logic**:
  1. `createRoundEnemies('chaos',1|2,{rng})` chooses 9–13 regular enemies. Round 3 returns the three bosses together, with `attackCount:0`, living state, and independent attack cadence.
  2. Resolve a boss's special attack definition from its `kind`, not `state.area`, so each Chaos boss retains the normal third-attack pattern and independent `attackCount`. Chaos Oven Robot overheat heals up to 26 HP; standard City Oven Robot remains capped at 18.
  3. `advanceRound` in Chaos round 1 or 2 enters the next round directly with fresh ammo and no standard reward/camp. Clearing Chaos round 3 ends with `terminal:'bonus-clear'`; do not call `drawRewardChoices` or grant any item/weapon.
  4. Chaos monster damage contributes to `bonusScore` using the same base damage roll, zero-roll cap, actual HP removed, and weapon-grade multiplier as normal combat. City/main score remains unchanged after bonus entry.
  5. `loadProfile(storage=window.localStorage)` returns `{version:1,snowAreaCleared:false}` when empty, malformed, unavailable, or unsupported; `saveProfile(profile,storage)` writes a validated boolean schema and returns success/failure; `markSnowCleared(profile)` returns a new profile with `snowAreaCleared:true`.
  6. Store only the Snow unlock bit in the current browser, not the run, identity, scores, or inventory. A successful Snow boss clear permanently unlocks Milk and Wind in that browser.
- **Error Handling**: invalid storage JSON and privacy-mode storage exceptions fall back to the default locked profile without crashing the game. Invalid Chaos rounds return deterministic documented state or an `accepted:false` result; never silently create unlimited boss stages.

## Acceptance Criteria
- [ ] Existing 19 engine tests continue to pass, updated only where an older expectation contradicts the confirmed one-item start or explicit merge prompt.
- [ ] Deterministic tests cover each five character effects, no effect stacking from duplicates, effects across areas, random starting item, C→B→A accept/decline fusion, all three Chaos rounds, independent boss attack counts, bonus score separation, no bonus rewards, and storage failure.
- [ ] Main route score is unchanged by bonus damage; the bonus summary shows the separate bonus score.
- [ ] Milk and Wind unlock after Snow boss clear and remain unlocked after reload in the same browser.

## Validation
- `npm test` (`node --test`) — all `node:test` engine and profile-store cases pass with injected RNG and storage fixtures.

## Commit Message
```text
feat(game): complete first-release combat rules

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T02-gameplay-rule-completion

- Complete character effects, random starter inventory, and fusion decisions.
- Add Chaos combat scoring and browser-persisted Snow unlock.
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
