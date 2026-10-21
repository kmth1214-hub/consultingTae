# Task: T06 Regional Acceptance and Existing-task Handoff

## Status: pending

## Goal
Prove that the completed painted scenes, depth and development studio work together without gameplay regression; record the real review link and return the active pointer to the unfinished selected-cookie task.

## Decision Summary
- Prerequisites: T01–T03 accepted24 PNGs, T04 shared runtime/depth/lifecycle, T05 isolated studio and production exclusion. This is acceptance/necessary reproduced fixes, not new gameplay or administration scope.
- Wide Combat T04 (cookie/attack ownership) and T05 (full combined game review) remain unfinished. This plan's completion cannot claim those features exist or start Azure deployment.

## Implementation

### I01. Cross-region art and camera acceptance
- Related Files:
  - `tests/e2e/{region-layers,scene-depth,slingshot,accessibility,enemy-response,game-launch,game-flow,studio-exclusion}.spec.cjs`; retain/extend only uncovered real acceptance gaps
  - `tests/studio-e2e/map-studio.spec.cjs`; retain/extend studio review
  - `tests/{scene-parallax,map-studio-camera,battlefield-camera,shot-geometry,battlefield-model}.test.mjs`; existing independent math assertions
  - `src/components/{BattlefieldBackdrop,SceneArt,ForestLayerContent,SceneAtmosphere}.jsx`, `src/game/{sceneCatalog,sceneParallax,useSceneActivity,useBattlefieldCamera}.js`, `src/dev/`; reproduced related fixes only
  - `.memory/asset-reviews/2026-10-21-regional-scene-acceptance.md`; new reviewed evidence

#### Details
- **Signatures / Data**: No new runtime model or action API. Existing `BattlefieldBackdrop({area,layout,visibleLayers,motionPaused})`, `getSceneOffsets({pose,viewport,reducedMotion})` and `applyScenePose(world,pose,viewport,reducedMotion)` are the verified contracts. Record review evidence as `{area,viewport:{width,height},stage,reducedMotion,capturePath,observation}` entries and command results as `{command,passed,total,exitCode}` in the Markdown acceptance document; no run/profile persistence is added.
- Start from a fresh built production app on4180 and separate actual development server on4181. Use existing browser-health diagnostics, Chrome channel, one worker, no retries. Fixtures remain test-only; studio must never import or run them. Don't count Vite dev hot reload as proof the production build is correct.
- All four areas: overview, close weak/strong/vertical/reverse pull, forward/reverse projectile follow through entrance/middle/far, first-obstacle contact, Wind bypass and enemy response. Source images must make meaningful actual painted contribution; no source is merely loaded behind an opaque geometric placeholder. Foreground/ambient must not obscure pouch/meter/early preview, registered obstacle tops, monsters or reserved cookie space.
- Inspect Snow/City/Chaos native cutouts, source panel overlap, horizon/side-view coherence, grounded horizontal path and painted cross-section. Compare with accepted Forest style. Check far-end/reverse/ceiling frames for blank canvas, poster edges and duplicate major landmarks; subtle native underpaint is allowed, flat-map crop replacement is not. Do not accept a quality issue solely because pixel thresholds pass.
- Prescribed sizes:2007×1037,2560×1080,1440×900,844×390,390×844. Include reduced motion and map switches. Uniform gameplay scale, same registered polygon/candy/actor matrix, no page overflow or inaccessible HUD. Camera-driven decorative offsets must have correct relative direction/caps and stable road alignment, not fake automatic scrolling disconnected from the camera.
- Preserve actual ordinary hit/miss/blocked behavior, Wind once-per-round visible bypass/zero-roll/reverse retention, one accepted engine action, input cancellation/lost capture/blur/resize/fullscreen/hidden cleanup, card/item timing, existing damage/scoring/progression/Chaos/Snow unlock and enemy reply timing. No weakened collision assertions, engine shortcuts or damage tuning to make visuals pass.
- The selected cookie is not implemented yet: check its reserved152×152 bounds remain clear and record this limitation. Do not add player presentation tests claiming an actor exists or move incoming effects from launcher in this acceptance task. That atomic migration belongs to the original queued T04.
- Hidden-document and reduced-motion checks must verify real browser lifecycle and visible animation state. Check frame/time resumes without a burst and no listener/capture accumulation after repeated map/back navigation/StrictMode. A decorative pause must not cancel accepted gameplay settlement.

### I02. Studio usability and production boundary acceptance
- Related Files:
  - `src/main.jsx`, `src/dev/{MapStudio.jsx,mapStudioCamera.js,mapStudio.css}`; fixes only to reproduced issues
  - `playwright.studio.config.cjs`, `tests/studio-e2e/map-studio.spec.cjs`, `tests/e2e/studio-exclusion.spec.cjs`, `scripts/verify-studio-build.cjs`; retain meaningful checks
  - `.memory/asset-reviews/2026-10-21-regional-scene-acceptance.md`; record actual local URL and limitations

