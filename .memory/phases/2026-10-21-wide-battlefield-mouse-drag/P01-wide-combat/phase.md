# Phase: P01 Wide Combat

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Define wide world, pull-driven paths, solid collision, Wind bypass and camera math as tested pure functions. | [T01](./T01-world-shot-model.md) |
| T02 | `done` | Atomically wire mouse-only drag, wide world, camera, collision and enemy feedback into the playable game. | [T02](./T02-playable-mouse-drag.md) |
| T03 | `done` | Compose independent layers for all four regions, matching obstacle art and elastic feedback; reserve cookie space. | [T03](./T03-wide-scenery-and-tension.md) |
| T04 | `done` | Add the selected cookie beside the weapon and center incoming hits, shields and healing on it. | [T04](./T04-player-cookie-feedback.md) |
| T05 | `done` | Validate full layered-map/player/gameplay visuals and progression; retire superseded compact helpers. | [T05](./T05-wide-gameplay-regression.md) |

## Progress
- done: 5/5

## Inserted dependency — 2026-10-21
- The user requested [Regional Layered World and Map Studio](../../../plans/2026-10-21-regional-layered-world-and-map-studio.md), which temporarily took the active pointer. After that six-Task plan completed, this Phase resumed and completed T04–T05; all five Tasks are now done.
- The inserted regional scene/studio plan is complete. Dedicated regional PNGs and decorative parallax supersede T03's flat-crop presentation limit; its successful gameplay/material/tension work and historical validation remain valid. Preserve shared scene/camera calls during the later player migration.

## User amendment — 2026-10-21
- Snow/City/Chaos retain their flat source PNGs; T03 has now composed independent sky/distant/midground/route/foreground layers using proportional cropped landmarks and native continuation. T04 adds the selected cookie/player-centered impacts. Original final-regression T04 is renamed T05; its checks remain intact and expand to all four maps/five cookies. See decisionD09 and the revised plan.

## Completed
- T05: Final wide-combat review passed: Node83/83, production Chrome78/78, studio8/8, region PNG24/24 (36,015,499 bytes), production build/studio exclusion and diff checks. Real mouse tests prove each regional obstacle blocks the normal candy with no damage and that Wind clears the obstacle on the same straight full-power pull. Main/bonus progression, consumables, enemy turns, cancellation, reverse shots, all four layers, five cookie assets and cookie-centered heal/shield/hit feedback remain covered. Four regional collision frames and Wind flight were inspected at 1440×900; desktop and narrow/reduced-motion captures were rechecked. Retired unused compact target-X trajectory source/test. Portrait overview intentionally fits the full world to screen width and leaves space below; aim/follow restores closer framing. Existing regional source images remain softer at close zoom due to their 764×508 resolution. No gameplay defect or out-of-scope finding remained. Azure deployment stays deferred. Commit: `검증(전투): 광역 전장 조작과 전체 플레이 회귀 확인`.
- T04 implemented selected-cookie rendering using existing proportional character PNGs, canonical `layout.player` anchors, cookie-centered enemy projectiles/melee strikes, and local shield/hurt/heal presentation. Focused pure9/9, full Node89/89, full production Chromium73/73, build and diff check passed. Captures for all five characters plus heal/shield/hit were visually reviewed and documented in [T04 player review](../../../asset-reviews/2026-10-21-wide-t04-player-review.md). No collider, engine action, combat math or inventory/HP rule changed. Commit: `기능(전투): 선택 쿠키 피격 및 방어 연출 적용`.
- T03: `455990b` — restored proportional source-art paint across five independent regional layers, exact-polygon obstacle materials, full-angle elastic draw/release, clear reverse meter, short cosmetic contact effects and camera-readable health badges. Node78/78 and affected production Chrome51/51 pass; after final Forest crop adjustment, region-layer13/13 passes again. Standalone build and staged diff checks pass. Captures at1440/2007/2560/844/390 inspected under untracked `tmp/wide-t03-*.jpg`; no runtime/asset failures. Original regional764×508 sources limit close-up sharpness. Cookie space reserved; actor/attack ownership remain T04. Combat/model/input/camera rules, assets, obstacle count/placement and legacy HTML unchanged; out-of-scope findings: none.
- T02: `c7c63df` — playable mouse-only vector drag/reverse/downward shots, canonical3600×1200 actors/solids/flight/enemy response and overview→aim→follow→enemy camera. Guards preserve one impact/turn, explicit null Wind targets and safe cancellation. Full Node78/78, final production Chrome51/51, standalone build and diff checks pass. Inspected1440/390 stage captures in untracked `tmp/wide-t02-*.jpg`. Necessary CSS camera compensation keeps preview3.5px on screen. Functional regional backdrop is intentionally temporary; T03 supplies illustrated continuity/readability/tension.
- T01: `c49d8c9` — three pure world/shot/camera modules and three test files. Focused 14/14, full Node 76/76, production build and diff checks pass. All real round enemies are reachable by ordinary shots; Wind bypass, reverse shots and wall tie/grazing contacts verified. Polygon refinement uses 32 subdivisions to honor the 1e-6 wall-wins tolerance. Live UI integration starts in T02.

## Boundaries
- Follow the exact task commit messages and update task → phase → current in order.
- T01 does not switch the active UI. T02 switches all coordinate consumers together. The whole feature is complete only after T05's final review.
- Deferred Azure work stays outside this Phase. After T05, record completion and await the next explicit task.
