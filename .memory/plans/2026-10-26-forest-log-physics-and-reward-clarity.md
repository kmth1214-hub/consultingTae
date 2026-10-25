# Plan: Forest Log Physics and Reward Clarity

## Status
- in_progress

## Goal
숲 통나무는 이동·낙하·짧은 미끄러짐으로 실제 닿은 첫 적에게만 피해 3을 주고, 매 숲 라운드에 이를 노릴 기회를 제공한다. 야영지 무작위 사탕 결과를 지역 진입 전에 확인하고, 전투 HUD에서 이번/다음 사탕과 적용 능력을 정확히 읽을 수 있게 한다.

## Decisions
- [Confirmed design](../decisions/2026-10-26-forest-log-physics-and-reward-clarity.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 숲 물리 판정·연출, 보상 확인, 사탕 HUD | [P01](../phases/2026-10-26-forest-log-physics-and-reward-clarity/P01-physical-feedback/phase.md) |

## Tasks
| Task | Status | Summary |
| :--- | :--- | :--- |
| T01 | `done` | 통나무 궤적과 시간순 물리 피해 |
| T02 | `done` | 근접 배치 보장과 동일 궤적 시각 재생 |
| T03 | `done` | 야영지 무작위 보상 확인 화면 |
| T04 | `in_progress` | 정확한 이번/다음 사탕 정보와 회귀 검증 |

## Boundaries
- 구현은 아래 Task를 순서대로 읽으며 수행한다. 이 계획 단계에서는 구현 코드를 작성하지 않았다.
- 눈·도시·혼돈의 효과와 Wind 유도 예외, 기존 사탕 연쇄/굴림, 로그인·리더보드·Azure 배포는 변경하지 않는다.
- 기존 목업 변경 및 관련 없는 미추적 파일을 스테이징하지 않는다.
