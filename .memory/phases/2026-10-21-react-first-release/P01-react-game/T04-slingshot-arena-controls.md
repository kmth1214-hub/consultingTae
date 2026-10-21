# Task: T04 Slingshot Arena Controls

## Status: done

## Goal
Make the React arena preserve the full confirmed slingshot interaction: close-up on grab, angle and power input, target selection, partial trajectory preview, animated release, and correct hit resolution.

## Decision Summary
- Start aim only from the slingshot, then allow pointer capture to continue outside its bounds.
- Close in immediately on grab; ease back during power charge, then freeze camera position when Space is released.
- Show only the first 30% of the trajectory, visibly over forest foreground, with the initial target centered on the enemy group.
- Keep the candy explanation hidden from launch until projectile impact/action resolution; reveal it again for the next loaded shot.
- User update before execution: hide angle degrees, power percentages, and the angle slider. Communicate direction through the fork/bands/pouch and strength through the vertical meter only; keep qualitative accessible labels without exact numeric values.

## Implementation

### I01. Implement pointer/keyboard aim state and camera control
- Related Files:
  - `src/game/useAimController.js` :: `useAimController`; new
  - `src/components/BattleArena.jsx` :: pointer target and camera refs; modify
  - `src/components/Slingshot.jsx` :: `Slingshot`; new
  - `src/styles/arena.css` :: camera/launcher styles; modify
- **Signature**: `useAimController({arenaRef,worldRef,launcherRef,enemyGroupRef,ammo,disabled,onLaunch})` returns `{aimState,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onKeyDown,onKeyUp,cancelAim}`.
- **Data & Schema Fields**: `AimState={phase:'idle'|'angle'|'power'|'direction'|'launching',pointerId:number|null,isPointerHeld:boolean,angleDeg:number,powerPercent:number,powerDirection:1|-1,isPowerLocked:boolean,targetX:number|null,targetY:number|null,hasSelectedDirection:boolean,cameraScale:number}`. Clamp angle to the existing `ANGLE_MIN_DEG..ANGLE_MAX_DEG` constants from the mockup and power to 20–100%; use the existing 42° and 20% defaults.
- **Execution Flow / Logic**:
  1. On primary mouse pointer-down inside the launcher bounds, if ammo > 0 and phase is idle, capture the pointer, focus the arena, set phase `angle`, initialize target at enemy-group center, and animate camera to 1.5× launcher focus.
  2. During `angle`, vertical pointer delta changes angle by the existing `ANGLE_DEG_PER_PIXEL`; during `power`, requestAnimationFrame oscillates power between 20% and 100% at the existing gauge rate.
  3. Space keydown starts `power` once; Space keyup cancels gauge animation, locks current power, freezes camera, and enters `direction`.
  4. During `direction`, pointer horizontal/world position selects the target. Pointer release launches only if power is locked and a target was selected; otherwise cancel cleanly without using ammo.
  5. During `power`, ease the camera toward full-arena scale over 1400ms; do not snap back to 1.5× after Space release or at launch.
  6. Clear pointer capture, requestAnimationFrame, timers, and camera transitions on shot completion, cancellation, app screen change, document blur, or component unmount. Honor `prefers-reduced-motion` by applying camera transforms immediately.
- **Error Handling**: ignore right-click, touch, non-primary pointers, repeated Space events, empty ammo, and stale pointer IDs. Lost pointer capture or window blur cancels aim, restores camera and candy card, and never fires.

### I02. Render slingshot deformation, trajectory, and projectile impact
- Related Files:
  - `src/components/Slingshot.jsx` :: SVG frame/bands/pouch and power meter; modify
  - `src/components/TrajectoryPreview.jsx` :: `TrajectoryPreview`; new
  - `src/components/ProjectileFlight.jsx` :: `ProjectileFlight`; new
  - `src/game/trajectory.js` :: `getTrajectory`, `getHitIds`; new
  - `src/components/MagicCandyCard.jsx` :: launch visibility; modify
- **Signatures & Types**: `getTrajectory({start,targetX,angleDeg,powerPercent,worldWidth,worldHeight})` returns SVG quadratic path controls and total path; `getHitIds(path,monsterRects,svgScreenMatrix)` returns unique enemy IDs sorted by distance along the path. `onLaunch({hitIds,angleDeg,powerPercent})` calls the T03 session controller exactly once after the flight completes.
- **Execution Flow / Logic**:
  1. Derive pouch position opposite the selected launch direction and band tension from angle and power; update SVG transforms/coordinates every aim render.
  2. Render a high-contrast dashed path for exactly the first 30% of the full quadratic curve only in `direction`; retain a hidden full geometry path for hit testing. Keep preview above foreground layers and below monsters/HUD.
  3. Animate the candy along the full computed trajectory with `requestAnimationFrame`; sample monster bounds in arena/SVG coordinate space and resolve hit IDs in path order.
  4. When the shot enters `launching`, hide `MagicCandyCard`. Keep it hidden until flight completes and the engine has resolved damage/enemy response; then reveal it for the next loaded shot. On cancellation, reveal immediately.
  5. Use the engine's current active weapon and injected RNG in the launch action; consume one ammo on a miss as well as a hit.
