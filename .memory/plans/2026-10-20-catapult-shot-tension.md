# Plan: Catapult Shot Tension

## Goal
Build anticipation during aiming by holding a launcher-centered camera close-up from aim start through flight, while showing only a faint first 30% of the predicted arc.

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-20-catapult-shot-tension.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Integrate aiming camera focus and partial trajectory preview | [P01](../phases/2026-10-20-catapult-shot-tension/P01-shot-tension/phase.md) |

## Boundaries
- Production target: cookie-roguelike-mockup.html.
- Preserve camera coordinate mapping, aiming phases, full projectile motion path, parallax, cancellation and screen navigation.
- No hit detection, physics, damage, enemy health or item behavior changes.
- Monster visual refresh remains queued and out of scope.

## Execution Order
1. T01: hold a launcher-focused 1.35× camera during aim/launch, return to fit on completion/cancellation, and respect reduced motion.
2. T02: display only the first 30% of a faint curve while retaining the complete path as hidden geometry for projectile animation; verify both tasks together.

## Validation Strategy
- Run the blueprint's inline script syntax command and git diff --check.
- Use actual Chrome over local HTTP to exercise pointer aiming, camera focus, full projectile animation, early release, pointer cancel, blur/navigation, reduced motion and mobile/desktop scene framing.
- Confirm only the short preview is visible and the projectile still follows the full SVG trajectory.
- Record browser evidence and limits under .memory/validation/2026-10-20-catapult-shot-tension/final.md.

## Completion
Complete when T01 and T02 pass their acceptance criteria and are committed sequentially; synchronize the phase dashboard and active pointer.
