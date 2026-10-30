# Plan: 슬롯머신 릴·손잡이 연출

## Goal
라운드·야영지·혼돈 보상 슬롯을 가로형 동화풍 기계로 만들고, 오른쪽 손잡이 클릭 후 세로 릴 세 개가 약 2.5초 회전하며 왼쪽부터 멈추도록 한다. 기존 3×3 보상 판정과 지급 확률은 유지한다. 다음 본 서버 배포에는 BGM을 함께 포함한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 공통 슬롯 UI·진행 잠금·회귀 검증 | [P01](../phases/2026-10-30-slot-machine-reel-motion/P01-slot-machine/phase.md) |

## Scope and release boundary
- 로컬에서 기능을 구현하고 검증한다. 제공 영상은 디자인 참조이며 저장소·배포 자산에 포함하지 않는다.
- 기존 `assets/js/battle-engine.js::spinRewardSlot`의 3×3 기호 추첨·당첨선·보상 지급은 수정하지 않는다.
- 배포는 이번 구현 뒤 별도 릴리스 요청 시 진행한다. 그때 workflow의 `VITE_ENABLE_BGM`을 `true`로 바꾸고 BGM과 슬롯을 함께 검증·배포한다.
- 이전 계획의 T06 Azure `GLOBAL` 기록 초기화는 미완료다. 새 계획 전환으로 완료 처리하지 않는다.
