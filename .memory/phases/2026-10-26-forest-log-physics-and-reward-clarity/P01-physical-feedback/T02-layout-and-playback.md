# Task: T02 Forest Layout and Playback

## Status: done

## Goal
숲 라운드마다 실제 노릴 수 있는 근접 통나무를 최소 한 개 제공하고, 화면의 통나무가 T01의 판정 경로 그대로 움직인다.

## Decision Summary
- 무작위 2–4개와 비중첩/라운드 내 고정 규칙을 유지한다. 최소 하나의 통나무 물리 명중을 실제 planShot으로 검증한다.
- 사탕과 통나무가 모두 끝날 때 한 번 정산한다. 카메라/축소 모드가 물리 결과를 바꾸지 않는다.

## Implementation
### I01. Nearby reachable stack
- Related Files:
  - `src/game/battlefieldModel.js` :: `buildBattlefield` — Forest first stack near a random enemy; modify
  - `src/game/battlefieldPlacement.js` :: `witnessAt`, `isPlayableBattlefield`, `buildPlayableBattlefield` — physical witness; modify
  - `tests/battlefield-model.test.mjs` — multiple seeds/rounds and stable layouts; modify
#### Details
- **Signatures & Types**: preserve existing public signatures. Forest first stack center is randomized to the left of a chosen monster by enemy half-width + stack half-width + a small randomized gap (24–110 world units); use current allowed intervals, clamp and avoid all enemies/stacks. Store no extra run randomness; same seed yields same geometry.
- **Data & Schema Fields**: existing obstacle ids/dimensions/polygon remain. Witness uses `shot.contacts.some(c=>c.logMotion?.hit)` from T01; no invented hit flag.
- **Execution Flow / Logic**: after normal per-enemy/per-stack reachability, require one Forest physical log-hit witness on a standing prop using legal power/angles. Try impact heights .1/.25/.5/.75/.9 and existing plus low angles. Bounded seeded retries and verified fallback; keep full-round initial slots for stable layout. Empty test layout is allowed without a physical opportunity. Non-Forest layout behavior unchanged.

### I02. One simulation clock for candy and logs
- Related Files:
  - `src/game/shotGeometry.js` :: `sampleAtTime` — time-to-path pose; modify
  - `src/components/ProjectileFlight.jsx` :: progress/duration — shared simulation time; modify
  - `src/components/BattleArena.jsx` :: `startFlight`, `completeFlight`, `showFlightContacts` — summaries and settled duration; modify
  - `src/components/ArenaScenery.jsx` :: `ArenaScenery`, Forest motion rendering — imperative SVG pose updates; modify
  - `src/styles/arena.css` :: Forest physical stack selectors; modify
#### Details
- **Signatures & Types**: `sampleAtTime(path, seconds)` returns path `{x,y,time,distance}`; use binary search and clamp. Projectile `onProgress({id,point,distance,time})` reports absolute simulation seconds. `ArenaScenery` exposes `advance(time)` through a ref, accepts current `flight` plus `run.forestLogDebris` for final poses. Use T01 `sampleLogMotion` rather than a second solver.
- **Data & Schema Fields**: shot.simulationSeconds is the total shared timeline; durationMs clamp to 420–4500ms. UI holds only sampled SVG transforms; no damage in animation callbacks. Contacts become visible at contact.time; preserve non-Forest wobble. Final debris uses the run's physical pose even after another aim/rerender.
- **Execution Flow / Logic**: start all playback at one clock; sample candy by time until its own impact, hide it while a log finishes, follow an active log when candy has ended. Apply log translation/rotation about center using its actual dimensions. Keep the body on the ground at final position (low-opacity/simplified debris may use same pose). Reduced motion may skip interpolation but still completes one authoritative resolve. On blur/resize/cancel do not leave a body or resolve behind. Strip UI log samples from shotMeta and send directHitTime + physical contact summaries for T01 validation.

### I03. Browser and view regression
- Related Files:
  - `tests/e2e/forest-log.spec.cjs` — hit/miss and final debris, new
  - `tests/e2e/obstacle-effects.spec.cjs`, `tests/e2e/wide-battlefield.spec.cjs`, `tests/e2e/slingshot.spec.cjs`, `tests/e2e/support.cjs` — revised physical expectations/fixtures; modify
#### Details
- Test real Forest target hit vs distant/log miss, no damage before physical contact, final body movement, one resolution, next aim debris stable, one near opportunity per round, narrow/reduced motion and no runtime errors. Preserve other region and Wind assertions; use fixed fixture seeds and recorded legal pull witnesses rather than random luck. Visually inspect Forest/City overview and flight; city panorama must remain unobscured.

## Acceptance Criteria
- [x] Seeded Forest rounds have at least one non-overlapping usable nearby log and remain stable within a round.
- [x] Visible log movement and its final debris position match the physics result at desktop/mobile sizes.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/forest-log-physics.test.mjs tests/shot-geometry.test.mjs` — pass
- `npm.cmd run build` — pass
- `npm.cmd run test:e2e -- tests/e2e/forest-log.spec.cjs tests/e2e/obstacle-effects.spec.cjs tests/e2e/wide-battlefield.spec.cjs tests/e2e/slingshot.spec.cjs` — pass (use isolated preview port if 4180 occupied)

## Commit Message
```text
feat(전장): 노릴 수 있는 숲 통나무 배치와 물리 궤적 재생

Plan: 2026-10-26-forest-log-physics-and-reward-clarity
Phase: P01-physical-feedback
Task: T02-layout-and-playback

- 적 근처 통나무의 실제 명중 가능성을 검증해 배치
- 사탕과 통나무를 같은 시계로 재생하고 잔해 위치 유지
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 23 unit tests, build, and 31 browser tests passed on isolated port 4192.
- commit: `e8a8354`
