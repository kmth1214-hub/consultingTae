# Task: T01 Slingshot Aim Feedback

## Status: done

## Goal
Update `cookie-roguelike-mockup.html` so a click on the slingshot starts aiming and immediately focuses the camera there, the camera eases out to the wider scene during power charging, the pouch/bands visibly pull according to the angle and power, and the limited trajectory preview is visible from a useful initial target.

## Decision Summary
- Preserve the existing angle/power controls and the first-30% trajectory restriction. Change the input trigger, camera timing, draw pose, default target, and preview legibility without adding obstacle or flight-steering gameplay.
- Freeze the camera when power is locked; avoid the existing launch-time snap back to the launcher. Restore the wide view after the shot or on cancellation.

## Implementation

### I01. Tie slingshot pose and camera motion to aim state
- Related Files:
  - `cookie-roguelike-mockup.html` :: `.slingshot-pouch`, `.slingshot-band`, `.trajectory-preview` styles — improve dynamic slingshot tension and trajectory contrast; modify
  - `cookie-roguelike-mockup.html` :: `updateSlingshotDraw(angleDeg, powerPercent)`, `updateAimState()` — translate angle and power to pouch/band positions; modify
  - `cookie-roguelike-mockup.html` :: `focusAimCamera()`, `restoreAimCamera()`, `onArenaPointerDown()`, `onPowerKeyDown()`, `onPowerKeyUp()`, `onArenaPointerUp()` — control close-up, easing out, freeze, and reset; modify

#### Details
- Add a helper or local check that tests the pointer coordinates against `#launchPad.getBoundingClientRect()`. Only a left-button mouse press inside that rectangle may start aim. Existing overlay buttons must remain interactive and must not start aim.
- At successful pointerdown, keep the existing pointer capture and focus behavior, initialize `targetX` to the horizontal center of `#enemyGroup` (fallback to the launcher edge if no group exists), then focus the camera on the launcher at close zoom (scale 1.5, immediate to avoid a late zoom). Ensure the angle/power state update still runs.
- Extend `focusAimCamera` with optional zoom scale/duration defaults so existing resume/restore references keep working. Add a helper to calculate the same fit transform used in `restoreAimCamera` and animate from the current close-up toward the fit scale over approximately 1400 ms when Space begins charging. If reduced-motion is requested, apply the destination without animation.
- On Space release, stop/freeze the current camera animation by using the existing `stopCameraAnimation()` behavior before locking power. Do not re-focus the launcher when `onArenaPointerUp()` transitions to launching. Restore the fit/wide view after shot completion and on cancel, preserving existing screen-exit behavior.
- Change `updateSlingshotDraw` signature to `(angleDeg, powerPercent)`. Compute `tension = clamp((powerPercent - POWER_MIN_PERCENT) / (POWER_MAX_PERCENT - POWER_MIN_PERCENT), 0, 1)` and `pullDistance = 18 * tension`. Starting from the current angle-based pouch location, offset it opposite the launch vector: subtract `cos(angle) * pullDistance` from X and add `sin(angle) * pullDistance` to Y. Update both elastic paths to the new pouch coordinates and increase their stroke width modestly with tension. Pass current angle and power from `updateAimState()`.
- Keep the trajectory fraction at exactly 0.30. Make the preview line perceptible over the forest path by increasing contrast, width, and shadow while retaining its partial dashed treatment. Keep `.trajectory-preview` above `.forest-foreground` in the ready forest state (z-index higher than 5); do not expose `#trajectoryGeometry` as a preview.
- Keep existing projectile geometry and shot animation behavior unchanged, except remove the abrupt focus zoom at launch.

#### State Flow
1. Pointerdown outside launcher: return without changing aim, camera, or pointer capture.
2. Pointerdown inside launcher while battle is active and ammunition remains: capture pointer, set angle phase, seed target at enemies, and focus launcher.
3. Space keydown: start power gauge and begin a single smooth camera transition toward fit view.
4. Space keyup: freeze camera at its current interpolated transform, lock power, enter direction phase, and draw the limited trajectory.
5. Pointer move: update angle or horizontal target as before; each update redraws pouch and bands using current angle and power.
6. Launch completion or cancellation: clear trajectory and restore the fit camera; preserve existing error handling.

### I02. Add targeted validation
- Related Files:
  - `.memory/validation/2026-10-20-slingshot-aim-feedback/check.cjs` :: Node assertions for trigger, camera lifecycle, pull math, trajectory length/layer; new
  - `.memory/validation/2026-10-20-slingshot-aim-feedback/final.md` :: validation evidence and browser limitations; new

#### Details
- Assert the pointer handler gates start on launcher bounds and enemy-group center is the default target.
- Assert the camera close-up begins at pointerdown, fit tween begins at power keydown, camera freeze happens at power keyup, launch does not refocus, and reset/cancel restore the camera.
- Assert pouch pull math uses normalized power and angle, preview fraction remains 0.30, line style has increased contrast, and forest ready preview z-index exceeds foreground z-index 5.
- Extract the final inline script and compile it with `new Function()` to catch syntax errors.

## Acceptance Criteria
- [x] Clicking outside the slingshot does not start aim; clicking the slingshot does.
- [x] The camera immediately shows a close slingshot view on grab and eases back during the power charging window; releasing Space freezes the current view, with no launch-time snap-in.
- [x] Pouch displacement and both bands visibly respond to angle and power, returning to idle after shot/cancel.
- [x] A first-30% trajectory preview appears in the direction phase from a useful initial enemy target and is visible over forest foreground.
- [x] Existing cancellation, reduced-motion behavior, and projectile flight remain intact.
- [x] Automated validation, JavaScript syntax check, and `git diff --check` pass.

## Validation
- `node .memory/validation/2026-10-20-slingshot-aim-feedback/check.cjs` — validate aim trigger/camera state ordering, angle/power draw math, partial trajectory visibility, and script syntax.
- `git diff --check` — ensure no patch whitespace errors.
- Open `http://localhost:4173/cookie-roguelike-mockup.html?preview=1`, enter battle, test click outside vs. inside slingshot, charge/release Space, and inspect trajectory and pouch movement.

## Commit Message
```text
feat(game): add responsive slingshot aiming feedback

Plan: 2026-10-20-slingshot-aim-feedback
Phase: P01-aim-feedback
Task: T01-slingshot-aim-feedback

- Tie slingshot pouch and elastic stretch to angle and power
- Focus on the launcher at grab and ease the camera out while charging
- Restore a visible first-30-percent trajectory preview over the scene
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: completed (see repository history)
