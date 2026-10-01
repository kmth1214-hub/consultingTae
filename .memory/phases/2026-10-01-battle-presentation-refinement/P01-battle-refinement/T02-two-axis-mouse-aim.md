# Task: T02 Continuous Two-Axis Mouse Aim

## Status: pending

## Goal

Let the player adjust elevation and horizontal target position together while holding the left mouse button, lock the cycling power gauge with Space, and launch on left-button release.

## Decision Summary

- Confirmed by the user: left-button hold begins aim; mouse movement in both axes continuously updates the shot; holding and releasing Space charges and locks power; releasing the left button after lock launches.
- Keep the existing angle and power bounds and the early-release/cancel behavior.

## Implementation

### I01. Replace staged aim phases with the confirmed continuous flow

- Related Files:
  - `cookie-roguelike-mockup.html` :: `aimState`, `createIdleAimState`, `onArenaPointerDown`, `onArenaPointerMove`, `aimPointFromPointer`, `updateAimState`, `drawTrajectoryPreview` — update aim state and both-axis math; modify.
  - `cookie-roguelike-mockup.html` :: `#aimStageLabel`, `.aim-guidance` — show the revised controls; modify.

#### Details

- State schema:
  ```javascript
  /** @typedef {'idle'|'aiming'|'power'|'ready'|'launching'} AimPhase */
  /** @type {{phase:AimPhase, angleDeg:number, powerPercent:number,
   * powerDirection:1|-1, targetX:number, pointerId:number|null,
   * lastWorldX:number, lastClientY:number, isPointerHeld:boolean,
   * isPowerLocked:boolean, animationFrameId:number|null,
   * lastPowerFrameTime:number|null}} */
  let aimState;
  ```
- Remove the separate `angle`-then-`direction` interaction. A primary mouse pointer down in `#arena` initializes `phase='aiming'`, captures the pointer, records the local world x and client y, and keeps the existing initial angle `42°` and power `20%`.
- On every captured mouse move while phase is `aiming`, `power`, or `ready`:
  - Convert the pointer through the inverse current `#arenaWorld` transform into world-local coordinates.
  - Add `worldX - lastWorldX` to `targetX`, then clamp it to `[launcherCenterX + 24, worldWidth - 16]`.
  - Add `(lastClientY - event.clientY) * ANGLE_DEG_PER_PIXEL` to `angleDeg`, clamped to `[ANGLE_MIN_DEG, ANGLE_MAX_DEG]`.
  - Update `lastWorldX` and `lastClientY`, then update labels, launcher art, and preview path.
- During `aiming`, show guidance to move the held mouse horizontally and vertically and press Space to charge power.
- During `power`, continue processing both mouse axes while the power gauge oscillates. On Space keyup, stop the gauge, set `isPowerLocked=true`, and enter `phase='ready'`; continue processing both mouse axes until mouse release.
- During `ready`, keep the preview current and tell the user that releasing the left button launches.
- Update the visible instructions to: `좌클릭 유지 + 상하좌우 이동: 조준 · Space 유지/해제: 파워 충전/확정 · 좌클릭 해제: 발사`.

### I02. Preserve safe release, keyboard, and resize behavior

- Related Files:
  - `cookie-roguelike-mockup.html` :: `onPowerKeyDown`, `onPowerKeyUp`, `onArenaPointerUp`, `onArenaPointerCancel`, `cancelAim`, `setupAimControls`, `showScreen` — update lifecycle handling; modify.

#### Details

- Space keydown acts only while the left pointer is held in `aiming`; it prevents page scrolling, ignores key repeat, enters `power`, and starts the existing 80 percentage-points-per-second gauge between 20% and 100%.
- Space keyup while in `power` locks the current value and enters `ready`. Do not freeze pointer motion in either `power` or `ready`.
- Left pointerup in `ready` starts one projectile animation. Left pointerup in `aiming` or `power` cancels with a short hint, without consuming ammo. `pointercancel`, window blur, hidden-page visibility, leaving the battle screen, or zero ammo must never fire.
- Keep `1`–`4` item shortcuts active and do not treat a Space press outside an active pointer hold as a power input.
- On resize, update SVG viewBox and recompute launcher/world coordinates without changing the locked angle, power, or target values.
- Retain pointer capture and release it safely on launch and every cancellation path.

## Acceptance Criteria

- [ ] Holding left and moving the mouse horizontally and vertically updates target and angle simultaneously.
- [ ] The dashed trajectory responds continuously during aiming, charging, and ready phases.
- [ ] Space power continues to cycle between 20% and 100%, and Space release locks its value.
- [ ] Releasing left after lock launches one visible projectile and consumes exactly one ammo; earlier release and all cancellation paths consume none.
- [ ] Space does not scroll the page during the active shot and does not break item keys `1`–`4`.
- [ ] The mobile and desktop scene retain a valid preview after resize.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — hold left, move diagonally in both axes, hold/release Space while continuing to aim, and release left to launch.
- Manually verify all angle clamps, both horizontal target bounds, early release, pointer cancellation, focus loss, zero ammo, and item hotkeys.
- Confirm the projectile animation from T01 follows the newly updated path and consumes one ammo only after launch.
- Extract the inline script and run `node --check` on a temporary `.js` file; remove the temporary file after checking.

## Commit Message

```text
feat(battle): allow continuous two-axis mouse aiming

Plan: 2026-10-01-battle-presentation-refinement
Phase: P01-battle-refinement
Task: T02-two-axis-mouse-aim

- Update angle and horizontal target from the same mouse drag
- Preserve Spacebar power lock and release-to-launch behavior
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
