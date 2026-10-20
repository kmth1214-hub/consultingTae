# Decisions: Slingshot Aim Feedback

## Goal
Make aiming feel physically connected to the slingshot, make camera movement follow the user's preparation rather than firing after the fact, and restore a visible but limited trajectory preview.

## Confirmed Decisions
- Start aiming only when the player presses the slingshot area, not any arbitrary point in the arena.
- On grab, move to a close slingshot view. While the player charges power, ease the camera back toward the full arena view. Freeze the current camera position when Space is released to lock power; do not snap back into a close-up at launch.
- Animate the pouch and both bands from the selected angle and power so the pouch pulls opposite the shot direction and the bands visibly stretch.
- Preserve the previously selected partial trajectory preview (first 30%) to keep difficulty, but make it perceptible. Initialize the aiming target at the enemy group so the preview is not only a tiny segment next to the launcher. Keep the trajectory over the forest foreground and use clear contrast.
- Do not implement obstacle interactions or first-person projectile steering in this task. Provide product/design review only.

## Existing Behavior Observed
- `onArenaPointerDown()` starts aiming from any arena point; `focusAimCamera()` currently runs only after the shot is launched.
- Power animates in `animatePowerGauge()` between 20% and 100%, and `updateSlingshotDraw()` currently uses angle only.
- The path is drawn only after power is locked; its preview is the first 30%, but the stroke is low opacity and the initial target is only the launcher edge.
- The forest preview layer is currently raised over the foreground at z-index 6, but its pale, thin, short line can disappear against the scene.
