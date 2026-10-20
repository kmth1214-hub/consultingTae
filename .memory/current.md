# Current Context

## Active Plan
[Combat State Repair](./plans/2026-10-20-combat-state-repair.md)

## Active Phase
[P01 Gameplay State](./phases/2026-10-20-combat-state-repair/P01-gameplay-state/phase.md)

## Active Task
Complete — no active task.

## Status
- Diagnosis reproduction: in the active battle screen, click Heal. The toast claims +25 HP and an enemy turn, while Heal count remains 1, HP remains 74, and enemies remain unchanged. Reproduced twice.
- Ranked hypotheses shared: static/mock-only handlers, UI state not connected to combat model, round/run state not wired to terminal transitions, or a stale page build. The browser repro and source trace confirm state transitions are absent in the active served file.
- Existing decision record defines the expected combat/item/reward rules; implementation is split into T01 projectile combat, T02 consumables, and T03 rewards/progression.
- T01 completed and committed as `ae99826` (`feat(game): resolve projectile combat and run endings`). The shared engine resolves projectile path hits, damage, score, enemy responses, and terminal screens; 8 deterministic tests pass. Browser start-state regression passed with no console errors. The CUA API could not reproduce the held-mouse-plus-Space gesture end-to-end.
- T02 completed and committed as `a6ac47d` (`fix(game): apply consumable effects and turn costs`). All four consumables now spend inventory, apply their effects, and resolve the correct enemy response; Heal browser regression passed. Engine suite: 13 tests.
- T03 completed and committed as `4cfef5f` (`feat(game): connect rewards and run progression`). Reward selection gates, fusion, camp choices, round refresh, dynamic HUD/results, and unused-item score were added; the final engine suite has 19 passing tests. Browser start/Heal regression passed without console errors.

## Next Step
Plan complete. The controlled browser cannot reproduce the held-mouse-plus-Space launch gesture, so shot/reward-screen traversal remains covered by deterministic engine tests rather than a full UI fire simulation.
