# Plan: Area Obstacle Scenery

## Goal
Give the Forest, Snow, City, and Chaos arenas a readable continuous route and spaced region-specific scenery while preserving the existing battle actors, camera, and controls.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add decorative route and obstacle layers for each region | [P01](../phases/2026-10-20-area-obstacle-scenery/P01-area-scenery/phase.md) |

## Product decision
Keep this implementation in the current browser mockup. Unity is a viable next step if the game commits to physics-driven collisions, destructible or moving terrain, and a boss flight-control segment. Validate the core loop with a small playable vertical slice before migrating; engine choice alone does not establish that the game is fun.
