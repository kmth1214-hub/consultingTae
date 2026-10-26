# Plan: Shot Resolution Integrity

## Goal
실제 접촉하지 않은 적의 피해와 한 발 중복 완료를 차단하고 남은 적/반격/라운드 전환을 일치시킨다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | validated / commit pending | 실제 충돌 → 단일 발사 세션 → 통합 검증 완료 | [P01](../phases/2026-10-26-shot-resolution-integrity/P01-resolution/phase.md) |

## Rationale
T01은 기존 API 그대로 충돌 결과를 바로잡아 독립 검증한다. T02는 UI·세션 사이 발사 계약이므로 함께 변경해야 유효한 실행 단위가 된다. 새로운 게임 기능이나 스테이지 규칙은 추가하지 않는다.

## Diagnosis
[재현/결정](../decisions/2026-10-26-shot-resolution-integrity.md). 가설 순위: 1중복 완료 수락, 2종료 지점 이후 대상 포함, 3화면/충돌 좌표 불일치, 4결과/반격 완료의 재진입. 현재1·2의 경계 결함을 red로 재현했고 UI 발생 경로·다른 가설은 통합 테스트로 추가 확인한다.

## Commits
이전11건과 이번2건을 섞지 않는다. 기존 자동 승인 검토 제한을 우회하지 않고 구현/검증/commit 상태를 구분한다.

## Result
전체 unit195, 일반브라우저58/관리자13 고유 테스트, 최종 build 통과. [진단 기록](../reviews/2026-10-26-shot-resolution-integrity.md)에 원래 red/최종green, 실제 입증 범위와 한계, 예방 구조 기록. 다음 구현 Task 없음. commit은기존승인검토제한으로보류.
