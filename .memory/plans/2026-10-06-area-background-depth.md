# Plan: Area Background Depth and Flat Routes

## Goal

Extend the Chaos scene's depth treatment and flat road to the Forest, Snow, and City arenas while preserving each original theme image and its palette.

## Confirmed Decisions

- Keep all four existing theme images unchanged and at their current framing.
- Use one shared decorative depth layer and road SVG, with CSS palettes selected by the current arena `data-area` value.
- Match Forest, Snow, and City colors to their own artwork; retain the existing Chaos palette.
- Keep all new layers visual only and preserve combat behavior.

## Scope and Assumptions

- Modify `cookie-roguelike-mockup.html` and planning records only.
- Extend the existing `.chaos-depth-layer` and `#chaosRoad` implementation into area-generic layers rather than adding duplicate scenery.
- Preserve `AREA_BACKGROUNDS`, its image paths, `setArenaArea(area)` behavior, `#arenaWorld` dimensions, its background sizing and position, camera transforms, launcher/enemy layout, trajectory, and projectile animation.
- Do not implement the separate obstacles described in the older Battle Presentation Refinement T03 task; this plan covers only shared depth and flat-road styling.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Extend the shared depth and flat-road presentation across all themed arenas. | [P01](../phases/2026-10-06-area-background-depth/P01-area-scenes/phase.md) |

## Out of Scope

- Editing, cropping, recoloring, replacing, or regenerating any theme image.
- Adding obstacle art or terrain interactions.
- Changing combat, aiming, projectile, ammo, camera, or enemy behavior.
- Replacing the Chaos palette with a shared palette across all regions.