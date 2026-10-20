# Task: T02 Partial Trajectory Preview

## Status: done

## Goal
Show a faint first 30% of the aim arc while preserving the complete quadratic path for the projectile's existing flight animation.

## Decision Summary
- Keep aim angle, power, targetX and projectile duration/motion unchanged. The shorter curve is only a visual preview.
- Use separate visible and hidden SVG paths so path geometry used for the projectile cannot accidentally reveal the full arc.

## Implementation

### I01. Separate visible preview from projectile geometry
- Related Files:
  - cookie-roguelike-mockup.html :: #trajectoryPreview, #trajectoryPath and SVG scene markup — modify/add helper path.
  - cookie-roguelike-mockup.html :: .trajectory-preview path styles — modify preview color/opacity.
  - cookie-roguelike-mockup.html :: getAimElements, drawTrajectoryPreview, resetAimAfterShot, cancelAim, onArenaPointerUp, animateProjectile — modify path references while preserving gameplay math.

#### Details
- **Signatures & Types**:
  - Add SVG path #trajectoryGeometry inside the existing SVG. It has no stroke/fill presentation and is marked aria-hidden with the parent SVG. The existing #trajectoryPath remains the visible path.
  - In getAimElements return both path (visible) and geometry (hidden full-curve path).
  - drawTrajectoryPreview(): void writes the complete M/Q curve to geometry and only the first 30% subcurve to path.
  - animateProjectile(path: SVGPathElement): Promise<boolean> receives geometry.
- **Data & Schema Fields**:
  - Preview fraction constant = 0.30; no storage/API schema changes.
  - Full curve values: P0=(start.x,start.y), P1=(start.x+horizontalDistance,start.y-verticalLift), P2=(aimState.targetX,start.y).
  - Quadratic subcurve endpoint at t=.30: A=(1-t)P0+tP1; B=(1-t)P1+tP2; E=(1-t)A+tB. Visible d is `M P0 Q A E`; geometry d is `M P0 Q P1 P2`.
- **Execution Flow / Logic**:
  1. Preserve existing horizontalDistance and verticalLift formulas without changes. Compute the existing full path once per draw and set it on hidden geometry.
  2. Compute the exact t=.30 prefix using de Casteljau interpolation and set the prefix on the visible path. Recompute whenever aim target, angle or power updates.
  3. Set the visible path stroke to a low-opacity neutral color (target rgba white alpha about .22, retaining existing round cap/dash style); ensure it stays readable over forest and other area backgrounds without revealing beyond endpoint.
  4. animateProjectile must use the hidden full-geometry path. The projectile still follows its full SVG getTotalLength and getPointAtLength trajectory, including the same 700ms duration.
  5. On successful launch, keep only the projectile sprite visible. Do not display the full geometry path. Clear both paths on reset, cancel, early release and phase idle.
  6. Preserve current SVG viewBox/world coordinate synchronization and pointer mapping. Do not edit fireShot, enemy placement, camera formulas or projectile endpoint.

### I02. End-to-end aiming and difficulty validation
- Related Files:
  - cookie-roguelike-mockup.html :: visible prefix and hidden projectile geometry — browser validation.
  - .memory/validation/2026-10-20-catapult-shot-tension/final.md — new validation notes and screenshots.
- **Execution Flow / Logic**:
  1. At direction selection inspect visible `path` d contains one quadratic segment ending at exactly 30% of the computed curve; `geometry` d retains the full endpoint.
  2. During flight verify no full-arc line appears and projectile reaches the full target endpoint after the existing duration.
  3. Verify camera zoom begins with aim and returns after shot/cancel; validate desktop/mobile, forest and another area, theme, normal/reduced motion.
  4. Verify early release consumes no ammunition; complete launch consumes exactly one; leaving battle cancels without stale sprite or camera.
  5. Check browser console and visual readability. Record actual fullscreen limitation if still blocked.

## Acceptance Criteria
- [x] Only the faint 30% preview segment is visible during direction selection; browser geometry measured the de Casteljau endpoint at t=0.30.
- [x] Projectile animation receives the complete hidden curve and completes with its existing 700ms duration.
- [x] No full-arc ghost appears during launch; both paths clear when aim resets/cancels.
- [x] Camera, target reachability, ammunition and early/pointer cancellation behavior passed desktop browser checks.
- [x] Inline scripts parse, git diff --check passes, and final.md records observed results and limits.

## Validation
- Run inline script syntax validation over every inline script in cookie-roguelike-mockup.html with Node vm.Script.
- Run git diff --check.
- Open local HTTP page in Chrome and verify I02; store actual results and screenshots in .memory/validation/2026-10-20-catapult-shot-tension/final.md.

## Commit Message
feat(game): reveal only a short catapult trajectory preview

Plan: 2026-10-20-catapult-shot-tension
Phase: P01-shot-tension
Task: T02-partial-trajectory

- Show only the faint first third of the aim arc
- Preserve full projectile motion in separate SVG geometry

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
