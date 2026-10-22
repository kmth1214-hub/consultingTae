# Plan: City Panorama Visibility

## Status
- in_progress

## Goal
Make the marked warm city skyline panorama a prominent, unobstructed part of the ordinary battle view while retaining an interactive, readable road and the current gameplay geometry. The improvement must appear in both the game and development map studio at desktop and mobile sizes.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Open the City midground composition around the central skyline, then verify the actual runtime and studio views. | [P01](../phases/2026-10-22-city-panorama-visibility/P01-city-composition/phase.md) |

## Decisions
- [City Panorama Visibility](../decisions/2026-10-22-city-panorama-visibility.md)
- [Regional Layered World and Map Studio](../decisions/2026-10-21-regional-layered-world-and-map-studio.md)

## Task sequence
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Recompose City midground as edge framing so the existing distant skyline reads across the broad center, with the road and gameplay geometry untouched. | [T01](../phases/2026-10-22-city-panorama-visibility/P01-city-composition/T01-open-city-skyline.md) |
| T02 | `in_progress` | Review actual gameplay and studio screenshots at desktop/mobile sizes, fix only reproduced composition defects, and complete memory state. | [T02](../phases/2026-10-22-city-panorama-visibility/P01-city-composition/T02-visual-acceptance.md) |

## Scope and compatibility
- City-only decorative rendering change, using existing City assets. Preserve City distant art, route, parallax/camera ownership and existing user changes as the baseline.
- Per confirmed user choice, prioritize the distant view and keep the road below. Keep City midground buildings as side framing; open a central skyline view spanning at least 60% of the 3600-unit battlefield width. The route remains at its existing `groundY` / world y=900 and above the midground layer.
- Keep all five scene layers, their names, order semantics, camera transforms and activity lifecycle. No changes to gameplay actors, obstacles, collision, minimap, attack paths, scoring, assets for other regions or production/development access.
- The reported issue originated in layered composition, so the plan changes only the City midground visibility window. If a real screenshot shows the skyline is still obscured, do not hide the road or modify camera/gameplay positions; document the finding for a new decision.
- Preserve existing unrelated and uncommitted workspace files. In particular, do not revert or stage `cookie-roguelike-mockup.html`, `src/game/sceneCatalog.js`, `tests/e2e/region-layers.spec.cjs`, `sites/`, `.npm-cache/`, or `tmp/` unless the specific plan Task later owns a related tracked change.
