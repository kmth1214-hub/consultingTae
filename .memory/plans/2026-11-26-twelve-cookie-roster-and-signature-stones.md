# Plan: 쿠키 12종과 전용 스톤 7종

## Goal

기존 쿠키 5종을 유지하면서 7종을 더해 선택 가능한 쿠키를 12종으로 만든다. 각 신규 쿠키는 전용 C등급 스톤 1개와 기본 스톤 2개로 시작한다. 신규 스톤의 물리 판정, 피해·상태 처리, 화면 연출을 하나의 확정된 발사 결과로 연결하고, 눈 지역 클리어 잠금·슬롯 보상·기존 C/B/A 등급·소모품 규칙을 유지한다.

## Decisions and boundaries

- 확정 근거: [결정 문서](../decisions/2026-11-26-twelve-cookie-roster-and-signature-stones.md).
- 신규 7종: 용감한, 딸기맛, 체리맛, 칠리맛, 에스프레소맛, 바다요정, 서리여왕. 바다요정·서리여왕은 기존 우유맛·바람궁수처럼 계정의 `snowAreaCleared` 이후 선택·슬롯 보상 해금.
- 손상 가능한 전투 경계: `shotGeometry.planShot`/`activatePlannedAbility` → `shotResolution.flightResultPayload` → `gameSession.fireShot` → `battle-engine.resolveProjectile`. 효과 피해는 클라이언트가 임의 생성한 `shotMeta`가 아니라 예약된 물리 발사에서만 확정한다.
- `fireball`은 직접 기본 피해만 2배, `spear`는 해당 발사의 전용 효과를 대체한다. 각 추가 피해는 다른 적을 실제로 맞히거나 결정 문서에 적힌 범위 조건을 충족할 때만 준다.
- 범위 밖: BGM, 관리자 맵 깊이 시범판, Azure 배포, 계정 프로필 스키마 변경, 기존 5종 전용 능력 재설계. 개발 중 해당 기능의 지정 테스트와 빌드만 확인한다. 전체 테스트는 배포 때 진행한다.
- 계획 단계는 `.memory/` 문서만 작성한다. 구현·테스트 실행·커밋은 후속 `/memory-execute`의 각 Task에서 수행한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 7종 캐릭터 자산, 12종 명단, 스톤 카탈로그와 해금·슬롯 연결 | [P01](../phases/2026-11-26-twelve-cookie-roster-and-signature-stones/P01-roster-and-catalog/phase.md) |
| P02 | `in_progress` | 신규 스톤 7종의 경로·충돌·피해·상태를 예약 발사와 일치시킴 | [P02](../phases/2026-11-26-twelve-cookie-roster-and-signature-stones/P02-stone-combat/phase.md) |
| P03 | `pending` | 선택·HUD·발사 연출 연결과 통합 검증 | [P03](../phases/2026-11-26-twelve-cookie-roster-and-signature-stones/P03-presentation-and-verification/phase.md) |

## Delivery sequence

1. P01은 이미지 참조와 ID·보상 모델을 먼저 확정해 뒤의 Task가 같은 ID를 사용하게 한다.
2. P02는 경로와 충돌 판정에 가까운 효과부터 차례로 더한다. 매 Task는 자신의 효과가 실제 충돌에만 반응하는지 지정 테스트로 검증한다.
3. P03은 이미 확정된 물리 이벤트를 화면에 표시한다. 마지막 Task는 신규 12종 선택·잠금·슬롯·발사 흐름과 기존 규칙의 회귀를 제한된 검증으로 확인한다.
