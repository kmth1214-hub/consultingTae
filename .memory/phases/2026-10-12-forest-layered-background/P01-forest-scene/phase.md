# Phase: P01 Forest Scene

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 레이어 PNG와 정적인 숲 무대·흙길 | [T01](./T01-static-layered-scene.md) |
| T01R01 | `done ✅` | 사용자 후속 요청: 원본 기반 길목·레이어 순서·광활한 배치 | [T01R01](./T01R01-panoramic-path-revision.md) |
| T02 | `done ✅` | 기존 카메라와 레이어 시차 통합 | [T02](./T02-camera-parallax.md) |
| T03 | `done` | 환경 움직임과 시각·전투 회귀 검증 | [T03](./T03-ambient-motion-validation.md) |

## Progress
- done: 4/4 (active: none)

## Dependencies
T01 → T01R01 → T02 → T03. T01 후 사용자가 원본 기반 길목과 더 넓은 공간/거리 배치를 요청했으므로 이 수정 작업을 먼저 완료한다.

## Completion (2026-10-20)
T03: 5519ff0. All four tasks complete. Fullscreen API fallback and OS-level reduced-motion validation limitations are recorded in final.md.
