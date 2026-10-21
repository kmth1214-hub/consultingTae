# Phase: P01 Wide Combat

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `in_progress` | Define wide world, pull-driven paths, solid collision, Wind bypass and camera math as tested pure functions. | [T01](./T01-world-shot-model.md) |
| T02 | `pending` | Atomically wire mouse-only drag, wide world, camera, collision and enemy feedback into the playable game. | [T02](./T02-playable-mouse-drag.md) |
| T03 | `pending` | Complete regional wide scenery, matching obstacle art and elastic pull/release feedback. | [T03](./T03-wide-scenery-and-tension.md) |
| T04 | `pending` | Validate complete gameplay, special cases and responsive visuals; retire superseded compact-only helpers. | [T04](./T04-wide-gameplay-regression.md) |

## Progress
- done: 0/4 (active: T01; implementation not started)

## Boundaries
- Follow the exact task commit messages and update task → phase → current in order.
- T01 does not switch the active UI. T02 switches all coordinate consumers together. The whole feature is complete only after T03/T04.
- Deferred Azure work stays outside this Phase. After T04, record completion and await the next explicit task.
