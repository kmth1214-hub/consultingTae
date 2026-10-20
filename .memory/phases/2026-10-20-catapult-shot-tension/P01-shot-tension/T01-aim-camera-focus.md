# Task: T01 Aim Camera Focus

## Status: done

## Goal
Keep the launcher-centered 1.35× camera framing from pointer-down at aim start through projectile flight, then return to arena fit after completion, early release, cancellation or blur.

## Decision Summary
- Reuse existing camera helpers and world transform. Normal motion transitions to a 1.35× launcher focus; reduced motion keeps the existing fit view.
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
  1. In onArenaPointerDown, invoke focusAimCamera once after pointer-down is accepted and aimState enters angle. The existing 1.35 scale centers the launcher at the screen center. Do not alter start pointer coordinates or initial targetX.
  2. Let getWorldPointFromPointer use the live world transform during zoom. Do not cache a pre-zoom camera matrix or alter pointer capture.
  3. Keep the zoom while phase is angle, power, direction and launching. Do not refocus on the enemy.
  4. In onArenaPointerUp, after successful animateProjectile and fireShot/resetAimAfterShot, animate back to fit. An early release already routes through cancelAim('early-release'); that cancellation restores fit.
  5. In cancelAim, clear existing aim/projectile state as today, then restore fit when battle is visible. If battle is hidden, fit immediately or leave camera cleanup to the existing navigation handler; never start a new camera animation on a hidden screen.
  6. Maintain existing `focusCameraOn` cancellation semantics: it stops prior camera animation and updates parallax sampling. Do not add a second rAF loop, timeout or transform owner.
  7. Respect screen changes, resize, fullscreen change, document hidden/visible, window blur/focus, reduced-motion changes and existing intro cancellation. A stale zoom must not overwrite the next round intro or screen camera.

### I02. Camera lifecycle regression checks
- Related Files:
  - cookie-roguelike-mockup.html :: existing camera and aim event flow — browser validation.
  - .memory/validation/2026-10-20-catapult-shot-tension/final.md — update in T02 after end-to-end validation.
- **Execution Flow / Logic**:
  1. Normal motion: pointer-down enters 1.35× launcher-centered zoom, aim phases and projectile flight stay zoomed, successful completion returns to calculated fit.
  2. Early release, pointercancel, blur, document hidden, battle exit and resize cannot leave a stale zoom or stale camera animation. Navigation retains ownership of hidden-screen cleanup.
  3. Reduced motion does not animate or zoom; scene remains fit and aiming/projectile still work.
  4. Verify pointer coordinates remain correctly mapped during the camera transition and the launch stone stays at the same world position.

## Acceptance Criteria
- [x] Normal-motion aim enters the 1.35× launcher focus; browser interaction confirmed zoom and early-release return.
- [x] Completed shots restore fit in the success path; early release restores fit in the browser.
- [x] Reduced motion preserves fit through the media-query branch; remaining end-to-end edge checks are recorded for T02.
- [x] Camera/parallax lifecycle remains owned by existing helpers; pointer mapping and trajectory math were not changed.
- [x] Inline scripts parse and git diff --check passes.

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
