# Task T03: Item Visual Feedback

## Status
done

## Objective
Make each existing consumable use visibly respond in the battle scene while preserving the current toast and leaving all gameplay state untouched.

## Dependencies
T01 and T02 must be complete. Target the existing `#enemyGroup`/`.monster-art` content and `.launch-pad` as the in-scene player-position anchor; the battle markup currently has no separate player-cookie sprite.

## Files and Symbols
- `cookie-roguelike-mockup.html`: `useItem(key)`, transient effect CSS/keyframes, and regular battle visual targets (`#enemyGroup`, `.monster-art`, `.launch-pad`).
- `.memory/validation/2026-10-20-monster-visual-refresh/final.md`: final cross-task validation record and browser-check limitation.

## Effect Contract
- `useItem(1)` fireball: warm orange/red burst or impact glow on the enemy group.
- `useItem(2)` spear: brief directional candy-lance/streak and enemy hit response. Keep it purely decorative; do not imply actual damage, hit selection, or projectile simulation.
- `useItem(3)` defense: short shield outline/glow around the `.launch-pad`, which marks the player's in-scene position.
- `useItem(4)` healing: short green recovery glow or rising sparkle at the `.launch-pad` player position.
- Keep the existing item toast text and timing behavior. Do not consume inventory or mutate player health, enemy health, ammunition, aim state, turn state, or damage behavior.
- Effects are temporary presentation classes/overlays with a defined cleanup path. Repeated use must not leave duplicate overlays, stuck classes, or stale timers. Effects must not intercept pointer input or obscure the aim controls.
- Honor reduced motion: render a brief static effect and clear it on the same bounded lifetime without relying on CSS keyframes completing. Keep reduced-motion support consistent with the existing global media rule.

## Acceptance Criteria
- Each of the four item buttons and number-key paths gives the corresponding visual response and keeps the existing toast.
- Before/after snapshots of player health, ammunition, enemy health labels, item counts, and aim stage are identical; no gameplay state changes were introduced.
- Effects clear after a short bounded interval, are legible without covering health badges or controls, and work at desktop and mobile sizes.
- Monster art, breathing, forest layers/camera, and bonus-field monsters remain intact.

## Verification
- `git diff --check`
- Validate every inline JavaScript block with Node: `node -e "const fs=require('fs'),vm=require('vm');const h=fs.readFileSync('cookie-roguelike-mockup.html','utf8');for(const [,s] of h.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s);"`
- In Chrome, use each item via its button and number key at desktop and mobile widths. Verify the effect, toast, cleanup, and unchanged health/ammo/enemy labels/item counts/aim state.
- Enable reduced motion and repeat all four items; confirm each shows a static, short-lived response.
- Check regular-battle monster positions/art and the bonus-field screen after the changes.

## Execution Notes
- Passed Node parsing of all inline scripts and an isolated behavior check for all four effect mappings, unchanged toast invocation, repeat-use timeout replacement/cleanup, and the hidden-battle guard. `git diff --check` passed.
- The feedback helper only adds/removes presentation classes; no health, ammo, item-count, aim, turn, or enemy-health state is referenced or modified. Existing button and number-key entry points still call `useItem()`.
- Browser desktop/mobile and reduced-motion visual checks remain unverified because local-page navigation is blocked by the browser security policy.

## Commit
`Plan: 2026-10-20-monster-visual-refresh — T03 add item visual feedback`
