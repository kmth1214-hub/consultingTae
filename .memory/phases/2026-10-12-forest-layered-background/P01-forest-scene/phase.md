# Phase: P01 Forest Scene

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 레이어 PNG와 정적인 숲 무대·흙길 | [T01](./T01-static-layered-scene.md) |
| T02 | `in_progress 🔵` | 기존 카메라와 레이어 시차 통합 | [T02](./T02-camera-parallax.md) |
| T03 | `pending` | 환경 움직임과 시각·전투 회귀 검증 | [T03](./T03-ambient-motion-validation.md) |

## Progress
- done: 1/3 (active: T02)

## Dependencies
T01 → T02 → T03. 이미지와 DOM이 있어야 시차를 검증할 수 있고, 시차가 안정되어야 환경 연출을 겹친 최종 장면을 검증할 수 있다.