- **Error Handling**: missing SVG geometry or disconnected arena falls back to a miss resolved through `fireShot`; never leave the view stuck in `launching`. CancelAnimationFrame and callback guards prevent stale shots from resolving twice.

## Acceptance Criteria
- [x] Clicking outside the slingshot does not start aim; pressing/capturing the launcher does.
- [x] Camera close-up begins immediately, zoom eases out during charge, and stays at its locked position after Space release.
- [x] Angle and charge visibly deform the slingshot; keyboard and mouse phase transitions match the existing behavior.
- [x] Only 30% trajectory is visible and is readable over the forest foreground.
- [x] Candy card hides at launch and returns after projectile impact/resolution; cancellation restores it.
- [x] Unmount, blur, pointer cancel, and screen change leave no active animation or phantom shot.
- [x] Angle/power values and sliders are absent from the rendered UI. The vertical meter has qualitative accessible feedback.

## Validation
- `npm test` — deterministic geometry/target-order tests pass.
- `npm run test:e2e` — Playwright drives pointer hold, vertical aim, Space charge/release, horizontal target selection, launch, impact, ammo change, and item-card visibility in Chromium.

## Commit Message
```text
feat(react): add slingshot aim and launch feedback

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T04-slingshot-arena-controls

- Add camera, draw deformation, trajectory preview, and projectile flight.
- Preserve pointer/Space phases and shot resolution in React.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `94a3bfc` (`feat(react): add slingshot aim and launch feedback`)

### Implementation / Validation Notes
- `useAimController` owns the captured mouse sequence and animation frames. Only phase changes publish to the session's `aim` for item lockout; all gameplay still goes through the existing session and engine. Constants remain 10–80 degrees, .25 degree/pixel, 20–100 internal power and 80/second; power zoom eases from 1.5 to 1 over 1400ms and freezes at key release.
- New `Slingshot`, `TrajectoryPreview` and `ProjectileFlight` components replace T03's temporary sliders/sample-shot functions. Pouch/bands deform opposite launch direction; the world alone transforms while the HUD stays fixed. No angle/power numeric labels, outputs, sliders or exact ARIA values remain.
- One quadratic and its arc-length table drive the 30% preview, flight and screen-matrix hit testing. Power affects normal-shot range rather than guaranteeing a hit at the chosen X coordinate. Wind's existing once-per-round homing rule receives a matching visual path; no engine combat rules changed.
- Flight resolves at the first physical impact (or at the end for a miss). Launch IDs invalidate callbacks before calling `fireShot`, preventing duplicate/stale completion. Pointer cancellation, lost capture, Escape, blur, visibility change, resize and unmount clean up capture/RAF/flight. Missing SVG matrices resolve misses and cannot hang the view. Card visibility and item lockout span the entire flight.
- `npm.cmd test`: 60 deterministic Node tests pass, including six trajectory/draw/homing/coordinate tests. `npm.cmd run build`: pass. `git diff --check`: pass.
- `npm.cmd run test:e2e`: 12 Chrome/Chromium tests pass. Covers real grab/vertical movement/Space/direction/release, camera and meter locking, exact preview fraction/layer order, shot hit/miss/ammo, qualitative UI, item lockout, all cancel paths, reduced motion, reload during flight, killing-shot arena unmount, Wind once-per-round behavior and SVG-matrix failure recovery.
- Playwright 1.64.1 and a focused T04 harness were added because this task's acceptance requires real browser input; the installed Chrome channel avoids a browser download. Full first-release screen/region/production/responsive regression remains T05. Browser artifacts are ignored; approved preview captures are under untracked `tmp/react-t04-*.jpg`.
- User operation remains desktop mouse + Space as planned; touch pointers are ignored. Decorative obstacles still have no collision or damage. Legacy HTML and the battle engine were not edited.

### Follow-up Decision (T05)
- After T04, the user changed the aim-entry requirement to any non-HUD map point and requested the trajectory while the mouse moves. T05 supersedes T04's launcher-only/direction-only preview acceptance; the 30% preview limit and hidden angle/power numbers remain unchanged. See T05 for implementation and regression evidence.
