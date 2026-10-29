# Plan: 음악 제외 배포 게이트

## Goal
로컬 개발 게임·관리자 테스트 전투의 BGM은 유지하고, Azure에 업로드할 production 빌드에서는 음악 재생과 조절 UI를 제외한다. 사용자 게임의 다른 코드는 유지한다.

## Decision
[음악 제외 결정](../decisions/2026-10-29-bgm-release-gate.md)

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 프로덕션 BGM 게이트와 양쪽 빌드 검증 | [P01](../phases/2026-10-29-bgm-release-gate/P01-release-gate/phase.md) |

## Boundary
Azure 업로드 시점은 사용자 답변을 기다린다. 이 계획은 배포 아티팩트의 음악 제외 기능까지 구현하며 다른 전투 규칙을 바꾸지 않는다.
