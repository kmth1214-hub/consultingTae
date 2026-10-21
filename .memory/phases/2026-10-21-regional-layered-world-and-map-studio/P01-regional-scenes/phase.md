# Phase: P01 Regional Scenes and Map Studio

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Produce and review dedicated Snow layers and reusable asset validation. | [T01](./T01-snow-layer-art.md) |
| T02 | `in_progress` | Produce and review dedicated City layers. | [T02](./T02-city-layer-art.md) |
| T03 | `pending` | Produce and review dedicated Chaos layers. | [T03](./T03-chaos-layer-art.md) |
| T04 | `pending` | Integrate painted scenes, decorative parallax and restrained environment motion. | [T04](./T04-shared-scene-depth.md) |
| T05 | `pending` | Build isolated development map review with production exclusion. | [T05](./T05-development-map-studio.md) |
| T06 | `pending` | Validate all scenes/gameplay/access boundaries and hand back to existing cookie task. | [T06](./T06-regional-review-and-handoff.md) |

## Progress
- done: 1/6 (active: T02; blueprint selected, City generation not started)

## Completed
- T01: `82751e8` — eight dedicated native1536×1024 Snow PNGs, version1 native/registration metadata, actual-Chrome RGBA verifier and complete prompt/visual review. Final8/8 pass; road row768100% opaque, foreground top80%100% transparent. Invalid CLI and8+2 negative probes pass, standalone build/staged diff clean. Final images total12212323 bytes; source maps/Forest PNGs/live src unchanged. Road height/foreground clipping candidates corrected through imagegen; final isolated/registered panorama views inspected under untracked tmp. See [review](../../../asset-reviews/2026-10-21-snow-layers.md). Runtime integration remains T04, studio/link T05; no unrelated findings. Planning baseline is543252f.

## Completion policy
Follow task → prescribed commit → phase/plan/current sync. Do not skip art review or count DOM image presence as visual completion. Keep actual dimensions/transparency and screenshots/review notes.
After T06, complete this Phase/plan and restore the existing Wide Combat T04 pointer, then its T05. Wide Combat remains3/5 during this inserted plan. Never start Azure automatically.
