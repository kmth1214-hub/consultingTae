# Plan: Monster Visual Refresh

## Goal
Replace the regular forest battle's emoji snake and boars with original storybook-style character illustrations, add restrained reduced-motion-aware idle breathing, and show item-specific visual feedback without changing game state.

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-20-monster-visual-refresh.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Integrate original monster art, idle motion, and item feedback | [P01](../phases/2026-10-20-monster-visual-refresh/P01-monster-visuals/phase.md) |

## Boundaries
- Production target: `cookie-roguelike-mockup.html`; original art assets under `assets/monsters/`.
- Scope only the regular battle's one snake and two boars. Reuse one boar illustration for both boars; leave bonus-field monsters unchanged.
- Preserve monster positions, camera and forest-layer transforms, health labels, aiming/projectile behavior, item counts, health, enemy health, and turn logic.
- Item visuals are presentation only: fireball and spear give enemy hit feedback, defense gives a shield response at the player's in-scene launcher position, healing gives a recovery response there. Keep the existing toast text/behavior.
- Use original character art with a playful storybook tone; do not reproduce named Cookie Run characters or artwork.

## Execution Order
1. T01: create transparent original jelly-snake and chocolate-fur boar art and wire them into the three regular-battle monster nodes without changing their outer geometry or accessible labels.
2. T02: add subtle breathing to the illustration content only and explicitly disable that motion for `prefers-reduced-motion`.
3. T03: add transient fireball, spear, shield, and healing presentation feedback to the appropriate existing targets; keep gameplay state unchanged and perform the cross-task regression checks.

## Validation Strategy
- Per task, run `git diff --check` and validate the inline JavaScript syntax when JavaScript is changed. For T03, run the complete browser acceptance checks at desktop and mobile sizes.
- Confirm the same boar art appears in both regular-battle positions, the health badges and positions remain fixed, and the bonus field remains unchanged.
- Confirm idle breathing stops under reduced motion. Exercise each of the four item buttons and compare player health, ammunition, enemy health, inventory counts, aim state, and toast behavior before and after.
- Record final browser evidence and any limits under `.memory/validation/2026-10-20-monster-visual-refresh/final.md`.

## Completion
Complete when T01–T03 pass their acceptance criteria and are committed sequentially; synchronize the phase dashboard and active pointer.
