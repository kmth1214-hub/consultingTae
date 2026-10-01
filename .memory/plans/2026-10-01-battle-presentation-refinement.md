# Plan: Battle Presentation Refinement

## Goal

Make shots visibly travel across the battlefield, allow simultaneous two-axis mouse aiming with Spacebar power locking, clarify each area with a structured route and spaced obstacles, and remove the top prototype menus from the player-facing view.

## Decisions

- See [Battle Presentation Refinement decisions](../decisions/2026-10-01-battle-presentation-refinement.md).
- The confirmed firing flow is left-button hold for continuous horizontal and vertical aim, Space hold/release to cycle and lock power, then left-button release to launch.
- The map recommendation keeps the existing illustrated 2.5D style while separating backdrop, route, and area-specific obstacle layers.

## Scope and Assumptions

- The application remains a self-contained `cookie-roguelike-mockup.html` prototype using inline CSS and plain JavaScript.
- The preceding Battle Presentation plan is complete; this is a new refinement plan and its implementation begins at T01.
- Preserve existing `forest`, `snow`, `city`, and `chaos` area IDs, camera movement, full-screen rules, reward screens, item hotkeys, and shot-to-ammo behavior.
- Projectile movement remains a visual preview. It does not add collision, damage, enemy turns, or physics simulation.
- Top navigation means both `.mockup-controls` and `.viz-menu`; keep the in-app `.sidebar` and in-screen navigation actions.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Clarify projectile feedback, two-axis aiming, readable area scenery, and player-facing navigation. | [P01](../phases/2026-10-01-battle-presentation-refinement/P01-battle-refinement/phase.md) |

## Out of Scope

- A production React conversion or backend integration.
- Projectile collision, obstacle collision, path blocking, damage, or physics rules.
- Replacing the current reward data, inventory keys, or screen progression.
- Hiding the sidebar and calls to action inside individual screens.
