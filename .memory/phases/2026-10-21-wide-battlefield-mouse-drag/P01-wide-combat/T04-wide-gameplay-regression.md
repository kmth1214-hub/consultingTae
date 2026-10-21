# Task: T04 Wide Gameplay Regression and Completion

## Status: pending

## Goal
Prove the complete wide-field mouse-only game works through real input, obstacles, reverse shots, Wind and existing main/bonus progression; record visual evidence and finish the plan without starting deployment.

## Decision Summary
- Prerequisites: T01 canonical pure math, T02 playable integration and T03 final scene/tension are complete. This is verification/necessary regression repair, not a new feature/balance task.
- Keep real production Chrome input and engine/asset error diagnostics. Fixtures may seed advanced states but may not fake the core collision/Wind/reverse behavior under test.

## Implementation

### I01. Browser fixture contracts and independent assertions
- Related Files:
  - `tests/e2e/support.cjs` :: existing `installGame`, `grabMap`, new `dragPull`, `shoot`, trace/health assertions; modify
  - `tests/e2e/{slingshot,game-launch,game-flow,enemy-response,accessibility}.spec.cjs`; extend/migrate meaningful coverage
  - `tests/e2e/wide-battlefield.spec.cjs`; new focused scenarios
  - `playwright.config.cjs`, `package.json`; read-only unless a proven test configuration defect prevents prescribed checks

#### Details
```typescript
type DragInput={angleDeg?:number;powerRatio?:number;reverse?:boolean};
grabMap(page):Promise<{x:number;y:number}>;
dragPull(page,input?:DragInput):Promise<void>;
shoot(page,input?:DragInput & {short?:boolean;finalHeading?:string}):Promise<void>;
```
- Controller phases are idle/dragging/launching; arena's effective phase may be responding. Shared helper waits for idle, primary-mouse-down at non-HUD viewport(.5,.40), uses **that fixed origin**, maxDrag=`min(220,.34*min(arenaWidth,arenaHeight))`, distance=`12+ratio*(maxDrag−12)`, delta`(-cosθ*d,+sinθ*d)` and releases through actual mouse events. No Space, app-state setter, production test API or direct engine fire is used to replace input.
- Camera mode is observable through `data-camera-mode` overview/aim/follow/enemy; reduced preference reports overview. During flight preserve `data-impact-kind` and optional `data-obstacle-id`. These are passive DOM presentation attributes, not debug action endpoints. Existing `data-enemy-id`, `data-obstacle-id` and engine observation remain available.
- Default Forest hit uses45°/.80; weak ground miss45°/.08; first-blocker test10°/.50; reverse135°/.60. Calibrate only when necessary with an independent analytic expectation and document final gesture values. Normal snake starts HP4, fixed RNG.5 gives damage2 and enemy reply5. A valid Wind contact can still roll zero; do not assert nonzero solely because the ability homed.
- Existing test-only `installGame` intercepts the UMD engine assignment and records real actions in window.__gameTest. Keep production bundle free of that identifier/fixtures. `initial`, `enemyHp`, `stateOverride`, `allWeapons`, `fastCombat` remain **test only**. `fastCombat` forces hit ids and is allowed solely to reach reward/camp/result branches; it cannot count as proof that a wall blocks or Wind avoids one. Be aware `allWeapons` also activates Wind on any character.
- Keep console/pageerror/failed-image-script-stylesheet assertions and failure diagnostics. Use fixed RNG/local storage isolation. Await effective idle/response completion rather than sleeping fixed durations between actions; sample transient flight stages with explicit locator expectations.
- **Precondition / failure handling / state transition**: require a fresh production build with T01–T03 implemented. A test, runtime, asset or visual failure keeps this task unfinished and current pointer at T04; fix only a reproduced related regression, rerun affected checks, then the full required suite. Do not add retries, disable health assertions, weaken expected collision outcomes or advance the pointer on a partial run.

