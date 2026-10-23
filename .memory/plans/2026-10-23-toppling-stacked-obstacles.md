# Plan: Toppling Stacked Obstacles

## Status
- in_progress

## Goal
Each round gets a stable, playable random layout with 2–4 tall regional stacks. Candy impact can topple multiple stacks according to residual speed, applying each regional effect once while preserving the map view.

## Decisions
- [Confirmed design](../decisions/2026-10-23-toppling-stacked-obstacles.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Random layouts, momentum, combat effects, and presentation. | [P01](../phases/2026-10-23-toppling-stacked-obstacles/P01-stacked-battlefield/phase.md) |

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `pending` | Seeded non-overlapping reachable layouts held for each round. | [T01](../phases/2026-10-23-toppling-stacked-obstacles/P01-stacked-battlefield/T01-round-layouts.md) |
| T02 | `pending` | Ordered collisions and residual-momentum shot path. | [T02](../phases/2026-10-23-toppling-stacked-obstacles/P01-stacked-battlefield/T02-momentum-chain.md) |
| T03 | `pending` | Once-per-stack regional effects and round state. | [T03](../phases/2026-10-23-toppling-stacked-obstacles/P01-stacked-battlefield/T03-topple-combat.md) |
| T04 | `pending` | Regional stacked art, topple/debris playback and browser checks. | [T04](../phases/2026-10-23-toppling-stacked-obstacles/P01-stacked-battlefield/T04-visual-playback.md) |

## Compatibility
- Preserve regional effect values, scoring, ammo, one enemy response per shot, five-diameter ground roll, Wind Archer bypass, aim preview and layered backdrop/camera.
- Previous [candy-roll decision](../decisions/2026-10-22-candy-roll-obstacle-interactions.md) is superseded only for first-obstacle stop, one-effect-per-shot, fixed obstacle art/placement and excluded chains.
- Azure release remains gated. Leave unrelated working-tree files untouched and unstaged.
