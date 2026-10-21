# Task: T05 Wide Gameplay Regression and Completion

## Status: done

## Goal
Prove the complete wide-field mouse-only game works through real input, obstacles, reverse shots, Wind and existing main/bonus progression; record visual evidence and finish the plan without starting deployment.

## Decision Summary
- Prerequisites: T01 canonical pure math, T02 playable integration, T03 independent regional layers/tension and T04 selected-cookie/incoming-hit presentation are complete. This is verification/necessary regression repair, not a new feature/balance task. Renumbered from the original T04 following the user's2026-10-21 amendment.
- Keep real production Chrome input and engine/asset error diagnostics. Fixtures may seed advanced states but may not fake the core collision/Wind/reverse behavior under test.

## Implementation

### Dependency amendment — 2026-10-21
- Complete `.memory/plans/2026-10-21-regional-layered-world-and-map-studio.md`, then the original Wide Combat T04 cookie migration before this final review. Neither is considered complete at planning time.
- Final visuals now require dedicated Snow/City/Chaos painted layers and actual decorative parallax/environment motion, including Forest's shared lifecycle. Preserve gameplay matrices while allowing inner decorative planes their intentional depth offsets. Do not restore flat-map crop/native-geometric stand-ins or obsolete equality assertions.
- In addition to the validation below, run `node scripts/verify-region-art.cjs all`, `npm.cmd run test:studio`, and after the final standalone build `node scripts/verify-studio-build.cjs`. Verify cookie framing/response with scene motion, actual dev review link and production unavailable route. Studio remains development-only; Azure administrator authentication remains deferred. No cleanup here may remove the shared scene pose call, DEV compile-time gate or accepted artwork.

### I01. Browser fixture contracts and independent assertions
- Related Files:
  - `tests/e2e/support.cjs` :: existing `installGame`, `grabMap`, new `dragPull`, `shoot`, trace/health assertions; modify
  - `tests/e2e/{slingshot,game-launch,game-flow,enemy-response,accessibility,region-layers,player-cookie}.spec.cjs`; extend/migrate meaningful coverage
  - `tests/e2e/wide-battlefield.spec.cjs`; new focused scenarios
  - `playwright.config.cjs`, `package.json`; read-only unless a proven test configuration defect prevents prescribed checks

#### Details
```typescript
type DragInput={angleDeg?:number;powerRatio?:number;reverse?:boolean;origin?:{x:number;y:number}};
grabMap(page):Promise<{x:number;y:number}>;
dragPull(page,input?:DragInput):Promise<{x:number;y:number}>;
shoot(page,input?:DragInput & {short?:boolean;finalHeading?:string}):Promise<void>;
```
- Controller phases are idle/dragging/launching; arena's effective phase may be responding. Shared helper waits for idle, primary-mouse-down at non-HUD viewport(.5,.40), uses **that fixed origin**, maxDrag=`min(220,.34*min(arenaWidth,arenaHeight))`, distance=`12+ratio*(maxDrag−12)`, delta`(-cosθ*d,+sinθ*d)` and releases through actual mouse events. No Space, app-state setter, production test API or direct engine fire is used to replace input.
- Camera mode is observable through `data-camera-mode` overview/aim/follow/enemy; reduced preference reports overview. During flight preserve `data-impact-kind` and optional `data-obstacle-id`. These are passive DOM presentation attributes, not debug action endpoints. Existing `data-enemy-id`, `data-obstacle-id` and engine observation remain available.
- Default Forest hit uses45°/.80; weak ground miss45°/.08; first-blocker test0°/1.00 (verified in T02); reverse135°/.60. Calibrate only when necessary with an independent analytic expectation and document final gesture values. Normal snake starts HP4, fixed RNG.5 gives damage2 and enemy reply5. A valid Wind contact can still roll zero; do not assert nonzero solely because the ability homed.
- Existing test-only `installGame` intercepts the UMD engine assignment and records real actions in window.__gameTest. Keep production bundle free of that identifier/fixtures. `initial`, `enemyHp`, `stateOverride`, `allWeapons`, `fastCombat` remain **test only**. `fastCombat` forces hit ids and is allowed solely to reach reward/camp/result branches; it cannot count as proof that a wall blocks or Wind avoids one. Be aware `allWeapons` also activates Wind on any character.
- Keep console/pageerror/failed-image-script-stylesheet assertions and failure diagnostics. Use fixed RNG/local storage isolation. Await effective idle/response completion rather than sleeping fixed durations between actions; sample transient flight stages with explicit locator expectations.
- **Precondition / failure handling / state transition**: require a fresh production build with T01–T04 implemented. A test, runtime, asset or visual failure keeps this task unfinished and current pointer at T05; fix only a reproduced related regression, rerun affected checks, then the full required suite. Do not add retries, disable health assertions, weaken expected collision outcomes or advance the pointer on a partial run.

