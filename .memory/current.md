# Current Context

## Active Plan
[Forest Layered Background](./plans/2026-10-12-forest-layered-background.md)

## Active Phase
[P01 Forest Scene](./phases/2026-10-12-forest-layered-background/P01-forest-scene/phase.md)

## Active Task
[T03 Ambient Motion and Final Validation](./phases/2026-10-12-forest-layered-background/P01-forest-scene/T03-ambient-motion-validation.md)

## Status
- T01 완료 — a7bc1bb. 별도 PNG 세 장, 정적인 숲 무대·흙길, 이미지 실패 fallback 구현. PNG/alpha·JavaScript 문법·보호된 함수 보존·실제 Chrome 구도/지역/fallback 검증 통과.
- T01R01 완료 — e74d642. 원본 기반 path.png, 중경→길목/배우→전경 순서, 숲 world240%×200%, 투석기left14%/enemy73%, 모바일 겹침 조정. 화면 거리255→416px, world 거리408→999px. 동작/타지역/fallback 검증 통과.
- T02 완료 — 6990718 (2026-10-14). 거리별 시차0.18/0.50/1.08, 단일 프레임 샘플러, 실제 행렬 동결 취소, 전환/숨김/blur 정리, 빠른 재진입 세대 가드. 최종16 카메라 검사·9 화면폭/구도 영역 검사·실제 숨김 이벤트·상태 기반 발사 완료 검증 통과. 전체 화면 API는 창 모드 대체만 확인.
- 진행률 3/4. 다음은 T03 안개·나뭇잎·폭포 환경 움직임과 최종 검증.
- 이전 area-background-depth 계획은 완료 상태이며 문서를 보존한다. 기존 Battle Presentation Refinement 미완료 작업은 이번 계획과 별개다.

## Next Step (IMPORTANT)
T03 청사진의 T02 Integration Contract 및 Superseding T01R01 Layout Contract를 읽고 ambient DOM/CSS를 구현한다. 기존 forestMotionQuery/미디어 리스너·visibility/showScreen·fitArenaWorld를 재사용하고 syncForestAmbientState를 연결한다. 장식 wrapper는 world 크기, 실제 이미지/마스크는 ::before에 있으므로 환경 자식의 transform은 시차와 분리한다. 전경은 독립 world 자식z5; 길목/배우는worldcamera 그대로; 조준/투사체z6/z7 유지. 실제 폭포 좌표는 world-normalized로 사용한다. T02 검증 기록은 `.memory/validation/2026-10-12-forest-layered-background/parallax.md`; 완료 상태를 기다리는 검증을 재사용한다. 기존 idle projectile 결함은 임의로 고치지 않는다. `/memory-execute` 또는 "current 보고 이어서 해줘"로 T03을 실행한다.
