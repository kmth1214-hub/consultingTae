# Plan: 네 지역의 높낮이 있는 몬스터 배치

## Goal
숲의 기존 고저차를 유지하고 눈·도시·혼돈의 공개 전장에도 받침 위 적과 발사대 높이를 적용한다. 실제 낙하와 지역 효과를 연결하고 네 지역 검증 후 BGM 없이 Azure에 배포한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 배치·전투·출시 | [P01](../phases/2026-10-29-regional-elevated-enemies/P01-regional-placement/phase.md) |

## Constraints
- 공개 숲 `forest-elevated-v1`은 유지한다. 눈·도시·혼돈에는 `regional-elevated-v1`을 사용한다.
- 관리자 전용 사탕 능력과 지역 몬스터 시범 기능은 공개하지 않는다.
- 이전 배포 실행 40821823609는 취소됐다.
