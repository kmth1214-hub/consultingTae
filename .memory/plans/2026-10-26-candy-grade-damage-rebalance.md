# Plan: Candy Grade Damage Rebalance

## Goal
확정된 등급별 피해표를 실제 추첨과 HUD에 동일하게 적용한다. 이후 사용자 요청의 빗나감·중복 반격·라운드 전환 버그는 별도 진단 기록과 재현 루프로 조사한다.

## Decisions
[확정 문서](../decisions/2026-10-26-candy-grade-damage-rebalance.md). 요청 slug의 마지막 e 누락(`rebalanc`)은 기존 결정의 `rebalance`로 정규화한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | validated / commit pending | 피해표와 검증 완료 | [P01](../phases/2026-10-26-candy-grade-damage-rebalance/P01-damage/phase.md) |

## Execution notes
- 하나의 순수 추첨 규칙과 표시 범위를 함께 바꾸는 작은 변경이므로 단일 Task. 점수 배율과 창 피해를 건드리지 않는다.
- 이전10건 미커밋 작업 및 사용자 목업 보존. 자동 승인 검토 제한을 우회하지 않고 검증/커밋 완료를 구분한다.
- 이 Task 이후 `diagnosing-bugs` 순서대로 실제 버그를 재현하고 수정한다. 원인을 가정해 미리 게임 규칙을 바꾸지 않는다.
