# Task: T04 Slingshot Arena Controls

## Status: pending

## Goal
Make the React arena preserve the full confirmed slingshot interaction: close-up on grab, angle and power input, target selection, partial trajectory preview, animated release, and correct hit resolution.

## Decision Summary
- Start aim only from the slingshot, then allow pointer capture to continue outside its bounds.
- Close in immediately on grab; ease back during power charge, then freeze camera position when Space is released.
- Show only the first 30% of the trajectory, visibly over forest foreground, with the initial target centered on the enemy group.
- Keep the candy explanation hidden from launch until projectile impact/action resolution; reveal it again for the next loaded shot.

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
- [ ] Clicking outside the slingshot does not start aim; pressing/capturing the launcher does.
- [ ] Camera close-up begins immediately, zoom eases out during charge, and stays at its locked position after Space release.
- [ ] Angle and charge visibly deform the slingshot; keyboard and mouse phase transitions match the existing behavior.
- [ ] Only 30% trajectory is visible and is readable over the forest foreground.
- [ ] Candy card hides at launch and returns after projectile impact/resolution; cancellation restores it.
- [ ] Unmount, blur, pointer cancel, and screen change leave no active animation or phantom shot.

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
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
