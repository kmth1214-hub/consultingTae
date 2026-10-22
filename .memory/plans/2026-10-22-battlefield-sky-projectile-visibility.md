# Plan: Battlefield Sky and Enemy Projectile Visibility

## Goal
Remove the flat-color band visible at the top of Snow, City, and Chaos battlefields and make the already-curved enemy projectile route easy to read, without changing gameplay.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Fix sky coverage, lift low distant artwork in Snow/City/Chaos, and add a travel-only enemy projectile trail with browser regression coverage. | [P01](../phases/2026-10-22-battlefield-sky-projectile-visibility/P01-scene-and-projectile-clarity/phase.md) |

## Decisions
- [Battlefield Sky and Enemy Projectile Visibility](../decisions/2026-10-22-battlefield-sky-projectile-visibility.md)

## Task sequence
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Extend regional sky paint to cover the full camera-visible sky and add a pixel-based regression check. | [T01](../phases/2026-10-22-battlefield-sky-projectile-visibility/P01-scene-and-projectile-clarity/T01-regional-sky-coverage.md) |
| T02 | `in_progress` | Render a travel-only path behind enemy projectiles and verify its geometry and visibility in browser tests. | [T02](../phases/2026-10-22-battlefield-sky-projectile-visibility/P01-scene-and-projectile-clarity/T02-enemy-projectile-trail.md) |
| T03 | `pending` | Raise distant artwork in Snow, City, and Chaos while preserving the Forest composition and gameplay geometry. | [T03](../phases/2026-10-22-battlefield-sky-projectile-visibility/P01-scene-and-projectile-clarity/T03-raise-distant-art.md) |

## Scope and compatibility
- Regional sky gradient extent, non-Forest distant-art elevation, and enemy projectile presentation change.
- Preserve the four regions' art and colors, all camera modes, actor/obstacle coordinates, shot trajectory, enemy attack timing/damage, special effects, and reduced-motion handling.
- No changes to the current Candy Roll implementation or its task blueprints.
