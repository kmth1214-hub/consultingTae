# Plan: 일반 게임 숲 몬스터 고저차 배치

## Goal
관리자 숲 시범판의 높이 배치를 일반 게임 숲 전투에 반영해 2라운드 적 하나가 통나무 위에 서고 받침이 쓰러질 때 실제 낙하 판정과 화면이 일치하게 한다. 다른 관리자 시범 기능과 Azure BGM은 공개하지 않는다.

## Decision
[일반 게임 숲 배치 결정](../decisions/2026-10-29-public-forest-elevated-placement.md)

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 일반 게임 배치와 낙하 연결, 회귀 검증 | [P01](../phases/2026-10-29-public-forest-elevated-placement/P01-public-forest/phase.md) |

## Release
T01 검증 및 커밋 후 기존 Azure workflow의 음악 제외 빌드를 푸시하고 배포 실행을 확인한다. 별도 Azure 인증·저장소 값은 코드에 넣지 않는다.
