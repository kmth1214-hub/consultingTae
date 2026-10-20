# Task: T01 Arena HUD Overlays

## Status: done

## Goal
Restructure the battle HUD in `cookie-roguelike-mockup.html` so the arena remains full width, consumables sit in a compact top-left table, magic-candy details sit top-right and disappear for the entire shot flight until the shot completes, and a small angle value remains beside the slingshot.

## Decision Summary
- Preserve existing item counts, button-based use, number-key shortcuts, shot animation ordering, vertical power meter, and full-width arena. Remove the bottom three-card HUD and place its retained angle value next to the slingshot.
- The weapon card is visible before launch, hidden as soon as launch begins, and restored after projectile completion/reset or when a canceled/failed launch returns to aiming.

## Implementation

### I01. Move battle information into arena overlays
- Related Files:
  - `cookie-roguelike-mockup.html` :: battle markup (`#arena`, `.launch-pad`, `.combat-hud`) — place overlays and angle readout; modify
  - `cookie-roguelike-mockup.html` :: `.launch-pad`, `.weapon-card`, `.inventory`, `.item-slot`, `.combat-hud` CSS rules and responsive media queries — style and position overlays; modify

#### Details
- Keep `#arena` as the full-width battle scene and keep `.arena-world` / projectile animation geometry unchanged.
- Move the existing `.inventory` section into `#arena` as a direct positioned overlay child, preferably after `.arena-world` and before `.arena-caption`. Keep all four existing `.item-slot[data-consumable]` rows, their keys 1–4, item icon/name, count, `onclick="useItem(n)"` buttons, and the existing `useItem` behavior. Give the inventory an accessible label and a compact table-like row layout suitable for the upper-left corner. Do not duplicate the inventory in `.combat-hud`.
- Move the existing `.weapon-card` section into `#arena` as a direct overlay child positioned at the upper-right. Preserve its grade, name, description, and ammo dots. Give it a stable ID `weaponCard` so JS can toggle visibility.
- Remove the `.combat-hud` container and its lower cards from battle markup. Remove the power-value row and guidance/stage copy; keep `#angleValue` in a compact readable badge adjacent to the slingshot, and keep `#powerMeter` and `#powerMeterFill` adjacent to the slingshot as they are.
- Ensure overlays render above scene scenery but below important controls/effects as appropriate; use `pointer-events` only on the overlay card itself so arena aiming remains usable outside cards. Preserve item button interaction.
- Use responsive CSS so the upper-corner cards remain compact on narrow screens, do not cover the slingshot/enemies unnecessarily, and the arena remains the dominant full-width region. Remove obsolete `.combat-hud` grid rules and related media overrides.

### I02. Synchronize the magic-candy card with launch and reload
- Related Files:
  - `cookie-roguelike-mockup.html` :: `getAimElements()`, `onArenaPointerUp()`, `resetAimAfterShot()`, `cancelAim()` — manage card visibility for the complete projectile lifecycle; modify
  - `cookie-roguelike-mockup.html` :: `#weaponCard` — visibility target; modify

#### Details
- Include `weaponCard: document.getElementById('weaponCard')` in `getAimElements()`.
- When `onArenaPointerUp()` accepts a launch and transitions `aimState.phase` to `'launching'`, hide `weaponCard` immediately before awaiting `animateProjectile()`.
- Keep it hidden while the projectile is traveling. Only after the animation reports complete, the shot resolves, and `resetAimAfterShot()` resets the aiming state, show the weapon card again. Since `animateProjectile()` completes at the endpoint before `fireShot()` and `resetAimAfterShot()`, restore in the reset path after completion.
- If launch is canceled or projectile animation fails, `cancelAim()` must restore the card while restoring idle aim state. A non-launched pointer cancellation should leave it visible.
- Use a consistent DOM visibility mechanism (`hidden` property or a dedicated class) and ensure CSS does not override the hidden state.

## Acceptance Criteria
- [x] The arena remains full width, with no three-card HUD below it.
- [x] The top-left arena overlay lists consumable keys 1–4, icon/name, count, and working Use buttons; existing number-key shortcuts still work.
- [x] The permanent magic-candy card appears at the top-right before a shot.
- [x] The candy card disappears at launch and remains hidden through the full projectile flight, then reappears after impact/reset; cancellation/failure also restores it.
- [x] Angle remains readable beside the slingshot and vertical power meter; no lower aim-information panel remains.
- [x] Overlay cards remain legible and do not block aiming interactions outside their bounds at desktop and mobile widths.

## Validation
- `node .memory/validation/2026-10-20-battle-overlay-consumables/check.cjs` — verify markup placement, preserved item bindings, lifecycle visibility transitions, and removal of the lower HUD.
- `git diff --check` — verify patch whitespace.
- Open `http://localhost:4173/cookie-roguelike-mockup.html?preview=1` — visually inspect the initial battle layout, narrow viewport, and a complete shot including card hide/show timing.

## Commit Message
```text
feat(game): move battle HUD into arena overlays

Plan: 2026-10-20-battle-overlay-consumables
Phase: P01-arena-hud
Task: T01-arena-hud-overlays

- Show consumable keys at the arena's upper-left and magic-candy details at upper-right
- Hide candy details during projectile flight and retain a compact slingshot angle readout
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: completed (see repository history)
