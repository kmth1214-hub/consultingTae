# Task: T03 서리여왕 빙결과 적 반격 건너뛰기

## Status: done

## Goal

서리 스톤이 실제로 직접 맞힌 적과 등급별 주변 적을 얼리고, 각 적의 다음 반격 차례를 한 번씩 건너뛰게 한다. 빙결 자체에는 피해를 추가하지 않는다.

## Decision Summary

- C는 직접 맞힌 1명, B는 그 적과 반경 180의 가장 가까운 적 1명, A는 반경 240의 가장 가까운 적 2명을 얼린다.
- 같은 적에게 중첩하지 않고, 얼어 있는 적의 다음 자기 차례가 끝나면 해제한다. 보스에도 한 번 적용된다. 라운드가 끝나면 모두 해제한다.
- 창을 준비하면 빙결은 발동하지 않는다. 불공은 직접 기본 피해만 2배.

## Implementation

### I01. 물리적으로 가까운 대상 결정

- Related Files:
  - `src/game/shotGeometry.js` :: `planShot`의 직접 명중 좌표와 `layout.enemies` 위치 선택; modify.
  - `src/game/shotResolution.js` :: `flightResultPayload`의 `abilityContacts`; modify.
  - `src/game/gameSession.js` :: `fireShot`의 메타 검증; modify.
  - `tests/shot-resolution.test.mjs`, `tests/shot-hit-integrity.test.mjs` :: 대상 거리/위조 차단; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type FreezeContact = {kind:'freeze'; time:number; point:{x:number;y:number};
    sourceId:string; targetIds:string[]; radius:0|180|240};
  // shotMeta.abilityContacts includes only the canonical FreezeContact for this shot.
  ```
- **Data & Schema Fields**: `sourceId`는 직접 명중 enemy ID. `targetIds` 첫 값은 직접 명중 enemy, 나머지는 접촉 시간의 실제 collider 중심과 직접 대상 중심 사이 거리로 정렬한다. 거리가 같으면 enemy ID 순서로 고정한다. 살아 있는 적만 후보이며 C/B/A 대상 상한은 1/2/3.
- **Execution Flow / Logic**: 창이 아니고 `loadedCandyId==='frost-stone'`이며 첫 적 직접 명중이 있을 때만 FreezeContact를 만든다. 장애물·바닥만 맞거나 직접 대상이 없는 경우에는 만들지 않는다. 예약된 `pendingShot.flight`의 contact와 ID·시간·반경이 일치할 때만 `fireShot`에서 받아들인다.
- **Error & Exception Handling**: 이미 죽은 적은 엔진에서 얼리지 않는다. 추가 대상은 현재 살아 있어도 지형의 실제 위치가 반경 밖이면 넣지 않는다. 외부가 추가 `targetIds`를 주어도 피해/빙결이 늘지 않는다.

### I02. 엔진 상태와 반격 소비

- Related Files:
  - `assets/js/battle-engine.js` :: `resolveProjectile` timeline, `resolveEnemyTurn`, `createRoundEnemies`, 라운드 전환 초기화; modify.
  - `tests/battle-engine.test.cjs`, `tests/game-session.test.mjs` :: 빙결 상태·반격·해제 검증; modify.

#### Details

- **Data & Schema Fields**: `Enemy.frozenNextAttack:boolean` 기본 `false`. 이 필드는 `run.enemies`에 저장하며 계정 프로필·리더보드에 저장하지 않는다. 빙결 표시는 `event.frozenEnemyIds:string[]`와 `enemy.frozenNextAttack`을 통해 UI가 읽는다.
- **Execution Flow / Logic**:
  1. `resolveProjectile`의 직접 피해 이후, 적 반격 결정 전 `FreezeContact.targetIds` 중 살아 있는 적에게 `frozenNextAttack=true`를 설정한다. 이미 `true`인 적은 기간을 늘리지 않는다.
  2. `resolveEnemyTurn`은 기존 `enemyTurnIndex` 순환으로 선택한 적이 `frozenNextAttack`이면 그 적의 `attackCount`/특수기 주기를 늘리지 않고 플래그를 `false`로 바꾼 뒤 `damage:0`, `special:null`, `frozenSkip:true`인 응답을 반환한다. 플레이어 HP·방어 소모품·우유 보호막에는 영향이 없다. 한 턴에 다음 적을 추가로 고르지 않는다.
  3. 다른 적의 반격 순서와 기존 미끄러짐/빗나감 확률은 유지한다. 라운드 새 적 생성·보스 분리 등에서 오래된 빙결 플래그가 새 적으로 넘어가지 않게 한다.
- **Error & Exception Handling**: 빙결 대상이 같은 발사에서 사망하면 반격 차례가 없으므로 상태를 남기지 않는다. 최종 적 사망 시 라운드 클리어가 우선이고 반격을 만들지 않는다.

## Acceptance Criteria

- [ ] C/B/A의 대상 수와 거리가 실제 위치 기준으로 정확하다.
- [ ] 얼어 있는 적은 자신의 다음 반격 한 번만 건너뛰고 해제된다.
- [ ] 특수기, 보스 분리, 다른 적의 턴, 보호막 소모가 잘못 진행되지 않는다.
- [ ] 빙결만으로 HP·점수는 변하지 않는다.

## Validation

- `node --test tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs tests/battle-engine.test.cjs tests/game-session.test.mjs` — 거리·상태·반격 검증.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(combat): 서리 스톤의 일회성 빙결 반격 구현

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P02-stone-combat
Task: T03-frost-freeze-turn

- 실제 명중 위치를 기준으로 등급별 빙결 대상 선정
- 얼어 있는 적의 다음 반격 한 번만 건너뛰기
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