#### Details
- Verify the distinct development page directly, with map selection, primary-drag pan, cursor-anchored wheel zoom, keyboard arrows/+/-/Home, zoom controls, full-scene reset, all five visibility toggles and environment pause. Controls stay outside the gesture surface and usable on narrow/short screens. Map switching cancels a held capture, resets camera and preserves layer/pause choices.
- Shared art hrefs/native ratios/depth factors/prop polygons agree with runtime; the studio is not a separately composed mock. Inspect no duplicate IDs, image load failures, empty regions or stuck controls. No game run creation/profile writes/unlock/item/score effects from review. Back link/refresh/direct trailing-slash route work.
- Fresh production output must omit the dev module/UI/CSS/fixtures. Actual production requests to both studio paths show generic unavailable UI and root query/hash cannot unlock it. Verify browser network and emitted-output checker, not simply a hidden menu. Keep publicDir:false and no admin feature flag. Vite SPA response may be200: document the UI/access outcome accurately.
- Local URL target is http://127.0.0.1:5173/__dev/maps only if that existing dev service truly serves the current page. Inspect it with the actual browser and report the real working link/port. Keep existing4173/5173 services intact; test-owned4180/4181 services are cleaned up. Don't hand over a production preview URL as a studio link.
- Label this a development-only review screen, not authenticated administrator access. Designated Entra administrator authorization/server enforcement remains the later explicit Azure work. No tenant IDs, secrets or fake roles are committed.

### I03. Evidence, completion and return to queued Wide Combat T04
- Related Files:
  - This Task and `.memory/asset-reviews/2026-10-21-regional-scene-acceptance.md`; validation/evidence, source/task commit
  - Parent `phase.md`, `.memory/plans/2026-10-21-regional-layered-world-and-map-studio.md`, `.memory/current.md`; post-commit sync
  - `.memory/phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/{phase.md,T04-player-cookie-feedback.md,T05-wide-gameplay-regression.md}` and its plan; dependency/handoff metadata only
  - `.memory/phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md`; deferred reference only

#### Details
- Store captures in untracked `tmp/regional-t06-{area}-{stage}-{width}[-reduced].jpg` and studio variants. Acceptance document records which captures were inspected, actual native dimensions/alpha/registration findings, observed overlap/depth quality, gameplay/studio/browser/build commands and real pass totals, failures/fixes and residual limitations. Do not claim a full suite if only selected cases ran.
- Run all required checks against the final files. Any failed asset decode/alpha, browser runtime/asset error, wrong collision, visible bad art edge or exposed studio production module keeps this Task pending until corrected and rechecked. Fix related reproduced issues only; report unrelated findings without expanding scope.
- Commit source/final review+Task using prescribed message, then update new Phase6/6 and plan complete. Preserve each earlier commit/test result and list the final source hash in dashboards.
- Restore `.memory/current.md` Active Plan to `plans/2026-10-21-wide-battlefield-mouse-drag.md`, Active Phase to its P01-wide-combat, Active Task to `T04-player-cookie-feedback.md`; set that old phase's T04 in_progress/active and keep done3/5. Update old plan's status to active P01-T04 and remove only the temporary waiting-dependency note. Keep T05 pending.
- Current status must state regional scene/studio plan complete, actual dev link, production exclusion verified and selected-cookie implementation still pending. Next Step reads ONLY original T04 blueprint and adds selected cookie plus incoming hit/shield/heal ownership using the new shared scene/camera. Do not implement that next task in this one or redirect automatically to Azure.
- Original Wide Combat T04 enemy-framing change must retain the new `applyScenePose` call; its T05 full-game release review now also runs asset/studio/build-exclusion checks. Those dependency notes were added during planning and remain relevant. Do not overwrite them with the historical flat-crop assumptions.

## Acceptance Criteria
- [ ] All four painted/depth/ambient scenes are manually inspected across the specified cameras/viewports with gameplay alignment preserved.
- [ ] Complete existing Node/production game regressions and separate studio tests pass with no retries/runtime/assets failures.
- [ ] Production exclusion verified in real browser and emitted output; actual development review URL recorded.
- [ ] Evidence accurately describes new art/native detail and remaining cookie/auth work.
- [ ] New plan is complete and current pointer correctly returns to original Wide Combat T04, preserving T05 and deferred Azure.

## Validation
- `node scripts/verify-region-art.cjs all` — all24 regional PNGs pass native/alpha/road checks.
- `npm.cmd test` — complete current pure/session/engine suite passes.
- `npm.cmd run test:e2e` — complete fresh-production actual-Chrome suite on4180, no retries/errors.
- `npm.cmd run test:studio` — complete separate dev suite on4181, no retries/errors.
- `npm.cmd run build`, then `node scripts/verify-studio-build.cjs`, then `git diff --check` — standalone final build and exclusion checks pass.
- `git status --short` — only intended source/assets/memory; sites/tmp/dist/test artifacts remain untracked/ignored and unstaged. Inspect screenshots and verify the reported local link in the real browser.

## Commit Message
```text
test(scene): verify regional depth and development studio boundaries

Plan: 2026-10-21-regional-layered-world-and-map-studio
Phase: P01-regional-scenes
Task: T06-regional-review-and-handoff

- Validate painted maps, decorative lifecycle and unchanged gameplay across viewports.
- Record the verified development review link and return to pending cookie feedback work.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After prescribed commit/synchronization, restore the existing `.memory/phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/T04-player-cookie-feedback.md`. That Task is next, not Azure and not another art task. Do not claim the original5-task plan complete yet.
