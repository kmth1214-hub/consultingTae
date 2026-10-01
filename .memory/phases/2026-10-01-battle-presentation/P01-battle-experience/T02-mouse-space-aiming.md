# Task: T02 Mouse and Spacebar Aiming

## Status: pending

## Goal

Replace the battle mockup's angle/power range sliders and separate fire button with the approved hold-angle → Spacebar power timing → horizontal target selection → mouse-release launch sequence, including a faint dashed trajectory preview.

## Decision Summary

- Left mouse down begins the shot and keeps it active through aiming; vertical movement controls elevation.
- While left mouse remains down, Spacebar hold cycles power between 20% and 100%; Spacebar release locks the current value.
- After power lock, horizontal mouse movement selects the target position along the arena's forward horizontal axis. In this 2D side-view mockup, “direction” is represented by this target X position, not a third spatial axis.
- Releasing left mouse after power is locked launches immediately. Releasing earlier cancels the incomplete shot.
- Use a faint SVG dashed path for the preview and animate a projectile along that visible path. Preserve the current prototype's limited behavior: a shot consumes one ammo and reports a toast; this task does not implement collisions or damage simulation.

## Implementation

### I01. Replace the static control elements with a live power/aim display

- Related Files:
  - `cookie-roguelike-mockup.html` :: `[data-screen="battle"] .aim-controls`, `#angleValue`, `#powerValue`, `#arena` — modify/add.
  - `cookie-roguelike-mockup.html` :: `.trajectory`, `.trajectory-label`, `.launcher-arm`, `@media (max-width: 520px)` — modify.

#### Details

- Remove `#angleRange`, `#powerRange`, and the separate `onclick="fireShot()"` button from `.aim-controls`.
- Keep read-only values `#angleValue` and `#powerValue`; add a power meter:
  ```html
  <div id="powerMeter" role="meter" aria-label="발사 파워"
       aria-valuemin="20" aria-valuemax="100" aria-valuenow="20">
    <div id="powerMeterFill"></div>
  </div>
  ```
- Replace the fixed `.trajectory` ellipse with one SVG inside `#arenaWorld`:
  ```html
  <svg id="trajectoryPreview" class="trajectory-preview" aria-hidden="true">
    <path id="trajectoryPath" />
    <circle id="projectileDot" r="8" hidden />
  </svg>
  ```
  Set the SVG's viewBox to the world's current pixel dimensions on initialization and resize; use `preserveAspectRatio="none"` so path coordinates match world coordinates and camera transforms move the preview with the scene.
- Make `.arena` focusable (`tabindex="0"`) for keyboard Space handling. Add user-facing control guidance inside the battle HUD: “좌클릭 유지: 상하 조준 · Space 유지/해제: 파워 확정 · 좌우 이동 후 좌클릭 해제: 발사”.
- Give `.trajectory-preview path` a low-opacity white stroke, `stroke-dasharray`, no fill, and `pointer-events:none`; the preview must remain visible over each area map without covering monsters.
- Add a visible stage hint/readout with stable id `#aimStageLabel` for `angle`, `power`, `direction`, and `ready` states. Hide or clear the trajectory path when no shot is being aimed.
- Rotate `.launcher-arm` using `aimState.angleDeg` with a transform origin at the launcher base; keep the angle label synchronized.

### I02. Add the mouse/keyboard aim state machine and release-to-fire

- Related Files:
  - `cookie-roguelike-mockup.html` :: `aimState`, `updateAimState`, `onArenaPointerDown`, `onArenaPointerMove`, `onArenaPointerUp`, `onArenaPointerCancel`, `onPowerKeyDown`, `onPowerKeyUp`, `drawTrajectoryPreview`, `animateProjectile`, `fireShot`, `useItem` — add/modify plain JavaScript.
  - `cookie-roguelike-mockup.html` :: existing `document` `keydown` listener — modify so the Spacebar control does not conflict with item keys `1`–`4` or page scrolling.

#### Details

- **Constants and state schema**:
  ```javascript
  const ANGLE_MIN_DEG = 10;
  const ANGLE_MAX_DEG = 80;
  const ANGLE_DEG_PER_PIXEL = 0.25;
  const POWER_MIN_PERCENT = 20;
  const POWER_MAX_PERCENT = 100;
  const POWER_GAUGE_RATE_PERCENT_PER_SECOND = 80; // initial playtest tuning value

  /** @typedef {'idle'|'angle'|'power'|'direction'|'launching'} AimPhase */
  /** @type {{
   * phase: AimPhase,
   * angleDeg: number,
   * powerPercent: number,
   * powerDirection: 1|-1,
   * targetX: number,
   * pointerId: number|null,
   * lastClientY: number,
   * isPointerHeld: boolean,
   * isPowerLocked: boolean,
   * animationFrameId: number|null
   * }}
   */
  let aimState;

  function onArenaPointerDown(event: PointerEvent): void;
  function onArenaPointerMove(event: PointerEvent): void;
  function onArenaPointerUp(event: PointerEvent): void;
  function onArenaPointerCancel(event: PointerEvent): void;
  function onPowerKeyDown(event: KeyboardEvent): void;
  function onPowerKeyUp(event: KeyboardEvent): void;
  function updateAimState(): void;
  function drawTrajectoryPreview(): void;
  function animateProjectile(path: SVGPathElement): Promise<void>;
  function cancelAim(reason: 'early-release'|'pointer-cancel'|'window-blur'): void;
  function fireShot(): void;
  ```