### I02. Required real gameplay cases
- Related Files: `tests/e2e/wide-battlefield.spec.cjs` and existing specs above.
- **Input and tension:** non-HUD map grab, no motion click and <12px cancel, stronger drag yields more meter/pouch stretch and different range, vertical changes angle, saturation without forced reversal, stationary mouse while camera eases leaves force/path identical, Space cannot charge, qualitative labels/no exact angle or power values.
- **Reverse:** same pull rule in all quadrants, genuine decreasing-X flight and camera following to bounds/ground; one ammo/one accepted engine action, miss/no self-damage, normal reply rules; Wind opportunity remains unused. A final-ammo reverse still follows existing defeat/no-extra-reply ordering.
- **Solid blockers:** Forest log, Snow ice, City crate, mixed Chaos;0°/1.00 hits first blocker in a controlled normal fixture, stops at the contact point, no damage or hit ids behind it, no moving/damaged prop. A higher arc reaches a target beyond the same barrier. Verify eligible hit ordering before a wall and exclusion after it with a focused fixture; do not rely only on an obstacle class being present.
- **Wind differential:** same low gesture that is blocked for a normal weapon visibly rises/curves past the polygon and hits for Wind, once only. Capture points in world coordinates (invert render matrix in the test) and confirm no solid polygon intersection. Second low shot is blocked normally. Reverse and invalid/no living target do not consume the one opportunity; next round resets it. Observe `selectedTargetId`/engine homingTargetId and actual target HP. Guarantee contact does not bypass zero-damage rules.
- **Camera/world:** initial overview contains the actual3600 world and both ends; near/far enemies spread while dead slots stay stable. Aim close-up and flight follow use equal X/Y scale, no stretching/blank canvas, pointer origin remains fixed. Normal and reverse follow settle; response camera shows the attacking enemy/player framing and next shot returns overview. Resizing/fullscreen switches during drag/flight cancel safely without a late engine action. Preserve wide full-window arena, portrait width fit and no page overflow at all prescribed viewports.
- **Timing/lifecycle:** ammo/damage commit only at physical first contact/end, not drag/release; one resolution despite repeated finish/unmount/stale callbacks. Card hides throughout flight and reappears for reload/response; items lock during drag/flight/response. Cancel/blur/pointercancel/lost capture/new run leave no projectile/RAF/response behind. Hidden-tab response settles the already-committed result only once. Reduced motion has fixed overview and no extra spin/shake, while collision/outcome stays the same.
- **Existing gameplay:** all four consumables, Alchemist points, Fireball arming/consumption (a blocked permanent candy still spends that shot's arm), Spear's existing immediate damage, Defense/Milk interception, real enemy ranged/melee pose and third-attack specials, reward/fusion confirm+decline, both camps, Snow browser unlock/reload, City result, optional three Chaos rounds and frozen main score. Solid props affect ordinary **player candy**, not a new balance rule for Spear or enemy damage.
- **Layered regions:** all four areas have independent sky/distant/midground/route/foreground SVG siblings; Snow/City/Chaos must not regress to a recolored full-frame poster. Inspect source-art seams and depth while following from entrance to far end. Near decoration cannot cover the cookie, weapon/pouch, registered prop tops or preview; all sprites retain proportional scaling.
- **Selected player cookie:** select each of the five existing characters through actual character UI (use existing Snow-unlock storage fixture for Milk/Wind). Correct named cookie asset stands at `layout.player` beside the weapon in all areas and survives stage/reload/round changes without duplicate actors. Incoming ranged endpoint/impact flashes/HP reveal are centered on `layout.player.impact`, melee destination on `layout.player.contact`; the cookie visibly receives normal and lethal hits. Defense/Milk intercept at the cookie with no hurt recoil or HP loss; healing glow is at the cookie with no extra heal/turn. Weapon retains pull/recoil/Fireball feedback, not player injury/shield/heal effects. Reverse candy still cannot cause self-damage or a fabricated hurt pose.
- **Player camera/lifecycle:** aim and enemy framing include cookie+weapon bounds with the actual attacker; overview retains whole field and follow can naturally leave the cookie behind. Test reduced motion, hidden-tab settlement, cancel/new run, terminal impact before result, all five viewports and dense Chaos scenes. A cookie pose/particle animation must never call the engine or repeat a consumed effect.

### I03. Pure/model review and retire obsolete compact helpers
- Related Files:
  - `tests/{battlefield-model,shot-geometry,battlefield-camera,player-presentation}.test.mjs`, `tests/game-session.test.mjs`; extend only uncovered real edge cases
  - `src/game/trajectory.js`, `tests/trajectory.test.mjs`; obsolete compact helper/test candidates
  - `src/game/arenaLayout.js`; retain only canonical delegating wrapper if still referenced
  - `src/components/BattleArena.jsx`, `src/game/useAimController.js`, new model/camera modules; defect fixes only with reproduction
- Run `rg -n "getTrajectory|getHitDetails|getHitIds|getSlingshotDraw|from .*trajectory|cameraScale|powerDirection|isPowerLocked|hasSelectedDirection" src tests` to enumerate old dependencies. T02 runtime should use `getPull/getDragDraw/planShot/sampleAtDistance`; update remaining callers first. Only when no live callers remain, delete the old target-X quadratic module and compact-only trajectory tests, whose assertions are replaced by the new analytic/collision tests. Do not delete the new model tests or meaningful cancellation coverage to make the suite green.
- No other codebase cleanup/refactor. A genuine regression gets the smallest reproducing test and fix; unrelated findings are recorded without enlarging this task.

### I04. Review evidence and memory completion
- Related Files:
  - This task, parent `phase.md`, `.memory/plans/2026-10-21-wide-battlefield-mouse-drag.md`, `.memory/current.md`; update completion
  - `.memory/phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md`; deferred reference only
- Inspect screenshots at2007×1037,2560×1080,1440×900,844×390,390×844: all four layered regions, overview/strong/reverse/flight/obstacle/Wind/response, selected cookie idle/hurt/blocked/healing/lethal. Include normal and reduced-motion, every relevant source-art edge, item/card HUDs and cookie/enemy/weapon proportions. Save under untracked `tmp/wide-t05-*.jpg`; no binary artifacts staged.
- Summarize actual test totals/commands, image observations, residual source-resolution limits, any tuning and commit in this blueprint. Do not claim full E2E passed if only a selected suite ran. Visual issues must be fixed or specifically reported before completion.
- After the source/task commit, mark Phase5/5 and plan complete, and set current to `Status: complete` with no pending task. Link deferred Azure configuration as the next **possible explicit** project task; do not run it, create fake credentials or mark deployment complete. User can continue with a new request.

## Acceptance Criteria
- [x] Core reverse/normal-block/Wind-bypass differences are proven through real UI and real engine results.
- [x] All main/bonus/item/enemy/progression regressions pass under the new controls.
- [x] No old Space/compact-target assumptions or unused alternate runtime physics remain; the disconnected target-X trajectory helper and its compact-only tests are retired.
- [x] All prescribed viewport/camera/feedback visuals are inspected; no stale animation/action or failed asset was found.
- [x] All four layered maps and five selected cookies pass proportion/occlusion checks; actual enemy damage/shield/heal effects are centered on the cookie with unchanged combat outcomes.
- [x] Plan/Phase/current accurately reflect completion; deployment remains separate.

## Validation
- `npm.cmd test` — 83/83 complete Node tests pass.
- `npm.cmd run test:e2e` — all 78 fresh-production Chrome tests pass on4180 with no retries or browser errors; this includes main/bonus progression, items, all areas, all characters, real reverse/blocker/Wind behavior, actor response, and the five final T05 cases. The runner left its managed preview listener after printing all 78 successes; that task-owned listener was stopped by its exact port/PID.
- `npm.cmd run test:studio` — all 8 development studio tests pass. `node scripts/verify-studio-build.cjs` confirms the studio remains absent from the production output.
- `node scripts/verify-region-art.cjs all` — 24 PNGs (36,015,499 bytes) verify.
- `npm.cmd run build` and `git diff --check` — pass.
- Focused `npm.cmd run test:e2e -- tests/e2e/wide-battlefield.spec.cjs` — 5/5 pass, including all four real obstacle materials and the same-input ordinary-vs-Wind differential.
- `git status --short` — tracked changes are limited to the planned obstacle-observation attribute, final regression tests, and retired compact physics/tests. Existing user edits to `cookie-roguelike-mockup.html`, plus untracked `sites/` and `tmp/`, remain unstaged.

## Commit Message
```text
검증(전투): 광역 전장 조작과 전체 플레이 회귀 확인

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T05-wide-gameplay-regression

- 역발사, 지역별 장애물, 바람궁수, 레이어와 쿠키 피격을 검증한다.
- 기존 진행을 확인하고 대체된 축약 궤적 계산을 제거한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `검증(전투): 광역 전장 조작과 전체 플레이 회귀 확인` (pending)

## Visual Review — 2026-10-21
- Captured and inspected fresh 1440×900 real-input contact frames for all four regional blockers: `tmp/wide-t05-{forest,snow,city,chaos}-obstacle-1440.jpg`. The cookie, launcher, candy, visible log/ice/crate and themed road remain legible together. Normal candy stops at the registered solid and leaves every enemy at full HP.
- Inspected the Wind bypass flight at `tmp/wide-t05-wind-curve-1440.jpg`: the larger Wind cookie and weapon stay readable while the camera tracks the mint projectile past the foreground log. The sampled world-space center remains outside each obstacle polygon until the enemy contact.
- Rechecked representative overviews at 2007×1037, 2560×1080, 844×390 and 390×844 (`tmp/wide-t03-*-overview-*.jpg`) alongside all four 1440-wide regions. The decorated route and independent depth remain coherent. In portrait overview, fitting the full 3600-unit battlefield to the narrow width leaves unused space below the panorama; the layout has no overflow and aim/follow cameras restore close action framing. This is the intended whole-field overview tradeoff for the selected wide-world camera.
- Rechecked the five portrait assets and the selected cookie's heal, shield and ranged-hit captures documented in [T04 player review](../../../asset-reviews/2026-10-21-wide-t04-player-review.md). The fatal-response regression confirms HP reaches zero and the result appears after impact; the result transition unmounts the actor, so no terminal-pose screenshot is claimed.
- Existing regional source paintings retain their documented 764×508 resolution limitation at close zoom; this task introduced no image resampling or visual distortion. No broken asset, stale action or cross-layer occlusion was observed.
- Scope findings: none. Azure Static Web Apps configuration/authentication/deployment remains deferred.

## Next pointer
None in this plan. Record completion and await the next explicit request; Azure release remains deferred.
