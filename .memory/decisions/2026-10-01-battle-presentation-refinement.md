# Decision: Battle Presentation Refinement

## Context

The battle prototype needs four presentation updates: make the launched projectile plainly visible, simplify mouse control to continuous two-axis aiming, make the area route and obstacles easier to read, and remove the top-level prototype menus from the player-facing view.

## Confirmed Decisions

1. **Projectile visibility**
   - A successful shot must show a high-contrast projectile moving along the visible trajectory from the launcher toward its target.
   - The projectile must render above the map and enemies so it remains visible while crossing the field.
   - A shot still consumes exactly one round of ammunition and retains the prototype's current toast behavior. Collision and damage simulation remain out of scope.

2. **Mouse and Spacebar controls**
   - The player presses and holds the left mouse button to begin aiming.
   - While holding the button, vertical mouse movement changes elevation and horizontal mouse movement changes the forward target position at the same time.
   - Holding Space starts the existing oscillating power gauge. Releasing Space locks power.
   - Releasing the left mouse button after power is locked launches the projectile. Releasing it before power is locked cancels the shot without consuming ammunition.
   - Pointer movement remains available while power is charging and after power is locked, until the left mouse button is released.

3. **Area map presentation — recommended interpretation**
   - Keep the Cookie Run-inspired, illustrated 2.5D look, but reduce competing background detail.
   - Give each area a clear continuous route through the field, with deliberate gaps between readable obstacles. Keep the launcher on the left and enemies ahead on the right.
   - Use area-specific obstacle art for forest, snow, city, and chaos scenes. These are visual set pieces only; no collision or terrain rules are added.
   - Retain the selected area art as a subdued theme layer where it helps identify the region; build the route and obstacles as separate, structured scene layers.

4. **Top navigation and utility menus**
   - Remove the top screen-selector strip (`.mockup-controls`) and the top utility menu (`.viz-menu`) from the player-facing page.
   - Preserve the in-app sidebar and in-screen calls to action for navigating between prototype screens.
   - Do not leave visually hidden, keyboard-focusable top menu controls.

## Scope

- Update only the single-file HTML mockup, its scene CSS/DOM/JavaScript, and planning records.
- Preserve existing area IDs, combat HUD, consumable behavior, rewards, and ammunition rules.
- Do not add combat collisions, terrain damage, backend state, or new image-generation dependencies.

## Open Implementation Notes

- The mouse flow above was confirmed by the user. The cleaned-up route and obstacle composition is a recommended visual interpretation of the user's suggestion; keep it simple and reviewable in the browser.
- The top controls to remove are the two top-level containers named above. The sidebar and existing screen-specific buttons remain available.