- **Initial values and math**:
  - Each new shot starts with `phase='angle'`, angle `42`, power `20`, `powerDirection=1`, `targetX` at the right edge of the launcher, no pointer id, pointer not held, and power unlocked.
  - Clamp angle to `[10, 80]` degrees. On pointer movement in `angle` phase, update `angleDeg = clamp(angleDeg + (lastClientY - event.clientY) * 0.25, 10, 80)`; update `lastClientY` after each event.
  - On `Space` keydown during an active pointer hold, prevent default scrolling, ignore key-repeat, set `phase='power'`, and start a `requestAnimationFrame` loop. The loop moves power at 80 percentage points per second and reverses `powerDirection` at 20/100 (triangle-wave oscillation).
  - On Space keyup during charging, stop the animation loop, preserve the current `powerPercent`, set `isPowerLocked=true` and `phase='direction'`.
  - After power lock, map pointer `clientX` through the inverse `#arenaWorld` transform to world-local x and clamp `targetX` to `[launcherCenterX + 24, worldWidth - 16]`. This selects a forward target position; it does not permit firing backwards through the launcher.
  - Use a quadratic SVG path from launcher stone center to `targetX`. Compute its control point from the clamped angle and power: horizontal control distance is `max(40, (targetX - startX) * powerPercent / 100)` and vertical lift is `clamp((targetX-startX) * tan(angleDeg * PI/180) * 0.45, 24, arenaHeight * 0.82)`. The resulting path is a visual approximation for the mockup, not a physics or collision simulation.
- **Input flow**:
  1. Register `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` on `#arena`; accept only `event.pointerType === 'mouse'` and `event.button === 0` for a new shot.
  2. On accepted pointerdown while the battle screen is visible and ammo is above zero, set pointer capture, initialize `aimState`, set `phase='angle'`, and focus the arena for keyboard input.
  3. In `angle` phase, process only vertical deltas. In `power` phase, keep sampling gauge value via `requestAnimationFrame`; mouse movement does not alter target X yet. In `direction` phase, process horizontal target X and redraw the preview.
  4. On Space keydown/up, act only while the left pointer is held and a shot is active. Ignore Space when no shot is active, and ignore item-key shortcuts when focus is in an editable control.
  5. On left pointerup in `direction` phase with power locked, set `phase='launching'`, stop gauge animation, release pointer capture, animate the dot along `#trajectoryPath` for 450 ms, call `fireShot()` exactly once, then clear state/preview and return to `idle`.
  6. On left pointerup before power lock, cancel the shot and show a brief hint that Spacebar must be released to lock power before launch. `pointercancel` and `window.blur` cancel without firing or consuming ammo.
  7. If ammo is zero, reject pointerdown and do not start aim or animation.
  8. Preserve the existing `fireShot` effect: decrement `#ammoValue` once and show the existing final-ammo or launch toast. Do not add monster collisions, damage rolls, attack turns, or new combat state.
- **Responsive and cleanup behavior**:
  - Recompute SVG viewBox and launcher/world coordinates on `resize` without changing a locked shot's values. Convert pointer positions to world-local coordinates before drawing so the preview remains aligned while the intro animation scales/translates the scene.
  - On `showScreen` leaving battle, `fullscreenchange` to a non-game state, and page visibility loss, cancel the active aim loop and remove pointer capture if possible.
  - Use `aria-live="polite"` for stage/value text, not for every animation frame; update accessible text only when angle or stage changes materially.

## Acceptance Criteria

- [ ] Sliders and the separate fire button no longer control or trigger the battle shot.
- [ ] Left mouse hold plus vertical movement updates angle and launcher art within the configured bounds.
- [ ] Holding Space during a held shot oscillates the power meter between 20% and 100%; Space release locks the displayed value.
- [ ] Horizontal movement after power lock changes the forward aim point and the faint dashed trajectory.
- [ ] Releasing left mouse after locking power animates one projectile, consumes exactly one ammo, and resets aim state.
- [ ] Releasing left mouse before locking power cancels without consuming ammo; pointer cancellation, window blur, or zero ammo never fires.
- [ ] Space does not scroll the page during an active shot and does not affect item hotkeys `1`–`4`.
- [ ] Trajectory and control hints remain usable at desktop and narrow viewport sizes.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — open in a desktop browser and exercise the full angle → Space power → direction → mouse-release sequence.
- Manually test angle clamping at both extremes; observe repeated gauge up/down motion; release Space at different points; release mouse early; release mouse outside the arena; cancel by switching windows; attempt a shot with zero ammo.
- Confirm each successful shot reduces ammo by exactly one and each cancelled shot leaves ammo unchanged.
- Verify dashed line visibility on all four map themes and confirm item keys `1`–`4` still invoke their existing mockup behavior.

## Commit Message

```text
feat(battle): add hold-and-release mouse aiming

Plan: 2026-10-01-battle-presentation
Phase: P01-battle-experience
Task: T02-mouse-space-aiming

- Replace angle and power sliders with mouse and Spacebar controls
- Preview the trajectory and launch on left-button release
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
