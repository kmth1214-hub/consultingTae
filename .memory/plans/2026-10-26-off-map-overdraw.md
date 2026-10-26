# Plan: 맵 밖 발사와 파워 상단 강화

## Goal
최대 파워에서 사탕이 맵의 끝을 넘겨 실제 포물선으로 비행하고, 기존 배경 끝에 머무는 카메라 밖으로 사라진 뒤 한 발의 빗나감/반격으로 마무리한다.

## Decisions
[확정 사항](../decisions/2026-10-26-off-map-overdraw.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | 상단 파워·자유 비행·실제 화면과 단일 턴 검증 완료 | [P01](../phases/2026-10-26-off-map-overdraw/P01-flight/phase.md) |

## Scope
속도와 자유 비행을 따로 배포하면 강한 발사가 경계에서 계속 끊기므로 하나의 Task로 묶는다. 배경/카메라/피해량 확장은 범위 밖이며, 새 외부 서비스는 사용하지 않는다. 기존 13건의 커밋 대기 기록은 current에 보존한다.
