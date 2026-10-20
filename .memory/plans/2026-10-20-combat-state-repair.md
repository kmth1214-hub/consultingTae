# Plan: Combat State Repair

## Goal
Make the current slingshot prototype resolve a run consistently: shots change enemy/player state, consumables spend and apply effects, rewards update the run, and HUD/results reflect actual state.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Implement and integrate the gameplay state engine | [P01](../phases/2026-10-20-combat-state-repair/P01-gameplay-state/phase.md) |

## Constraints
Use the existing combat rules in `.memory/decisions/2026-09-29-cookie-roguelike.md`. Keep the app in the current HTML/CSS/JavaScript prototype, no backend or Unity migration, and preserve the third-attack boss special cadence.
