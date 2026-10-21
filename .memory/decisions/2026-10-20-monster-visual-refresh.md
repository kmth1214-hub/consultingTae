# Decisions: Monster Visual Refresh

- Date: 2026-10-20
- Status: Confirmed
- Target: `cookie-roguelike-mockup.html` and new monster illustration assets

## D01. Monster visual style
- **Chosen**: User selected a storybook illustration look that feels playful like Cookie Run. Keep recognizable animal silhouettes with candy details: a jelly-bodied snake and a boar with chocolate fur and biscuit tusks.
- **Rationale**: This matches the layered forest artwork and preserves quick recognition of the existing snake and boar enemy types. The reference is a broad mood cue; create original characters rather than copying a specific existing character.

## D02. Scope
- **Chosen**: User selected only the regular battle scene's snake and boar enemies. The two boars reuse the same illustration. Bonus-field monsters and other creatures are out of scope.
- **Rationale**: Improve the enemies shown in the main combat scene first while keeping the art set small and consistent.

## D03. Idle animation
- **Chosen**: User selected a small breathing-like idle motion. It stops when `prefers-reduced-motion` is enabled, following the forest ambient motion preference behavior.
- **Rationale**: Add life without distracting from aiming, health badges or the background. Reuse the current motion preference instead of adding another control.

## D04. Item-use visual response
- **Chosen**: User selected an effect appropriate to each item: fireball and spear show enemy hit feedback; defense shows a shield effect; healing shows a player recovery effect.
- **Rationale**: These item types have different roles, so a single monster reaction for all of them would read incorrectly.
- **Scope constraint**: Current `useItem()` only displays a toast. Visual feedback illustrates the selected action and does not invent damage, consume inventory, alter health, or change turn state.

## D05. Existing scene behavior
- **Chosen**: Determined from code inspection. Keep enemy world positions, camera transforms, health labels and aim/projectile logic. Use separate illustration content and overlay effects without replacing gameplay coordinates.
- **Rationale**: The enemies participate in the existing parallax camera and aim scene; visual updates should not move hit targets or change protected coordinate calculations.

## Validation Expectations
- Inspect regular forest battle at desktop and mobile widths. Verify the three enemies are legible and the boars share the art style.
- Verify idle animation runs with normal motion and stops under reduced motion.
- Verify all four item response styles; effects must not change ammo, item count, health, enemy health or aim state beyond the existing toast behavior.
- Confirm bonus-field artwork and the forest layers/camera formulas remain unchanged; check inline script syntax.

## Adjacent Findings — Not Added to Scope
- Bonus-field monsters remain emoji art.
- Combat item actions currently only show explanatory toasts; there is no underlying item consumption or damage implementation. A playable combat implementation would need its own requirements and plan.
- Existing idle projectile hidden/display conflict remains outside this task.

## Next Step
Run `/memory-plan monster-visual-refresh` to create task blueprints. No implementation code has been changed in the interview phase.
