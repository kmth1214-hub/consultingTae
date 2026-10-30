# Plan: Cookie Stone Slots and City Crow

## Goal
쿠키별 점수 보너스를 없애고 전용 1발·기본 2발로 시작하는 스톤 덱과 라운드 슬롯 보상을 적용한다. 도시 일반전에 순찰하는 태엽 까마귀를 넣고 새 점수 버전을 Azure에 게시한다.

## Source
- [확정 결정](../decisions/2026-10-30-cookie-stone-slots-city-crow.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 스톤 덱·능력·슬롯 규칙 | [P01](../phases/2026-10-30-cookie-stone-slots-city-crow/P01-stones/phase.md) |
| P02 | `pending` | 슬롯·장전 화면과 태엽 까마귀 전투 | [P02](../phases/2026-10-30-cookie-stone-slots-city-crow/P02-presentation/phase.md) |
| P03 | `pending` | 회귀 검증·Azure 게시·기존 리더보드 삭제 | [P03](../phases/2026-10-30-cookie-stone-slots-city-crow/P03-release/phase.md) |

## Constraints
- 기존 적 수·체력은 이번 계획에서 바꾸지 않는다. 통나무·얼음·도시 장애물 효과, 점수의 공통 피해 규칙, 소모품의 전투 동작은 유지한다.
- 새로운 스톤이 실제 피해를 줄 때만 점수가 오른다. 모험가·연금술사의 고유 +10 점수는 제거한다.
- 새 점수 버전 배포가 성공하기 전에는 기존 Azure 기록을 삭제하지 않는다.
- `cookie-roguelike-mockup.html` 및 관계없는 작업 파일은 커밋에서 제외한다.
