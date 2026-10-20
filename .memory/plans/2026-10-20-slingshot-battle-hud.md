# Plan: Slingshot Battle HUD

## Goal
Replace the catapult appearance with a recognizable slingshot, put a vertical power meter beside it, and move battle information into a responsive full-width HUD beneath the expanded arena.

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-20-slingshot-battle-hud.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Update launcher visuals and reorganize the battle screen HUD | [P01](../phases/2026-10-20-slingshot-battle-hud/P01-slingshot-hud/phase.md) |

## Boundaries
- Production target: `cookie-roguelike-mockup.html`.
- Preserve shot calculations, aiming state transitions, full-screen behavior, camera focus, projectile motion, item inventory and effects.
- Do not change monster art, battlefield composition, area backgrounds, or the 30% trajectory-preview rule.

## Execution Order
1. P01-T01: Replace the launcher, relocate the power meter, and expand/reflow combat information.
