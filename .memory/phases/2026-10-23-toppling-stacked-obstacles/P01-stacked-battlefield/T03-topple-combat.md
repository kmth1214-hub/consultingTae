# Task: T03 Once-Per-Stack Regional Combat

## Status: done

## Goal
Resolve every new topple in path order exactly once per stack/round, keep the established regional effects and direct candy damage, then trigger one enemy response.

## Decision Summary
- Topple direction is visual only, without a new fall-hit zone. Existing forest damage 3 to nearest living enemy, snow next attack ×0.5, city independent 1–2 damage to every living enemy, and chaos uniform choice among these three or one-shot aim inversion remain authoritative.

## Implementation
### I01. Round and shot state
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `enterRound`, `resolveProjectile` — modify
  - `src/game/gameSession.js` :: `fireShot` metadata contract — modify
  - `src/components/BattleArena.jsx` :: `makeSolution`, `completeFlight` — modify
  - `tests/battle-engine.test.cjs`, `tests/game-session.test.mjs` — modify
#### Details
- **Data & Schema Fields**: `run.toppledObstacleIds:string[]` starts empty and resets in `enterRound`; `shotMeta.contacts[]` uses T02 ordered contact schema; `event.obstacleEffects:Array<{obstacleId:string,kind:string,hits:Array,...}>` lists each resolved topple; `event.obstacleEffect` remains last-effect compatibility alias; `event.hits` and `scoreDelta` aggregate actual HP removed once. Keep legacy single-obstacle metadata valid for older engine callers/tests.
- **Execution Flow / Logic**: pass T02 contacts and terminal direct hit once at flight completion. Validate metadata shape and unique ids. For each new contact in path order, record toppled id and resolve its region effect; forest chooses nearest *currently living* target using contact target order. Then apply ordinary direct-hit weapon damage if terminal enemy exists. Reuse grade multipliers, health caps and effect counters; choose a chaos outcome per distinct topple using combat RNG. Finally call existing finish-action logic exactly once for ammo, round-clear/defeat and enemy retaliation. `planShot` excludes `run.toppledObstacleIds` on later shots. Newly armed inversion must not be consumed by the same shot; a previously armed inversion is consumed after that shot.
- **Edge cases**: repeated/debris contact and Wind bypass cannot retrigger. An effect killing the last enemy prevents retaliation. Snow guard/shield order remains unchanged.

## Acceptance Criteria
- [ ] Each stack affects combat once per round, but one shot may apply multiple effects before direct damage.
- [ ] Score, HP, chaos inversion, one-ammo cost, one enemy response and round reset remain correct.
- [ ] No interaction with Azure release code or leaderboard data.

## Validation
- `node --test tests/battle-engine.test.cjs tests/game-session.test.mjs tests/shot-geometry.test.mjs` — pass.
- `npm test` — pass.
- `npm run build` — pass.

## Commit Message
```text
feat(전투): 쓰러진 물체마다 지역 효과를 한 번씩 적용

Plan: 2026-10-23-toppling-stacked-obstacles
Phase: P01-stacked-battlefield
Task: T03-topple-combat

- 연쇄 충돌 순서대로 지역 효과와 적 직접 명중 처리
- 쓰러진 물체 상태를 라운드에 저장하고 다음 라운드에 초기화
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
