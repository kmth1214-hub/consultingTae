# Phase: P01 Wide Combat

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Define wide world, pull-driven paths, solid collision, Wind bypass and camera math as tested pure functions. | [T01](./T01-world-shot-model.md) |
| T02 | `done` | Atomically wire mouse-only drag, wide world, camera, collision and enemy feedback into the playable game. | [T02](./T02-playable-mouse-drag.md) |
| T03 | `in_progress` | Complete regional wide scenery, matching obstacle art and elastic pull/release feedback. | [T03](./T03-wide-scenery-and-tension.md) |
| T04 | `pending` | Validate complete gameplay, special cases and responsive visuals; retire superseded compact-only helpers. | [T04](./T04-wide-gameplay-regression.md) |

## Progress
- done: 2/4 (active: T03; awaiting execution)

## Completed
- T02: `c7c63df` — playable mouse-only vector drag/reverse/downward shots, canonical3600×1200 actors/solids/flight/enemy response and overview→aim→follow→enemy camera. Guards preserve one impact/turn, explicit null Wind targets and safe cancellation. Full Node78/78, final production Chrome51/51, standalone build and diff checks pass. Inspected1440/390 stage captures in untracked `tmp/wide-t02-*.jpg`. Necessary CSS camera compensation keeps preview3.5px on screen. Functional regional backdrop is intentionally temporary; T03 supplies illustrated continuity/readability/tension.
- T01: `c49d8c9` — three pure world/shot/camera modules and three test files. Focused 14/14, full Node 76/76, production build and diff checks pass. All real round enemies are reachable by ordinary shots; Wind bypass, reverse shots and wall tie/grazing contacts verified. Polygon refinement uses 32 subdivisions to honor the 1e-6 wall-wins tolerance. Live UI integration starts in T02.

## Boundaries
- Follow the exact task commit messages and update task → phase → current in order.
- T01 does not switch the active UI. T02 switches all coordinate consumers together. The whole feature is complete only after T03/T04.
- Deferred Azure work stays outside this Phase. After T04, record completion and await the next explicit task.