### I02. Required real gameplay cases
- Related Files: `tests/e2e/wide-battlefield.spec.cjs` and existing specs above.
- **Input and tension:** non-HUD map grab, no motion click and <12px cancel, stronger drag yields more meter/pouch stretch and different range, vertical changes angle, saturation without forced reversal, stationary mouse while camera eases leaves force/path identical, Space cannot charge, qualitative labels/no exact angle or power values.
- **Reverse:** same pull rule in all quadrants, genuine decreasing-X flight and camera following to bounds/ground; one ammo/one accepted engine action, miss/no self-damage, normal reply rules; Wind opportunity remains unused. A final-ammo reverse still follows existing defeat/no-extra-reply ordering.
- **Solid blockers:** Forest log, Snow ice, City crate, mixed Chaos;10°/.50 hits first blocker in a controlled normal fixture, stops at the contact point, no damage or hit ids behind it, no moving/damaged prop. A higher arc reaches a target beyond the same barrier. Verify eligible hit ordering before a wall and exclusion after it with a focused fixture; do not rely only on an obstacle class being present.
- **Wind differential:** same low gesture that is blocked for a normal weapon visibly rises/curves past the polygon and hits for Wind, once only. Capture points in world coordinates (invert render matrix in the test) and confirm no solid polygon intersection. Second low shot is blocked normally. Reverse and invalid/no living target do not consume the one opportunity; next round resets it. Observe `selectedTargetId`/engine homingTargetId and actual target HP. Guarantee contact does not bypass zero-damage rules.
- **Camera/world:** initial overview contains the actual3600 world and both ends; near/far enemies spread while dead slots stay stable. Aim close-up and flight follow use equal X/Y scale, no stretching/blank canvas, pointer origin remains fixed. Normal and reverse follow settle; response camera shows the attacking enemy/player framing and next shot returns overview. Resizing/fullscreen switches during drag/flight cancel safely without a late engine action. Preserve wide full-window arena, portrait width fit and no page overflow at all prescribed viewports.
- **Timing/lifecycle:** ammo/damage commit only at physical first contact/end, not drag/release; one resolution despite repeated finish/unmount/stale callbacks. Card hides throughout flight and reappears for reload/response; items lock during drag/flight/response. Cancel/blur/pointercancel/lost capture/new run leave no projectile/RAF/response behind. Hidden-tab response settles the already-committed result only once. Reduced motion has fixed overview and no extra spin/shake, while collision/outcome stays the same.
- **Existing gameplay:** all four consumables, Alchemist points, Fireball arming/consumption (a blocked permanent candy still spends that shot's arm), Spear's existing immediate damage, Defense/Milk interception, real enemy ranged/melee pose and third-attack specials, reward/fusion confirm+decline, both camps, Snow browser unlock/reload, City result, optional three Chaos rounds and frozen main score. Solid props affect ordinary **player candy**, not a new balance rule for Spear or enemy damage.

### I03. Pure/model review and retire obsolete compact helpers
- Related Files:
  - `tests/{battlefield-model,shot-geometry,battlefield-camera}.test.mjs`, `tests/game-session.test.mjs`; extend only uncovered real edge cases
  - `src/game/trajectory.js`, `tests/trajectory.test.mjs`; obsolete compact helper/test candidates
  - `src/game/arenaLayout.js`; retain only canonical delegating wrapper if still referenced
  - `src/components/BattleArena.jsx`, `src/game/useAimController.js`, new model/camera modules; defect fixes only with reproduction
- Run `rg -n "getTrajectory|getHitDetails|getHitIds|getSlingshotDraw|from .*trajectory|cameraScale|powerDirection|isPowerLocked|hasSelectedDirection" src tests` to enumerate old dependencies. T02 runtime should use `getPull/getDragDraw/planShot/sampleAtDistance`; update remaining callers first. Only when no live callers remain, delete the old target-X quadratic module and compact-only trajectory tests, whose assertions are replaced by the new analytic/collision tests. Do not delete the new model tests or meaningful cancellation coverage to make the suite green.
- No other codebase cleanup/refactor. A genuine regression gets the smallest reproducing test and fix; unrelated findings are recorded without enlarging this task.

### I04. Review evidence and memory completion
- Related Files:
  - This task, parent `phase.md`, `.memory/plans/2026-10-21-wide-battlefield-mouse-drag.md`, `.memory/current.md`; update completion
  - `.memory/phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md`; deferred reference only
- Inspect screenshots at2007×1037,2560×1080,1440×900,844×390,390×844: all four regions, overview/strong/reverse/flight/obstacle/Wind/response. Include normal and reduced-motion, every relevant source-art edge, item/card HUDs and enemy/weapon proportions. Save under untracked `tmp/wide-t04-*.jpg`; no binary artifacts staged.
- Summarize actual test totals/commands, image observations, residual source-resolution limits, any tuning and commit in this blueprint. Do not claim full E2E passed if only a selected suite ran. Visual issues must be fixed or specifically reported before completion.
- After the source/task commit, mark Phase4/4 and plan complete, and set current to `Status: complete` with no pending task. Link deferred Azure configuration as the next **possible explicit** project task; do not run it, create fake credentials or mark deployment complete. User can continue with a new request.

## Acceptance Criteria
- [ ] Core reverse/normal-block/Wind-bypass differences are proven through real UI and real engine results.
- [ ] All main/bonus/item/enemy/progression regressions pass under the new controls.
- [ ] No old Space/compact-target assumptions or unused alternate runtime physics remain.
- [ ] All prescribed viewport/camera/feedback visuals are inspected; no stale animation/action or failed asset.
- [ ] Plan/Phase/current accurately reflect completion; deployment remains separate.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs tests/battlefield-camera.test.mjs` — pure behavior/analytic checks pass.
- `npm.cmd test` — complete Node suite passes.
- `npm.cmd run test:e2e` — complete fresh-production Chrome suite passes on4180 with no retries/errors.
- `npm.cmd run build` and `git diff --check` — pass.
- `git status --short` — only related planned source/docs plus intentionally untracked sites/tmp; never stage them wholesale.

## Commit Message
```text
test(game): verify wide battlefield mouse-only gameplay

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T04-wide-gameplay-regression

- Cover real reverse shots, solid obstacles, Wind bypass and full camera lifecycle.
- Verify existing progression and remove superseded compact-only geometry helpers.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
None in this plan. Record completion and await the next explicit request; Azure release remains deferred.
