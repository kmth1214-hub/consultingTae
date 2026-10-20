# Decisions: Slingshot Battle HUD

- Date: 2026-10-20
- Status: Confirmed

## D01. Launcher visual
- **Chosen**: Replace the catapult silhouette with an original CSS/SVG slingshot visual while preserving the existing launch point and shot controls.
- **Rationale**: The user explicitly wants the weapon to read as a slingshot.

## D02. Power meter placement
- **Chosen**: Place a vertical power meter immediately to the right of the slingshot.
- **Rationale**: The user selected the recommended option; grouping them makes the charging action legible and keeps the arena footprint open.

## D03. Combat information placement
- **Chosen**: Move weapon/ammo details, angle and power readouts, aiming guidance, and consumables from the right rail into a full-width HUD below the arena.
- **Rationale**: This keeps all battle information within the battle screen while giving the scene the available width.

## D04. Responsive layout and gameplay behavior
- **Chosen**: Keep the arena full width, use a three-column HUD on wide viewports and stack HUD cards on narrow viewports; preserve aim phases, projectile origin, camera behavior, item actions, and gameplay state.
- **Rationale**: The screen should use the available area without crowding mobile layouts or changing combat behavior.
