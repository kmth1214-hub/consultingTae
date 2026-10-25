# Decisions: Forest Log Physics and Reward Clarity

- Date: 2026-10-26
- Status: Confirmed
- Feature: `forest-log-physics-and-reward-clarity`
- Applies to: React battlefield, Forest layouts, the inter-region camp reward flow, and the magic-candy HUD.
- Workflow: Interview complete. Create a `/memory-plan forest-log-physics-and-reward-clarity` before implementation.
- Supersedes only the Forest automatic-nearest-enemy strike in [the stacked-obstacle decision](2026-10-23-toppling-stacked-obstacles.md). Preserve the other regions, ammo, scoring, candy chaining, ground-roll limit, and Wind Archer bypass.

## D01. Forest impact must physically reach one enemy
- **Chosen by user**: Only Forest logs change to physical enemy collision. Snow's attack reduction, City's multi-enemy damage, and Chaos's four random outcomes retain their current rules, including Chaos's existing forest-like random strike.
- **Rule**: A candy striking a standing Forest log launches/tips that log in the direction and with momentum derived from the candy's impact velocity, angle, and contact point. Animate from the same authoritative trajectory used for hit testing. Resolve the first swept collision between the moving log and a living enemy; that enemy alone takes the existing fixed 3 damage, capped by remaining HP. If the log hits no enemy, it deals no log damage and adds no log-damage score. A log landing on an enemy counts as a hit; a log passing nearby does not.
- **Ground continuation**: After landing, the log may slide a short distance determined by its horizontal velocity and friction, capped at about one log width. The first living enemy touched during this slide may still take the single hit. Once stopped, the log is non-collidable debris for the rest of the round.
- **Preserved interaction**: The candy may retain momentum after the log contact, strike another stack, or directly hit an enemy according to the existing shot simulation. Candy and log hits each follow their own existing damage and scoring rules; neither is granted merely because the other contacted something. A Forest log triggers at most once per round.
- **Implementation constraint inferred from code**: `src/game/shotGeometry.js` currently records candy contact and sorts enemies by distance for `obstacleTargetIds`; `assets/js/battle-engine.js` uses the first living entry for `log-strike` without simulating the log. Replace that Forest targeting input with a deterministic physical log-hit result. Keep world-unit physics independent of camera size and reuse the calculated movement path for visual playback. Tune transfer, gravity, collision and slide coefficients with deterministic tests; the player did not request visible power/angle numbers.

## D02. A Forest round offers a real log opportunity
- **Chosen by user**: Keep randomized, non-overlapping positions, but ensure at least one Forest log is placed near a living monster in each new round so a feasible impact angle and power can make the launched/falling log reach it. This guarantees an opportunity, not automatic damage.
- **Validation**: Candidate layouts must still satisfy the existing 2–4 stacks, unique positions, reachable shots, and fixed-within-round rules. Check the physical log path in the placement/playability witness; if a random candidate fails, use a verified playable fallback. Do not move props during React rerenders.

## D03. Show random camp candy before entering the next region
- **Chosen by user**: After choosing the camp's random weapon reward and resolving any duplicate-fusion decision, show a dedicated acquisition result screen before the next region battle. List every granted/fused candy with its name, final grade, and effect. A clear **Next region** button starts the already-prepared next battle.
- **Existing-code finding**: Ordinary round reward choices already display each candy and consumable in `RewardScreen.jsx`; the missing reveal is the inter-region `chooseCampReward('weapon')` path. The engine already returns `effect.weapons`, but `gameSession.js` discards the event and switches to battle immediately. Preserve the finished reward summary in session view state through the confirmation screen without repeating the random draw or grant. The camp heal choice can retain its current immediate transition because it is not a random item acquisition.
- **Edge case**: When two C-grade candies are awarded, show both; if one is fused, show the final upgraded grade and fusion status. Reload or duplicate button input must not grant the reward again.

## D04. Explain the candy about to be thrown
- **Chosen by user**: In the battle HUD, show the current candy's name, grade, possible damage range, active temporary buffs, owned passive abilities with their trigger conditions, and the next candy when its queue entry is already known. Keep the previously chosen rule that the candy card disappears during flight and reappears on reloading/return to aim.
- **Accuracy**: Damage is rolled only on firing. Display the grade-adjusted possible range as a range, never a predicted exact outcome or target hit. The current engine's base roll is 0–4; grade bonuses yield C 0–4, B 1–5, A 2–6 before conditional bonuses and Fireball. Explain active Fireball ×2 and other conditional bonuses separately. A third zero roll in the same round is raised to at least 1 by the existing engine rule. Clearly distinguish the currently loaded candy from passive effects supplied by all owned candies.
- **Queue edge case**: `weaponQueue[0]` is the current shot. Preview `weaponQueue[1]` only when present; if the queue will reshuffle after this shot, show that the next candy is undecided rather than inventing one. Preserve the prior choice to hide numerical aim angle and pull power.

## D05. Scope and verification
- **Included**: Forest moving-log trajectory, swept enemy collision, short landing slide, one-hit damage/score, reachable near-enemy placement, matching topple/debris playback, camp weapon result screen, and accurate candy HUD details.
- **Excluded**: Changing Snow/City/Chaos effects, new boss first-person mechanics, Azure deployment, leaderboard changes, and showing a deterministic damage result before the random roll.
- **Checks**: Unit tests for impact direction/speed/contact height, near miss, landing hit, short slide/friction cap, first living target only, duplicate suppression, Forest near-enemy playable layouts, direct-candy plus log damage, and unaffected regional effects. Screen tests for two awarded candies, fusion, no duplicate award, next-region transition, current/next queue, temporary/passive descriptions, flight hiding, reduced motion, desktop/mobile layout. Run project tests and build.
