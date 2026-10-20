# Task: T02 Consumable Effects and Turn Flow

## Status: done

## Goal
Make the four consumables apply their documented effect, reduce inventory, and consume a player action with the correct enemy response.

## Decision Summary
- Follow the item rules in `.memory/decisions/2026-09-29-cookie-roguelike.md` exactly.
- The red browser reproduction is: start battle, press Heal, assert count decreases and HP changes; the current page reports a heal while count and HP stay unchanged.

## Implementation

### I01. Implement item state transitions and wire the HUD
- Related files:
  - `assets/js/battle-engine.js` :: `useConsumable`, `applyDefense`, `addConsumable`, `getConsumableCount` — mutate run state and return an event; modify.
  - `cookie-roguelike-mockup.html` :: `useItem`, keydown handler, item inventory markup, `#hpValue`, `#ammoValue` — apply effects and render counts; modify.
  - `tests/battle-engine.test.cjs` :: tests for all item effects, empty inventory, blocked use, turn consumption, and turn response; modify.

#### Details
- Add state field `inventory` as a record of `fireball`, `spear`, `defense`, and `heal` counts, initialized deterministically from the mockup's shown inventory `{fireball:1,spear:2,defense:1,heal:1}`. Add flags `fireballArmed` (boolean), `defenseArmed` (boolean), and `consumablesBlocked` (boolean).
- Heal spends one Heal, restores 25 HP capped at 100, then allows one enemy action.
- Defense spends one item, arms a one-attack block, consumes the player's action, and the enemy's next damage and special effects are canceled.
- Fireball spends one item and arms a single next permanent projectile at 2x rolled damage; it does not stack, does not apply to Spear, and a zero roll remains zero. It still spends the player's action and the enemy responds; clear the flag after the next permanent shot.
- Spear spends one item, independently damages up to three enemies in encounter order with 2–5 base damage and one less per subsequent enemy, continuing through living enemies; it bypasses character-weapon effects and consumes the player's action.
- Reject use outside active battle, with zero count, while the player is aiming/launching, after terminal state, or while `consumablesBlocked`; rejected use changes no state and shows a clear reason.
- A consumed item calls the T01 enemy-turn transition exactly once unless its defense or another documented block cancels the attack. Render inventory count immediately and disable/hide unavailable item actions. Keyboard `1–4` and button clicks share one guarded code path.

## Acceptance Criteria
- [x] Heal decrements its count, restores 25 capped HP, and then resolves one enemy action.
- [x] Defense consumes one item and blocks damage plus special effects on the next enemy attack.
- [x] Fireball modifies only the next permanent shot once; Spear follows its documented 3-target damage falloff and bypass rules.
- [x] Empty/unavailable items cannot be used, and button/keyboard activation cannot double-spend.
- [x] Regression test reproduces current Heal failure before the fix and passes after.

## Validation
- `node --test tests/battle-engine.test.cjs`
- Browser regression: start a fresh run and click Heal; verify its count drops to zero, the button disables, HP reflects the enemy response, and the inventory remains synchronized. Engine tests verify the capped heal amount and enemy damage separately.
- `git diff --check`

## Commit Message
```text
fix(game): apply consumable effects and turn costs

Plan: 2026-10-20-combat-state-repair
Phase: P01-gameplay-state
Task: T02-consumable-effects

- Spend consumable counts and apply their battle effects
- Resolve exactly one enemy response per usable item
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: a6ac47d
