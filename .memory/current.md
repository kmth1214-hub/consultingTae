# Current Context

## Active Plan
[Forest Layered Background](./plans/2026-10-12-forest-layered-background.md)

## Active Phase
[P01 Forest Scene](./phases/2026-10-12-forest-layered-background/P01-forest-scene/phase.md)

## Active Task
[T02 Camera Parallax](./phases/2026-10-12-forest-layered-background/P01-forest-scene/T02-camera-parallax.md)

## Status
- T01 완료 — a7bc1bb. 별도 PNG 세 장, 정적인 숲 무대·흙길, 이미지 실패 fallback 구현. PNG/alpha·JavaScript 문법·보호된 함수 보존·실제 Chrome 구도/지역/fallback 검증 통과.
- T01R01 완료 — e74d642. 원본 기반 path.png, 중경→길목/배우→전경 순서, 숲 world240%×200%, 투석기left14%/enemy73%, 모바일 겹침 조정. 화면 거리255→416px, world 거리408→999px. 동작/타지역/fallback 검증 통과.
- 진행률 2/4. T02 시차 효과로 복귀; T03 환경 움직임은 대기 중.
- 이전 area-background-depth 계획은 완료 상태이며 문서를 보존한다. 기존 Battle Presentation Refinement 미완료 작업은 이번 계획과 별개다.

## Next Step (IMPORTANT)
T02 청사진의 Superseding T01R01 Layout Contract를 우선 적용한다. foreground는 더 이상 forestScenery 안에 없으므로 arenaWorld 아래의 장식 레이어를 선택한다. path/배우는 world camera 그대로, foregroundz5/trajectoryz6/projectilez7 유지. 기존 fitArenaWorld 재사용. 실제 검증/좌표/프롬프트는 path-revision.md에 기록되어 있다.
T02 청사진을 읽고 기존 world 카메라의 실제 행렬에서 장식 시차를 계산한다. T01 검증 기록 `.memory/validation/2026-10-12-forest-layered-background/assets.md`의 Layout Clarifications를 적용해야 한다: distant는 overscan100%, 투명 중경/전경은55.555556%와 가장자리 mask를 유지하며 ready forest world overflow:visible 유지. ::before로 옮길 때 이 차이를 보존하고 waterfall은 world-normalized 좌표를 사용한다. T01용 보호 함수 검사는 T02에서 camera 함수를 의도적으로 수정하므로 그대로 사용하지 않는다. 기존 idle projectile hidden/display 문제는 범위 밖 발견으로 기록되어 있고 임의로 고치지 않는다. `/memory-execute` 또는 "current 보고 이어서 해줘"로 T02를 실행한다.
