# Phase: P01 Wide Combat

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Define wide world, pull-driven paths, solid collision, Wind bypass and camera math as tested pure functions. | [T01](./T01-world-shot-model.md) |
| T02 | `done` | Atomically wire mouse-only drag, wide world, camera, collision and enemy feedback into the playable game. | [T02](./T02-playable-mouse-drag.md) |
| T03 | `done` | Compose independent layers for all four regions, matching obstacle art and elastic feedback; reserve cookie space. | [T03](./T03-wide-scenery-and-tension.md) |
| T04 | `pending` | Add the selected cookie beside the weapon and center incoming hits, shields and healing on it. | [T04](./T04-player-cookie-feedback.md) |
| T05 | `pending` | Validate full layered-map/player/gameplay visuals and progression; retire superseded compact helpers. | [T05](./T05-wide-gameplay-regression.md) |

## Progress
- done: 3/5 (next here: T04; queued behind the regional scene/studio plan, implementation not started)

## Inserted dependency — 2026-10-21
- The user requested [Regional Layered World and Map Studio](../../../plans/2026-10-21-regional-layered-world-and-map-studio.md). Its six Tasks now own the active pointer. This Phase retains its completed T01–T03, queued T04 and pending T05; nothing is marked completed by that planning step.
- After the inserted plan's T06, restore this Phase's active T04, then T05. Dedicated regional PNGs and decorative parallax supersede T03's flat-crop presentation limit; its successful gameplay/material/tension work and historical validation remain valid. Preserve shared scene/camera calls during the later player migration.

## User amendment — 2026-10-21
- Snow/City/Chaos retain their flat source PNGs; T03 has now composed independent sky/distant/midground/route/foreground layers using proportional cropped landmarks and native continuation. T04 adds the selected cookie/player-centered impacts. Original final-regression T04 is renamed T05; its checks remain intact and expand to all four maps/five cookies. See decisionD09 and the revised plan.

## Completed
- T03: `455990b` — restored proportional source-art paint across five independent regional layers, exact-polygon obstacle materials, full-angle elastic draw/release, clear reverse meter, short cosmetic contact effects and camera-readable health badges. Node78/78 and affected production Chrome51/51 pass; after final Forest crop adjustment, region-layer13/13 passes again. Standalone build and staged diff checks pass. Captures at1440/2007/2560/844/390 inspected under untracked `tmp/wide-t03-*.jpg`; no runtime/asset failures. Original regional764×508 sources limit close-up sharpness. Cookie space reserved; actor/attack ownership remain T04. Combat/model/input/camera rules, assets, obstacle count/placement and legacy HTML unchanged; out-of-scope findings: none.
- T02: `c7c63df` — playable mouse-only vector drag/reverse/downward shots, canonical3600×1200 actors/solids/flight/enemy response and overview→aim→follow→enemy camera. Guards preserve one impact/turn, explicit null Wind targets and safe cancellation. Full Node78/78, final production Chrome51/51, standalone build and diff checks pass. Inspected1440/390 stage captures in untracked `tmp/wide-t02-*.jpg`. Necessary CSS camera compensation keeps preview3.5px on screen. Functional regional backdrop is intentionally temporary; T03 supplies illustrated continuity/readability/tension.
- T01: `c49d8c9` — three pure world/shot/camera modules and three test files. Focused 14/14, full Node 76/76, production build and diff checks pass. All real round enemies are reachable by ordinary shots; Wind bypass, reverse shots and wall tie/grazing contacts verified. Polygon refinement uses 32 subdivisions to honor the 1e-6 wall-wins tolerance. Live UI integration starts in T02.

## Boundaries
- Follow the exact task commit messages and update task → phase → current in order.
- T01 does not switch the active UI. T02 switches all coordinate consumers together. The whole feature is complete only after T05's final review.
- Deferred Azure work stays outside this Phase. After T05, record completion and await the next explicit task.
