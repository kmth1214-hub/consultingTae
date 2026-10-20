# Task: T01 Projectile Combat and Terminal State

## Status: done

## Goal
Turn the existing projectile animation into a real combat action: hit targets along its path, apply weapon damage and score, let a living enemy respond, and end a run on ammo exhaustion or clear.

## Decision Summary
- Follow the combat, damage-roll, score, spillover, and boss cadence rules in `.memory/decisions/2026-09-29-cookie-roguelike.md`.
- The projectile path already stored in `#trajectoryGeometry` is the path used for collision checks; no separate hidden trajectory may disagree with the visible shot.
- All randomness must be injectable so gameplay tests are deterministic.

## Implementation

### I01. Create the shared battle engine and regression tests

- Related files:
  - `assets/js/battle-engine.js` :: `createRunState`, `createRoundEnemies`, `rollWeaponDamage`, `resolveProjectile`, `resolveEnemyTurn`, `isRunDefeated`, `isRoundCleared` — pure state transitions shared by browser and tests; new.
  - `tests/battle-engine.test.cjs` :: `node:test` cases for hit, miss, spillover, score, enemy response, ammo defeat, boss special cadence, and zero-roll cap; new.
  - `cookie-roguelike-mockup.html` :: script includes and `fireShot` — load shared engine and call it after projectile animation; modify.

#### Details
- Use a UMD-style wrapper: export the same API as `module.exports` in Node and `window.BattleEngine` in the browser. Do not add dependencies or a package manager.
- State schema: `area` (`forest|snow|city|chaos`), `round` (integer), `playerHp` (integer, 0–100), `ammo` (integer, 0–9), `score` (integer >= 0), `zeroRollsThisRound` (integer), `enemyTurnIndex` (integer), `turnNumber` (integer), `terminal` (`null|'defeat'|'clear'`), and `enemies` (array of `{id, kind, hp, maxHp, isBoss, attackCount, alive}`). Initialize a fresh run with 100 HP, 9 ammo, score 0; initialize `forest` round 1 with one snake and no external persistence.
- Enemy composition for the main run follows the existing decision record: Forest regular counts 1/2/2/3 with one snake and remaining boars; Snow counts 5/6/6/7 with one dry-ice enemy and remaining snowballs; City counts 9/10/10/11 washing robots; final round has only the area boss. Chaos rules are applied only where specified by the existing decision record.
- `rollWeaponDamage(rng, grade, zeroRollsThisRound)` samples C damage 0–4 with weights `[.02,.40,.40,.10,.08]`; B and A add one and two damage respectively. Clamp the weighted zero-result to at least one after two zero rolls in the current round. Inject `rng` as an argument; do not call unseeded random functions from tests.
- `resolveProjectile(state, {hitIds, damage, weaponGrade, source})` consumes one ammo and one queued permanent weapon for a permanent shot, processes unique living hit IDs in encounter order, applies carryover only after defeating a target, awards score for actual HP removed times grade multiplier, updates killed enemies, then returns an event object with the ordered hits, spillover, score delta, `roundCleared`, and `runDefeated`. A miss still spends ammo/weapon and triggers an enemy turn if combat remains active.
- Use `resolveEnemyTurn(state, rng)` to select the next living enemy round-robin. Apply regular or boss damage ranges from the decision record, increment that boss's attack counter, and execute its unique special on every third attack. Defense/character blocks will be integrated by T02. If player HP reaches zero, set `terminal='defeat'`.
- Add `#sceneCombatLog` or update an existing status region with concise hit/miss/damage/defeat feedback and make the HUD read `state` after each transition. On ammo exhaustion with enemies alive, set terminal defeat immediately; on zero living enemies, stop enemy turns and signal round clear.
- Keep DOM collision extraction in `fireShot`: sample the actual SVG path length at fixed steps, calculate each `.monster` center/radius in `#arenaWorld` coordinates, retain each living enemy's first encounter distance, and pass IDs in ascending path distance. Never infer collision from the endpoint alone. Treat visuals as 2D circles with radius `max(width,height)*0.38` as an initial deterministic hit shape.
- Do not change camera zoom, aiming state machine, projectile animation, theme art, or obstacle decorations.

### I02. Render terminal and hit outcomes

- Related files:
  - `cookie-roguelike-mockup.html` :: `fireShot`, `onArenaPointerUp`, `#hpValue`, `#ammoValue`, `.monster` rendering, `showScreen('defeat'|'reward')` — bind engine results into the current page; modify.

#### Details
- Update live monster HP labels and remove/mark defeated monster art without changing the number of monsters mid-animation. Use the result event for one-shot feedback.
- Update HP/ammo/score after the action. Trigger an enemy response after a miss or surviving hit; skip it when the shot clears the last enemy or the player is terminal.
- Transition to the existing defeat screen on terminal defeat and into the existing reward screen on round clear. T03 will make those screens' contents and next-round selection dynamic; until then pass the event without duplicating static state.
- Preserve boss special trigger every third attack; do not use every fourth attack.

## Acceptance Criteria
- [x] Browser run initializes live state; the firing handler resolves hit IDs from the visible SVG path and updates ammo, HP, score, enemy HP, and turns.
- [x] A surviving enemy responds after a miss or surviving hit; no response happens after the last enemy dies or combat ends.
- [x] Ammo exhaustion with living enemies transitions to the existing defeat screen, and clearing all enemies transitions to reward.
- [x] Boss special action occurs on the third boss attack.
- [x] Deterministic unit tests cover damage weights, zero cap, order/spillover, score, enemy response, and terminal states.
- [x] Existing aim controls, camera, and third-attack cadence remain intact.

## Validation
- `node --test tests/battle-engine.test.cjs`
- Browser regression: reset page, sign in with the mock company account, start Adventurer run, and confirm 100 HP, 9 ammo, one Forest R1 enemy, score 0, and no console errors. The CUA browser API cannot hold the mouse while releasing Space, so the physical fire gesture could not be driven end-to-end; projectile transitions are covered in the deterministic engine tests.
- `git diff --check`

## Commit Message
```text
feat(game): resolve projectile combat and run endings

Plan: 2026-10-20-combat-state-repair
Phase: P01-gameplay-state
Task: T01-projectile-combat

- Resolve trajectory hits, damage, score, and enemy turns
- End combat on ammo exhaustion or round clear
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: ae99826
