# Decision: Combat State Repair

## Confirmed scope
- Fix the gameplay defects confirmed in the bug review: projectile animation without combat resolution, no defeat transition on ammo exhaustion, consumables that do not mutate inventory or apply effects, cosmetic-only rewards, and static combat/result HUD values.
- Keep the current single-page browser prototype and its slingshot/camera presentation. Do not migrate to Unity or add a backend in this task.
- Use `.memory/decisions/2026-09-29-cookie-roguelike.md` as the source of truth for combat, item, reward, scoring, boss, and round rules.
- Preserve the boss special-attack cadence: every third attack by that boss.
- Keep the live run in memory; server persistence, company login, and leaderboard storage remain out of scope.

## Combat behavior
- A fired shot consumes the currently assigned permanent weapon and one ammo even on a miss. Resolve collisions along the animated trajectory in encounter order.
- Roll weapon damage once per projectile: C 0–4 with weights 2%, 40%, 40%, 10%, 8%; B/A shift minimum and maximum up by one per grade, preserving relative probabilities. At most two zero rolls per area-round; subsequent zero rolls become at least one.
- Damage spills to the next target only when the current target is defeated. Score only HP actually removed, with the weapon-grade multiplier. Show the resulting miss/hit/damage/defeat state in the UI.
- After every player action, including a consumable action, one living enemy takes a turn unless an effect blocks it or combat has ended. Boss special actions replace the normal action on its third attack.
- If ammo reaches zero while enemies remain, end the run and show dynamic defeat results. If enemies are cleared, advance through the configured rewards and areas; all displayed run values derive from the live state.

## Consumables and rewards
- A consumable can be used only when its inventory count is positive, the run is in an actionable combat turn, and the relevant status does not prohibit it. Spend one count and consume the player's action.
- Implement Fireball, Spear, Defense, and Heal according to the existing decision record; visual feedback accompanies, but never replaces, their state changes.
- A reward choice must be selected before continuing. Applying the selection updates the run state and displayed inventory/weapons; duplicate/capacity rules follow the existing decision record.

## Validation strategy
- Add deterministic Node built-in tests around the same battle engine used by the page, injecting RNG values to verify damage weights, zero-roll cap, collisions/spillover, enemy turns, item counts, reward state, and terminal transitions.
- Repeat the browser repro: start a run, use Heal, and verify its count decreases, player HP changes, and the enemy turn resolves; repeat the no-ammo case and reward-choice flow.
