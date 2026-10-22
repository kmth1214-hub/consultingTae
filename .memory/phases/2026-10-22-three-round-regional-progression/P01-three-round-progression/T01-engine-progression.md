# Task: T01 Engine Progression

## Status: done

## Goal
Make each main region consist of two regular rounds and a boss in round 3, retaining the existing rewards, camps, unlock, final clear, and optional bonus route behavior.

## Decision Summary
- Forest, Snow, and City main progression is rounds 1–3; round 3 is the regional boss round.
- Chaos is a separate bonus route and remains rounds 1–3 with the existing three-boss finale.

## Implementation

### I01. Main-region round and boss rules

- Related Files:
  - `assets/js/battle-engine.js` :: `createRoundEnemies`, `advanceRound`, `chooseCampReward`, `startBonusRoute`, `markRoundClear`; modify

#### Details
- **Constants and Types**:
  - Add a local `MAIN_REGION_ROUND_COUNT` constant with numeric value `3` beside the existing module-level game rules. Do not change the public state shape.
  - `state.area` continues to use the existing strings `forest`, `snow`, `city`, `chaos`; `state.round` remains a one-based integer.
- **Execution Flow / Logic**:
  1. `createRoundEnemies(area, round, options)` must continue to make Chaos round 3 the existing three-boss wave. For `forest`, `snow`, and `city`, return the existing regional boss only at round 3, return regular enemy groups at rounds 1 and 2, and reject non-integer/out-of-range main rounds with `RangeError`. Keep the existing regular-enemy counts and composition for rounds 1 and 2; do not create round 4 or round 5 main waves.
  2. `advanceRound(state, options)` keeps its existing preconditions and reward-selection requirement. After a cleared main round 1 or 2, increment the round and call `enterRound`. After Forest or Snow round 3 with required rewards selected, set `pendingCamp = true` and return `{ accepted: true, pendingCamp: true }`. After City round 3, set `terminal = 'clear'`, set `mainRunSummary`, and return the existing clear result. Leave the Chaos branch at exactly three rounds and preserve its `bonus-clear` result.
  3. `chooseCampReward` continues to move Forest → Snow and Snow → City, reset `round` to 1, and initialize the next region. It must be reached after regional boss round 3.
  4. `startBonusRoute` must require a cleared City run at round 3 with `bonusMode` false; after acceptance it still starts Chaos round 1 and resets `bonusScore` to zero.
  5. `markRoundClear` sets `snowAreaCleared` when and only when Snow round 3 is cleared. Do not change profile persistence behavior in `gameSession.js`.
- **Error and State Handling**:
  - Keep existing `accepted`, `reason`, `terminal`, and summary result shapes. Invalid main round generation throws `RangeError`; invalid advancement continues returning `{ accepted: false, reason: 'invalid-round' }` where the current Chaos validation already uses that result.

### I02. Engine regression coverage

- Related Files:
  - `tests/battle-engine.test.cjs` :: boss creation and regional clear tests; modify
  - `tests/gameplay-rules.test.cjs` :: camp, unlock, and bonus-route gate tests; modify

#### Details
- Update main-boss test fixtures from round 5 to round 3. Assert all three regional bosses spawn at round 3 and are absent from regular rounds 1–2.
- Assert the engine rejects main rounds 0 and 4, preserves Chaos rounds 1–3, and still rejects invalid Chaos round values.
- Verify required weapon/consumable reward choices are still required before advancing; after round 1 and 2 the run advances; after Forest/Snow round 3 it opens camp; camp starts the next region at round 1; Snow round-3 clear sets the unlock flag; City round-3 clear records the summary and gates the Chaos bonus route.
- Keep existing Chaos three-round boss, score, and terminal tests unchanged in expected behavior.

## Acceptance Criteria
- [ ] Main-region rounds 1 and 2 use regular enemies; round 3 uses the correct regional boss.
- [ ] Round 3 preserves Forest/Snow camp progression, Snow unlock, City main clear, and bonus-route entry behavior.
- [ ] Chaos still completes after its existing third round with unchanged scoring and boss rules.

## Validation
- `node --test tests/battle-engine.test.cjs tests/gameplay-rules.test.cjs` — engine and progression regression tests pass.

## Commit Message
```text
feat(게임): 지역 보스를 3라운드로 이동

Plan: 2026-10-22-three-round-regional-progression
Phase: P01-three-round-progression
Task: T01-engine-progression

- 숲·눈·도시 보스전을 3라운드로 조정
- 지역 전환, 눈 지역 해금, 혼돈 진입 조건을 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
