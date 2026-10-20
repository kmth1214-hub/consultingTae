# Task: T03 Rewards, Progression, and Live Results

## Status: done

## Goal
Make reward and camp selections change the active run, gate progression on required choices, and display current run state rather than static mock values.

## Decision Summary
- Follow reward/area/run order and weapon/consumable ownership rules in `.memory/decisions/2026-09-29-cookie-roguelike.md`.
- Keep all run data in memory; persistent company leaderboard/authentication remains out of scope.

## Implementation

### I01. Apply rewards and advance configured rounds
- Related files:
  - `assets/js/battle-engine.js` :: `drawRewardChoices`, `applyRewardChoice`, `advanceRound`, `chooseCampReward`, `getRunSummary` — implement reward and progression state; modify.
  - `cookie-roguelike-mockup.html` :: `selectReward`, `reward` screen controls, `transition` screen controls, `#resultStats`, `#scoreValue`, area/round headers, `#weaponCard`, inventory — render and gate progression; modify.
  - `tests/battle-engine.test.cjs` :: reward, capacities, fusion, area transition, and run-summary tests; modify.

#### Details
- State fields: `weapons` (array of `{id,grade,ammoType}`), `weaponQueue` (ordered weapon IDs), `rewardChoices` (weapon and consumable arrays), `selectedRewards` (one selected ID per category), `furthestArea`, `playStartedAt`, and `roundStartedAt`.
- On clear, present three distinct weapon and three distinct consumable choices drawn from eligible catalogs, with no duplicate within each category. Require one selection in each category before enabling continuation. Applying a consumable choice obeys 3-per-type stack cap; if no eligible capacity exists, skip that choice rather than discard held items. Matching weapon duplicates prompt/resolve fusion according to C+C→B and B+B→A; A duplicates remain separate.
- On round entry, spawn the correct region enemy composition, reset ammo to 9 and round zero-roll counter, preserve HP and run score, shuffle owned weapons into the next-weapon queue, and update current/next weapon HUD. At ammo=0 with living enemies T01 handles defeat.
- After each cleared standard round, show reward. After Forest/Snow boss reward, require the camp choice (60 HP capped at 100 or the documented weapon enhancement) before moving to next region. After City boss reward, show clear summary before optional bonus entry. Do not grant rewards in bonus rounds. Retain third-attack boss special cadence.
- Render all active HUD fields from state: HP, ammo, score, round, enemy count/HP, selected and next weapon, consumable counts, reward details, defeat/clear summary, furthest area/round, and duration. Remove values that falsely imply persistence or real company leaderboard records from this single-client run; mark untouched static board/leaderboard samples as prototype examples.
- Make `selectReward` store the selection, update the selected style, and enable continue only after all required choices are set. `showScreen` must not itself fabricate progress; transitions call explicit engine functions and reject invalid order.

## Acceptance Criteria
- [x] Current HP/ammo/score/enemy and inventory values remain consistent through modeled turns and render from live state.
- [x] Reward choices are applied once and continuation is gated until required selections are made.
- [x] Clearing a round advances with refreshed ammo and preserved HP; boss rounds remain boss-only.
- [x] Forest/Snow boss camp choices and City clear-results ordering follow the decision record.
- [x] Defeat and clear summaries use live score, furthest region, character, and duration.
- [x] Tests cover reward choices, inventory capacity, fusion, round/camp transitions, and summary calculations.

## Validation
- `node --test tests/battle-engine.test.cjs`
- Browser regression: fresh run and Heal action update live HUD with no console errors. CUA cannot hold mouse while releasing Space, so forced projectile/reward UI traversal could not be driven; deterministic tests cover reward gating, ownership, round/camp transitions, and clear summary.
- `git diff --check`

## Commit Message
```text
feat(game): connect rewards and run progression

Plan: 2026-10-20-combat-state-repair
Phase: P01-gameplay-state
Task: T03-rewards-and-progression

- Apply selected rewards and advance live run state
- Replace static battle and result values with gameplay state
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 4cfef5f
