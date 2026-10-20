# Task: T01 Slingshot and Battle HUD

## Status: done

## Goal
Change the battle screen so the arena uses the full available width, a slingshot with an adjacent vertical power meter is the visible launcher, and weapon details, aiming information, guidance, and consumables are displayed in a responsive HUD below the arena, without changing gameplay behavior.

## Decision Summary
- Use a slingshot frame and elastic bands, with the existing projectile origin represented by a movable pouch.
- Move the power meter beside the slingshot; keep its accessible value synchronized with the existing power state.
- Move the existing combat cards into a full-width responsive HUD beneath the arena and remove the side rail layout.

## Implementation

### I01. Rebuild launcher markup and aiming presentation
- Related Files:
  - `cookie-roguelike-mockup.html` :: `[data-screen="battle"]`, `#launchPad`, `.launch-pad`, `.launcher-base`, `.launcher-arm`, `.launcher-stone`, `getAimElements()`, `getStoneCenter()`, `updateAimState()`; modify
  - `.memory/validation/2026-10-20-slingshot-battle-hud/check.cjs` :: static battle HUD markup and inline-script validation; new

#### Details
- Replace the catapult's base, rigid arm, and stone elements with an inline decorative slingshot frame (Y fork and handle), two elastic SVG paths, a positioned projectile pouch, and the existing `#powerMeter`/ `#powerMeterFill` nodes.
- Keep `#launchPad` as the scene launcher and camera focus target; place it on the open lane where foreground trees cannot cover the slingshot. Give the launcher a group accessible name; mark only decorative SVG pieces hidden from assistive technology.
- Position the vertical power meter directly to the right of the slingshot. Keep `#powerMeter` as the unique meter id, retain its min/max/current values, add `aria-orientation="vertical"`, and set the fill height from `aimState.powerPercent`.
- Keep `#angleValue`, `#powerValue`, and `#aimStageLabel` in the HUD, and remove their former inline meter from `.aim-controls`.
- Update `getAimElements()` and `getStoneCenter()` to use the pouch as the stable projectile origin. In `updateAimState()`, move the pouch along the angle-dependent draw vector and update the two elastic SVG paths to meet it. Keep all coordinate calculations in the existing `#arenaWorld` coordinate system.
- Preserve `onArenaPointerDown`, `onArenaPointerMove`, `onArenaPointerUp`, camera focus/restore functions, trajectory generation, projectile animation, and power-charge values.

### I02. Expand arena and move the combat rail below it
- Related Files:
  - `cookie-roguelike-mockup.html` :: `.battle-grid`, `.arena`, `.combat-side`, `.weapon-card`, `.aim-controls`, `.inventory`, `[data-screen="battle"]`; modify

#### Details
- Change `.battle-grid` from a scene-plus-285px-sidebar grid to one full-width column.
- Place the existing weapon card, aim controls, and inventory in a single `aside.combat-hud` below `#arena`, inside `.battle-grid`; retain all IDs, item slots, counts, labels, and inline `useItem(1..4)` actions.
- Give `.combat-hud` three desktop columns with minimum widths for weapon, controls, and inventory; collapse to two columns at tablet width and one column at narrow/mobile width. Ensure the arena remains first in reading and keyboard order.
- Increase the arena's desktop height responsively (target `clamp(360px, 58vh, 620px)`) and keep a usable mobile minimum without horizontal overflow.
- Preserve the battle header, top stats, scene caption, status bar, and all player/monster coordinates.

## Acceptance Criteria
- [ ] The launcher reads visually as a slingshot, not a catapult, and its elastic pouch moves consistently with the selected angle while remaining the projectile origin.
- [ ] A vertical power meter sits immediately to the slingshot's right and reflects the current power visually and through its existing accessible meter value.
- [ ] The arena spans the battle content width; weapon/ammo details, aiming values/guidance, and all four consumables appear below the arena in a responsive HUD.
- [ ] Aiming, firing, camera focus, projectile trajectory, item use/effects, and item counts continue to behave as before.
- [ ] No duplicate IDs, missing image paths, horizontal overflow, or console syntax errors.

## Validation
- `git diff --check`
- `node .memory/validation/2026-10-20-slingshot-battle-hud/check.cjs`
- Open `http://localhost:4173/cookie-roguelike-mockup.html` in Chrome; enter battle and inspect desktop and narrow viewport layouts. Verify the slingshot/meter grouping and use a consumable to confirm controls remain active.

## Commit Message
```text
feat(game): replace catapult with a slingshot battle HUD

Plan: 2026-10-20-slingshot-battle-hud
Phase: P01-slingshot-hud
Task: T01-slingshot-and-hud

- Expand the arena and move combat information into a responsive lower HUD
- Put a vertical power meter beside the slingshot and preserve aim behavior
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
