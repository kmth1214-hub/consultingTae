# Phase: P01 전투 시뮬레이션

## Goal

관리자 숲 시범판에만 결정적 고저차, 물체 위 몬스터의 낙하, 기본 사탕 3종의 실제 물리 효과를 연결한다. 일반 플레이 및 다른 지역은 기존 판정을 유지한다.

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 개발 전용 시나리오·고저차 배치·도달성 검증 | [T01](./T01-elevated-layout.md) |
| T02 | `done ✅` | 통나무 위 몬스터의 낙하 궤적·이동 충돌·피해 정산 | [T02](./T02-rider-fall-physics.md) |
| T03 | `in_progress 🔵` | 모험가 바운스·연금술사 파동·불공/창 조합 | [T03](./T03-bounce-and-splash.md) |
| T04 | `pending` | 마법사 분기 구슬·장애물 흔들림·다중 실충돌 | [T04](./T04-wizard-split-orbs.md) |

## Progress

- done: 2/4 (active: T03)
- 각 Task에서 지정한 테스트와 `npm.cmd run build`를 확인하고 Task별 한국어 커밋을 남긴다.

## Phase exit

같은 입력·seed의 배치와 접촉 타임라인이 재현되고, 새 능력은 개발 전용 숲 시나리오에서만 발동한다. P02가 이 시뮬레이션의 결과를 그대로 표시할 수 있다.
