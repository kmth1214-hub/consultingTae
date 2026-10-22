# Plan: 사탕 굴림 및 장애물 상호작용

## Status
- complete

## Goal
사탕이 지면에 닿은 뒤 최대 사탕 지름 5배(현재 월드 100 units)까지 마찰을 받으며 구르게 하고, 굴림/비행 중 장애물 충돌을 지역별 전투 효과로 연결한다. 혼돈 지역은 네 효과를 같은 확률로 선택하며, 적중 순서·점수·적 반격이 한 번만 처리되도록 한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 순수 굴림 궤적, 엔진 효과, React 표현과 회귀 검증을 순차 구현한다. | [P01](../phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/phase.md) |

## Decisions
- [Candy Roll and Obstacle Interactions](../decisions/2026-10-22-candy-roll-obstacle-interactions.md)

## Scope and compatibility
- 착지 시 수평 속도와 마찰에 따라 굴리되 최대 거리는 5개 지름(100 world units), 먼저 만나는 적/장애물/경계에서 끝낸다.
- 통나무는 충돌 지점에서 가장 가까운 생존 적에게 피해 3, 얼음은 다음 적 공격 피해 50% 감소, 도시 항아리는 각 생존 적에게 독립적으로 무작위 1~2 피해를 준다.
- 혼돈 지역 충돌은 숲·눈·도시 효과 또는 다음 발사 1회의 가로·세로 조작 반전 중 하나를 같은 확률로 고른다.
- 기존 기본 사탕 피해, 무기 등급 배율, 점수·탄약·턴·보스 공격·보상·Wind 1회 장애물 우회 규칙을 보존한다. Spear 즉시 사용 경로에는 장애물 효과를 넣지 않는다.
- Azure 배포는 기존 별도 미완료 Task로 남기며 이번 계획에서 다루지 않는다. 현재 `.memory/current.md`의 완료된 3라운드 계획 포인터를 이 계획의 첫 Task로 교체한다. Azure Task 원본은 유지한다.

## Task sequence
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 탄도 경로 끝에 마찰 기반 지면 굴림을 추가하고, 굴림 구간의 첫 적/장애물 충돌을 결정적으로 찾는다. | [T01](../phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/T01-ground-roll-geometry.md) |
| T02 | `done` | 전투 엔진과 세션에 지역 효과·점수·다음 공격 감소·혼돈 효과 선택 상태를 연결한다. | [T02](../phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/T02-obstacle-combat-effects.md) |
| T03 | `done` | 사탕 굴림 연출, 장애물 효과 피드백, 혼돈 조작 반전 입력/HUD를 React에 연결한다. | [T03](../phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/T03-react-roll-and-controls.md) |
| T04 | `done` | 실제 브라우저 플레이와 전체 게임 회귀를 검증하고 메모리 상태를 완료로 정리한다. | [T04](../phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/T04-gameplay-regression.md) |

## Dependency and safety notes
- T01은 DOM/엔진 상태와 분리된 순수 geometry를 만든다. T02는 확정된 collision metadata만 엔진에 전달하며 React 애니메이션 콜백에서 피해를 계산하지 않는다.
- T03은 기존 `ProjectileFlight`의 고정 경로 샘플링을 재사용한다. 동일한 `ShotSolution`이 미리보기·비행·충돌과 엔진 hit ids의 기준이다.
- 충돌 직전 위치의 후보를 오름차순으로 보내 적이 선행 직격으로 처치된 경우에도 다음 생존 적을 통나무 대상으로 고를 수 있게 한다.
- 난수는 엔진 주입 `rng`만 사용한다. 혼돈 선택과 도시 적별 피해 모두 시드 고정 테스트를 둔다.
- 저장소에 이미 존재하는 사용자 변경 `cookie-roguelike-mockup.html`, `sites/`, `.npm-cache/`, `tmp/`는 이번 계획 파일 작성에서 수정·정리·스테이징하지 않는다.
