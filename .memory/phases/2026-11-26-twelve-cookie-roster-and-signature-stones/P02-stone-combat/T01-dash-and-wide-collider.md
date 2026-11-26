# Task: T01 용감한 가속과 딸기맛 확장 충돌

## Status: pending

## Goal

두 자동 능력을 실제 발사 경로와 충돌 판정에 넣어 화면에서 보이는 궤적과 적·장애물 명중을 일치시킨다. 능력은 해당 전용 스톤을 장전한 발사에만 적용한다.

## Decision Summary

- 용감한: 발사 후 0.25초에 수평 속도만 C/B/A 각각 +12/+18/+24%, 추가 피해 없음.
- 딸기맛: 발사체의 실제 충돌 반경을 C/B/A 각각 기본의 1.25/1.35/1.45배. 기본 스톤·다른 전용 스톤의 반경은 그대로.
- 창을 준비한 발사에서는 두 능력 모두 사용하지 않는다. 불공은 직접 기본 피해만 2배.

## Implementation

### I01. 예약 발사의 경로와 반경

- Related Files:
  - `src/game/shotGeometry.js` :: `getBallisticPath`, `planShot`, `planStackedShot`, `findObstacleContact`, `findPatrolContact`, `appendGroundRoll` 호출 경계; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload`; modify.
  - `src/game/battlefieldModel.js` :: `getLaunchSpeed`와 `BATTLEFIELD.candyRadius` 읽기 전용.
  - `tests/shot-geometry.test.mjs`, `tests/shot-resolution.test.mjs` :: 시간/반경별 실제 명중; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type Grade = 'C'|'B'|'A';
  type ShotPhysicsModifier = { kind:'dash'; startTime:0.25; horizontalScale:1.12|1.18|1.24 }
    | { kind:'wide-collider'; radiusScale:1.25|1.35|1.45 } | null;
  // planShot({loadedCandyId, loadedCandyGrade, piercing, layout, pull, enemies, ...}) -> FlightSolution
  ```
- **Data & Schema Fields**: `FlightSolution.candyRadius:number`은 이번 발사에 실제 쓴 반경. `FlightSolution.physicsModifier`는 시각 재생을 위한 읽기 전용 값이며 피해 대상 선택의 근거는 `hitIds`와 예약된 contact stream이다. `layout.candyRadius` 자체는 바꾸지 않는다.
- **Execution Flow / Logic**:
  1. `piercing===true`면 modifier를 `null`로 한다. 아니면 `loadedCandyId`와 grade로 테이블 값을 고른다.
  2. 용감한 경로는 `t=0.25` 전의 원래 좌표·속도를 보존하고, 그 시점 이후의 수평 속도에만 배수를 적용해 연속적인 경로를 적분한다. 역발사면 속도 부호도 유지한다. 바람 구간의 힘, 땅 접촉·맵 바깥 종료 규칙은 기존과 동일하게 처리한다.
  3. 딸기맛은 실제 충돌 조회 함수 전부에 확대된 `candyRadius`를 동일하게 전달한다. 적·순찰 중 적·움직이는 받침 위 적·장애물·바닥·굴림 경계에 다른 반경이 섞이지 않게 한다. 굴림 거리의 지름 5배 기준도 이번 발사의 반경을 따른다.
  4. 미리보기 `previewD`, `path.samples`, `impactDistance`, `hitIds`, `directHitTime`을 동일한 수정 경로에서 계산한다. 경로 밖 적에게 관성처럼 피해를 주지 않는다.
- **Error & Exception Handling**: 알 수 없는 grade/stone은 기본 물리로 처리한다. 반경·배율은 양수 유한수만 사용한다. 경계 밖으로 나간 발사는 기존 `bounds` 빗나감 처리를 유지한다.

### I02. 스톤 소비와 계약

- Related Files:
  - `assets/js/battle-engine.js` :: `resolveProjectile`의 기존 grade별 기본 피해를 재사용하고 별도 추가 피해를 만들지 않음; 필요시 modify.
  - `src/game/gameSession.js` :: `fireShot`의 예약 발사만 수락하는 계약 유지; 필요시 modify.
  - `tests/shot-hit-integrity.test.mjs` :: 큰 시각 반경과 실제 피해의 일치; modify.

#### Details

- 새 메타 필드를 UI에서 직접 넣어도 `fireShot`은 예약된 `pendingShot.flight` 값을 사용한다. `shotMeta`의 무검증 modifier로 피해 범위를 넓힐 수 없게 한다.
- 검증은 같은 pull·seed·적 배치에서 C/B/A 각각 `t=0.25` 전 경로 동일, 이후 수평 거리 증가, 반경 경계 안/밖의 몬스터만 명중, 창 선택 시 두 효과 비활성을 포함한다.

## Acceptance Criteria

- [ ] 용감한 스톤은 0.25초 이후 등급에 맞게 수평 이동하며 경로가 끊기지 않는다.
- [ ] 딸기맛 스톤의 보이는 크기·충돌 반경·땅 굴림이 같은 배율을 쓴다.
- [ ] 큰 반경이나 가속으로 실제 닿지 않은 적은 피해를 입지 않는다.
- [ ] 기본 스톤과 창 발사의 기존 물리가 유지된다.

## Validation

- `node --test tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs` — 경로·실제 접촉·예약 결과 검증.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(combat): 용감한 가속과 딸기맛 충돌 반경 적용

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P02-stone-combat
Task: T01-dash-and-wide-collider

- 등급별 속도와 충돌 반경을 실제 발사 계산에 반영
- 창 대체와 경계 밖 빗나감 판정 검증
```

## Progress

- [ ] 구현 완료
- [ ] 지정 검증 통과
- commit: pending
