# Task: T05 에스프레소 소용돌이와 지속되는 적 위치

## Status: pending

## Goal

에스프레소 스톤의 수동·자동 소용돌이가 살아 있는 일반 적을 실제로 끌어당긴다. 이동한 위치를 남은 발사 충돌과 다음 발사·미니맵에도 유지하고, 이동 자체로 피해를 주지 않는다.

## Decision Summary

- 비행 중 클릭·Space로 현재 스톤 위치에 0.7초 소용돌이. C/B/A 반경 170/210/250, 최대 이동 60/80/100, 최대 대상 2/2/3명.
- 직접 입력 전 첫 적·장애물 접촉 시 자동 발동. 바닥 착지 후 0.5초 입력 기회가 끝나면 자동 발동. 한 발에 한 번.
- 보스는 이동하지 않는다. 지상 적은 지상 Y 유지, 공중 순찰 적은 순찰 중심 이동, 받침 위 적이 받침에서 벗어나면 기존 낙하 규칙. 적·장애물·맵 경계와 겹치지 않는다.
- 창은 능력을 대체한다. 불공은 소용돌이에 추가 피해를 만들지 않는다.

## Implementation

### I01. 발동 위치·대상·이동 경로 확정

- Related Files:
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`의 `abilityKindPending:'vortex'`, `activatePhysicalFlight`, `flightResultPayload`; modify.
  - `src/game/shotGeometry.js` :: `activatePlannedAbility`의 `vortex` 분기, 이동 후 발사 경로 재충돌; modify.
  - `src/game/battlefieldModel.js` :: `buildBattlefield`에 라운드 내 적 위치 보정 입력; modify.
  - `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield`로 위치 보정 전달 및 플레이 가능 위치 검증; modify.
  - `tests/shot-resolution.test.mjs`, `tests/shot-geometry.test.mjs` :: 당김과 충돌 재계산; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type EnemyPositionOverride = {x:number; y:number; patrolCenterX?:number};
  type VortexMove = {enemyId:string; from:{x:number;y:number}; to:{x:number;y:number};
    startTime:number; endTime:number; supportLost:boolean};
  type VortexEvent = {kind:'vortex'; time:number; duration:0.7; point:{x:number;y:number};
    radius:170|210|250; maxDisplacement:60|80|100; moves:VortexMove[]};
  // buildBattlefield({...,enemyPositionOverrides?:Record<string,EnemyPositionOverride>}) -> BattlefieldLayout
  ```
- **Data & Schema Fields**: `RunState.enemyPositionOverrides`는 현재 라운드 내 살아 있는 적 ID → 월드 좌표 보정 맵. 받침 낙하 결과용 기존 `enemyLandingPositions`와 별개이며 적용 순서는 기본 배치 → 받침 낙하 → 소용돌이 보정. 프로필 DB에는 저장하지 않는다.
- **Execution Flow / Logic**:
  1. 기존 `activatePendingAbility`의 샷 ID·한 번 발동·첫 contact deadline 검사를 재사용한다. 능력 시점의 스톤 좌표를 소용돌이 중심으로 고정한다.
  2. 해당 시각의 적 위치를 계산해 반경 안의 살아 있는 일반 적을 거리·ID 오름차순으로 최대 2/2/3명 고른다. 보스는 후보에서 제외한다.
  3. 각 대상은 중심 쪽으로 최대 이동 거리만큼 0.7초 동안 이동하되, X는 맵 0..width 내부, 지상 Y는 groundY, 비행 적의 Y/순찰 중심은 현 높이를 유지한다. 적 collider끼리·서 있는 장애물 collider와 겹치면 충돌 직전의 마지막 유효 좌표에서 멈춘다. 이미 이동한 앞 대상의 최종 자리도 피한다.
  4. 받침 위 적이 발판 지지 폭을 벗어나면 기존 `riderMotion`/낙하 피해 규칙으로 자연스럽게 전환한다. `VortexMove` 시간 샘플을 시각 재생과 물리 충돌 계산에 함께 사용한다.
  5. 원래 스톤의 남은 경로가 이동하는 적과 실제 교차하는지 발동 시점 이후만 다시 계산한다. 발동 전 이미 확정된 직접 명중·장애물 접촉은 유지한다. 같은 적이 위치 이동만으로 타격되었다고 간주하지 않는다.
- **Error & Exception Handling**: 유효한 당김 자리가 없으면 그 대상의 `to=from`; 이동 대상 0명이어도 능력은 사용한 것으로 처리한다. 유효하지 않은 좌표·겹침이 생기면 이동을 폐기하고 피해를 추가하지 않는다.

### I02. 다음 발사까지 상태 유지

- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `resolveProjectile`, 라운드 전환의 `enemyPositionOverrides` 생성·적용·초기화; modify.
  - `src/game/gameSession.js` :: `activatePendingAbility`, `fireShot`에서 예약된 `vortex.moves`만 수락; modify.
  - `src/components/BattleArena.jsx` :: 현재 전장의 적 위치와 미니맵이 보정된 layout을 쓰도록 modify.
  - `tests/game-session.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/battle-engine.test.cjs` :: 상태 지속·위조 방지; modify.

#### Details

- `flightResultPayload`이 소용돌이 중심·등급별 수치·`moves`와 물리 이벤트 시각을 전송한다. `fireShot`은 서버처럼 예약된 `pendingShot.flight.vortex`와 정확히 대조한다. 임의의 `to` 좌표가 주어져도 run을 바꾸지 않는다.
- `resolveProjectile`은 타임라인에서 실제 이동이 끝난 적의 좌표를 `enemyPositionOverrides`에 반영한다. 그 적이 사망했으면 보정은 필요 없지만, 살아 있으면 다음 발사의 layout과 미니맵에서 같은 위치로 보여야 한다. 라운드 전환 때 맵을 비운다.
- 소용돌이에는 자체 피해·점수가 없고, 이동 뒤 스톤 또는 장애물이 실제로 충돌하면 기존 피해 규칙만 적용한다.

## Acceptance Criteria

- [ ] C/B/A별 반경·최대 이동·대상 수가 정확하며 보스는 이동하지 않는다.
- [ ] 이동 대상은 맵·물체·다른 적과 겹치지 않고 바닥/공중/받침 높이를 올바르게 처리한다.
- [ ] 이동 뒤에만 실제로 맞은 적에게 피해가 들어가고 다음 발사·미니맵까지 위치가 유지된다.
- [ ] 새 라운드는 이전 소용돌이 위치를 이어받지 않는다.
- [ ] 클릭·Space·자동 발동이 한 발에 한 번이고 임의 좌표 주입은 거절된다.

## Validation

- `node --test tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs tests/game-session.test.mjs tests/battle-engine.test.cjs` — 위치·충돌·상태 검증.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(combat): 에스프레소 소용돌이의 적 위치 이동 구현

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P02-stone-combat
Task: T05-espresso-vortex

- 등급별 소용돌이 이동과 남은 발사 충돌 재계산
- 적 위치를 다음 발사까지 유지하고 라운드 전환 때 초기화
```

## Progress

- [ ] 구현 완료
- [ ] 지정 검증 통과
- commit: pending
