# Decisions: Catapult Shot Tension

- Date: 2026-10-20
- Status: Confirmed
- Target: `cookie-roguelike-mockup.html` camera and trajectory preview

## D01. Camera zoom timing
- **Chosen**: User selected zoom from the start of aiming through completion of the shot.
- **Rationale**: Keeping the launcher close during angle, power, direction and release creates anticipation instead of limiting the zoom to a brief firing flourish.
- **Implementation detail**: Use the existing 1.35× launcher focus from the round intro and animate into it when aiming starts. Restore the arena fit after the projectile completes, or immediately when aim is cancelled or the player leaves battle. Honor the existing reduced-motion preference by avoiding animated camera travel; preserve its established fit behavior.

## D02. Zoom framing
- **Chosen**: User selected a launcher-centered close-up. The monsters may be partly or fully outside the visible area while aiming.
- **Rationale**: Prioritize tension and the catapult details. Do not pan to the enemy during direction selection.

## D03. Trajectory preview
- **Chosen**: User selected a faint preview of only the first 30% of the trajectory.
- **Rationale**: Keep a small aiming cue while requiring players to estimate the rest of the arc.
- **Implementation detail**: Draw a partial quadratic Bézier segment ending at 30% of the existing SVG curve, using its mathematically interpolated control point; retain the complete curve separately for actual projectile animation. Update the preview as aim parameters change. No full-arc ghost, hit forecast, or destination marker.

## D04. Existing combat and camera behavior
- **Chosen**: Determined from code inspection. Preserve angle/power/direction controls, target math, projectile flight, aim cancellation and camera/parallax lifecycle. Reuse `cameraTransformFor`, `focusCameraOn`, `stopCameraAnimation`, and the existing camera ownership rather than adding another animation loop.
- **Rationale**: These helpers already coordinate camera transform and parallax, while the projectile animation samples the SVG path's full length. The shortened preview must not shorten the actual shot.
- **Compatibility**: Restore fit after successful shot completion. Existing cancellation, navigation generation checks and focus/blur behavior remain authoritative. Ensure a zoom transition cannot corrupt pointer-to-world aiming coordinates.

## Validation Expectations
- Observe launcher-centered zoom begins at aim start and remains through the complete projectile flight; arena returns to fit afterward.
- Verify early release, aim cancellation, blur and battle exit restore the camera without stale animation.
- In direction selection, inspect that only the first 30% of the faint curve is visible and that the projectile still travels the complete path.
- Check pointer mapping and shot completion at desktop/mobile widths, normal/reduced motion, and with the existing parallax scene.
- Verify inline script syntax and ensure no unrelated battle, background or bonus UI changes.

## Adjacent Findings — Not Added to Scope
- Current mockup determines projectile motion from the SVG path's geometric length; no gravity simulation, wind, enemy hit test or actual impact resolution is present. This work changes presentation only.
- Existing idle-projectile hidden/display conflict remains out of scope.
- The independently interviewed `monster-visual-refresh` work is not included here.

## Next Step
Run `/memory-plan catapult-shot-tension` to produce implementation tasks. This interview changes no code and does not alter the completed forest plan pointer.
