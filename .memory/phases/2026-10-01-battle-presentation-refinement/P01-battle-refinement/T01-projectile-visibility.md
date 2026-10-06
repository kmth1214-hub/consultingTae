# Task: T01 Visible Projectile Flight

## Status: done

## Goal

Ensure each confirmed shot visibly travels from the catapult toward its selected target and consumes ammunition exactly once after the flight animation finishes.

## Decision Summary

- Keep the dashed trajectory path in the SVG preview, but render the moving projectile as a separate, high-contrast HTML element above monsters and map art.
- Use a 700 ms flight so the motion is easy to follow at desktop and mobile viewport sizes.
- Preserve the existing mockup-only fire effect: one ammo decrement and the existing launch/final-ammo toast; no collision or damage resolution.

## Implementation

### I01. Add a distinct foreground projectile sprite

- Related Files:
  - `cookie-roguelike-mockup.html` :: `#arenaWorld`, `#trajectoryPreview`, `#projectileDot` — replace the SVG moving circle with a world-layer projectile element; modify.
  - `cookie-roguelike-mockup.html` :: `.trajectory-preview`, `.projectile-sprite`, `@media (max-width:520px)` — style path and visible sprite; modify.
  - `cookie-roguelike-mockup.html` :: `getAimElements` — return the new sprite element; modify.

#### Details

- DOM schema inside `#arenaWorld`:
  ```html
  <div id="projectileSprite" class="projectile-sprite" aria-hidden="true" hidden></div>
  ```
- Keep `#trajectoryPreview` and `#trajectoryPath` as the dashed preview. Remove `#projectileDot` from the SVG.
- Style `.projectile-sprite` as a 24 by 24 px stone with a light stone face, darker outline, a contrasting highlight, and a visible drop shadow. Set `position:absolute`, `z-index:6`, `display:block` when visible, and `will-change:transform`; set `.projectile-sprite[hidden] { display:none; }` for its initial and reset state.
- Because the sprite is a child of `#arenaWorld`, the existing camera transform moves the shot with the scene. Its `z-index:6` must keep it visible over the `.monster` layer.
- Do not move or replace the launcher stone. It remains the source point and is not itself animated.

### I02. Animate, cancel, and reset the visible sprite

- Related Files:
  - `cookie-roguelike-mockup.html` :: `animateProjectile(path)` — update sprite position along the SVG path; modify.
  - `cookie-roguelike-mockup.html` :: `onArenaPointerUp`, `cancelAim`, `resetAimAfterShot` — preserve one-shot fire and hide/reset the sprite for every exit path; modify.

#### Details

- `getAimElements()` returns `sprite: document.getElementById('projectileSprite')`.
- `animateProjectile(path): Promise<boolean>` obtains `path.getTotalLength()`, sets `sprite.hidden=false`, and for 700 ms uses `path.getPointAtLength(progress * length)` on each animation frame.
- Place the sprite center on the path point using `transform: translate3d(x - 12px, y - 12px, 0)`. Progress is clamped to `[0,1]` and based on `performance.now()`.
- On successful completion, resolve `true`; `onArenaPointerUp` calls `fireShot()` once only after this result, then `resetAimAfterShot()` hides the sprite and clears the preview.
- On `cancelAim`, screen exit, window blur, or visibility loss, cancel the pending animation frame, set `sprite.hidden=true`, clear the path, and resolve the animation as cancelled. A cancelled shot never calls `fireShot()`.
- Guard stale animation frames with the existing `launchSequence` token so a cancelled animation cannot later consume ammo.

## Acceptance Criteria

- [ ] A successful shot visibly moves a high-contrast sprite from launcher to target above map and enemy layers.
- [ ] The sprite follows `#trajectoryPath`, remains aligned while the world camera is transformed, and hides after completion.
- [ ] A successful flight calls `fireShot()` once; cancellation does not call it.
- [ ] The dashed aim path remains visible and the idle state contains no visible projectile.
- [ ] No collision, damage, item, or enemy-turn behavior is added.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — enter battle, charge and lock power, aim, release the mouse, and visually follow the projectile across the scene.
- In browser DevTools, verify `#projectileSprite` becomes visible only during the flight, is above `.monster`, and is hidden after a completed or cancelled shot.
- Extract the inline script and run `node --check` on the temporary `.js` file; remove the temporary file after checking.
- Confirm a completed flight reduces ammo by one and leaving the battle during flight does not reduce ammo.

## Commit Message

```text
fix(battle): make projectile flight visible

Plan: 2026-10-01-battle-presentation-refinement
Phase: P01-battle-refinement
Task: T01-projectile-visibility

- Render a high-contrast projectile above the battlefield
- Keep launch, cancellation, and ammo behavior consistent
```

## Progress

- [x] Implementation complete
- [x] Validation passed (inline JavaScript syntax check and diff check; browser flight observation was blocked by the browser file URL policy)
- commit: pending
