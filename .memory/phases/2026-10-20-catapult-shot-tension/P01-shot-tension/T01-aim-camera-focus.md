# Task: T01 Aim Camera Focus

## Status: done

## Goal
Keep the full battlefield framing while the player selects a target, then transition to the launcher-centered 1.35× camera framing at accepted release and hold it through projectile flight. Return to arena fit after completion or cancellation.

## Decision Summary
- Reuse existing camera helpers and world transform. Preserve full-scene pointer mapping during aim, then transition to a 1.35× launcher focus for flight; reduced motion keeps the existing fit view.
- Camera changes are presentation only. Preserve aim state, pointer-world mapping, projectile path, parallax sampling and navigation generation guards.

## Implementation

### I01. Enter and restore aim camera framing
- Related Files:
  - cookie-roguelike-mockup.html :: cameraTransformFor, focusCameraOn, fitArenaWorld — reuse.
  - cookie-roguelike-mockup.html :: onArenaPointerDown, onArenaPointerUp, cancelAim — modify only to connect camera lifecycle.
  - cookie-roguelike-mockup.html :: new focusAimCamera and restoreAimCamera helpers — new.

#### Details
- **Signatures & Types**:
  - focusAimCamera(): void; finds #arena, #arenaWorld and #launchPad. On normal motion, start focusCameraOn(launcher, 1.35, 500). Under forestMotionQuery.matches, call fitArenaWorld() and do not zoom.
  - restoreAimCamera(immediate?: boolean): void; fit the world with existing fitArenaWorld() if battle is hidden or immediate is true; otherwise animate focusCameraOn(world, fitScale, 450), where fitScale = min(arena.clientWidth/world.offsetWidth, arena.clientHeight/world.offsetHeight).
- **Data & Schema Fields**: No persistent data. Reuse cameraAnimation and forestParallaxFrameId managed by existing camera helpers.
- **Execution Flow / Logic**:
  1. Keep arena fit while onArenaPointerDown and all aim phases through direction selection. In onArenaPointerUp, after validating the selected direction and before projectile animation, invoke focusAimCamera once. Do not alter aim pointer coordinates or targetX.
  2. Keep getWorldPointFromPointer on the existing live transform. The camera remains at fit until pointer coordinates have selected the target, so the zoom cannot clip reachable targets.
  3. Keep the zoom during phase launching. Do not refocus on the enemy.
  4. In onArenaPointerUp, after successful animateProjectile and fireShot/resetAimAfterShot, animate back to fit. An early release already routes through cancelAim('early-release'); that cancellation restores fit.
  5. In cancelAim, clear existing aim/projectile state as today, then restore fit when battle is visible. If battle is hidden, fit immediately or leave camera cleanup to the existing navigation handler; never start a new camera animation on a hidden screen.
  6. Maintain existing `focusCameraOn` cancellation semantics: it stops prior camera animation and updates parallax sampling. Do not add a second rAF loop, timeout or transform owner.
  7. Respect screen changes, resize, fullscreen change, document hidden/visible, window blur/focus, reduced-motion changes and existing intro cancellation. A stale zoom must not overwrite the next round intro or screen camera.

### I02. Camera lifecycle regression checks
- Related Files:
  - cookie-roguelike-mockup.html :: existing camera and aim event flow — browser validation.
  - .memory/validation/2026-10-20-catapult-shot-tension/final.md — update in T02 after end-to-end validation.
- **Execution Flow / Logic**:
  1. Normal motion: keep fit while aiming; accepted release enters 1.35× launcher-centered zoom, flight stays zoomed, successful completion returns to calculated fit.
  2. Early release, pointercancel, blur, document hidden, battle exit and resize cannot leave a stale zoom or stale camera animation. Navigation retains ownership of hidden-screen cleanup.
  3. Reduced motion does not animate or zoom; scene remains fit and aiming/projectile still work.
  4. Verify pointer coordinates remain correctly mapped during the camera transition and the launch stone stays at the same world position.

## Acceptance Criteria
- [x] Normal-motion launch enters the 1.35× launcher focus after target selection; browser interaction confirmed zoom and early-release return.
- [x] Completed shots restore fit in the success path; early release restores fit in the browser.
- [x] Reduced motion preserves fit through the media-query branch; remaining end-to-end edge checks are recorded for T02.
- [x] Camera/parallax lifecycle remains owned by existing helpers; pointer mapping and trajectory math were not changed.
- [x] Inline scripts parse and git diff --check passes.
- Follow-up from T02 integration: moved zoom entry to release after testing showed a pointer-down zoom clipped reachable enemy coordinates.

## Validation
- Run inline script syntax validation over all scripts in cookie-roguelike-mockup.html using Node vm.Script.
- Run git diff --check.
- Use Chrome/local HTTP to inspect normal/reduced-motion aiming, complete shot, early release, pointercancel, blur, screen exit and resize. Record evidence in T02 final.md; actual fullscreen result must be reported honestly.

## Commit Message
feat(game): hold catapult camera focus during shots

Plan: 2026-10-20-catapult-shot-tension
Phase: P01-shot-tension
Task: T01-aim-camera-focus

- Keep launcher focus through aiming and projectile flight
- Restore arena fit when a shot ends or is cancelled

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
