# Plan: Chaos Theme Depth and Flat Route

## Goal

Keep the existing `chaos_theme.png` artwork intact while making the Chaos arena feel more dimensional and adding one level, continuous road from the launcher side toward the enemies.

## Confirmed Decisions

- The original Chaos artwork remains the full-composition background with its existing colors and design.
- Add separate, restrained code-native depth cues and shadow layers; do not edit, crop, recolor, or replace the image.
- The road is a single broad horizontal band with parallel edges and consistent height.
- All added layers are decorative and do not alter combat behavior.

## Scope and Assumptions

- Modify the self-contained `cookie-roguelike-mockup.html` and planning records only.
- Keep the existing `chaos` area ID, `AREA_BACKGROUNDS.chaos` mapping, full-screen behavior, camera transforms, launcher, enemies, projectile animation, HUD, and responsive layout.
- Use the existing local asset `./assets/maps/chaos_theme.png`; add no generated images, packages, or external dependencies.
- Show Chaos-specific depth and road layers only when the arena area is `chaos`.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Preserve the Chaos illustration and add depth cues with a flat route. | [P01](../phases/2026-10-06-chaos-theme-depth-flat-route/P01-chaos-scene/phase.md) |

## Out of Scope

- Replacing or modifying `chaos_theme.png` or the other area images.
- Adding gameplay collision, cover, pathfinding, damage, or physics.
- Changing the camera, arena world dimensions, projectile path, HUD, or combat controls.
- Implementing routes or obstacles for Forest, Snow, or City.