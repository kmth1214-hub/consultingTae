# Task: T04 체리맛 폭탄 설치와 지연 폭발

## Status: done

## Goal

체리맛 스톤은 비행 중 클릭·Space로 폭탄을 한 개 떨어뜨리고 원래 스톤은 계속 날아가게 한다. 직접 입력이 없으면 첫 적·장애물 접촉 때 자동 설치하며, 바닥에 닿았을 때에는 0.5초 입력 기회 뒤 자동 설치한다.

## Decision Summary

- 폭탄은 설치 0.35초 후 그 위치에서 폭발한다. C/B/A 반경 150/180/210 안의 가장 가까운 살아 있는 적 최대 2명에게 각각 고정 피해 1.
- 한 발에서 폭탄은 한 번만 설치된다. 직접 기본 피해와 폭탄 피해는 별개이며 같은 적에게 중복 추가 피해가 없도록 접촉 순서를 기록한다.
- 창이면 폭탄 능력을 대체하고, 불공은 폭탄의 고정 피해를 2배로 만들지 않는다.

## Implementation

### I01. 능력 발동과 원래 비행 유지

- Related Files:
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`에 `cherry-bomb-stone` → `abilityKindPending:'cherry-bomb'`; `activatePhysicalFlight`, `flightResultPayload`; modify.
  - `src/game/shotGeometry.js` :: `activatePlannedAbility`의 새 `cherry-bomb` 분기; modify.
  - `src/game/gameSession.js` :: `activatePendingAbility`, `fireShot`의 유효 메타 검증; modify.
  - `src/components/BattleArena.jsx` :: 기존 click·Space·`onProgress` 발동 경로가 새 kind도 처리하는지 필요한 부분만 modify.
  - `tests/shot-resolution.test.mjs`, `tests/game-session.test.mjs` :: 수동·자동 발동; modify.

#### Details

- **Signatures & Types**:
  ```typescript
  type CherryBomb = {kind:'cherry-bomb'; plantedAt:number; explodeAt:number;
    point:{x:number;y:number}; radius:150|180|210; targetIds:string[]};
  // activatePlannedAbility({baseFlight,layout,enemies,kind:'cherry-bomb',time,grade,source}) -> FlightSolution|null
  ```
- **Data & Schema Fields**: `FlightSolution.bomb:CherryBomb|null`, `FlightSolution.abilityActivation`에 설치 시점·좌표·입력 출처 기록. `shotMeta.abilityContacts`에는 폭발 시점의 1개 contact만 넣는다. 원래 `path`, `hitIds`, `impactKind`, `contacts`를 설치 시점에서 자르지 않는다.
- **Execution Flow / Logic**:
  1. 발사 시작 시 기존 마법사/연금술사와 같은 첫 contact deadline 및 바닥 후 0.5초 deadline을 계산한다. `activatePendingAbility`의 한 번 발동/샷 ID 검사 그대로 적용한다.
  2. 수동 설치는 그 시뮬레이션 시간에 `sampleAtTime`한 스톤 좌표에 폭탄을 놓는다. 첫 contact 자동 설치는 contact 좌표, 착지 후 자동 설치는 마지막 바닥 좌표를 쓴다.
  3. 폭탄은 설치점에서 0.35초 대기 후 같은 좌표에서 폭발한다. 폭발 시각의 실제 적 위치(순찰/낙하 포함)까지 거리 ≤ `radius + collider.radius`인 살아 있는 적을 거리·ID 순서로 최대 2명 기록한다. 기본 스톤이 그때 어디에 있는지는 유지한다.
  4. `simulationSeconds`/`durationMs`는 원래 스톤의 마지막 결과와 폭탄 폭발 시점 중 큰 값이다. 발사 결과 확정은 둘 다 재생된 뒤 한 번만 한다.
- **Error & Exception Handling**: 시작 이전/기한 이후 입력은 기존 `invalid-state`; 중복 클릭은 두 번째 폭탄을 만들지 않는다. 폭탄 폭발 전에 라운드가 끝난 것으로 처리하지 않는다.

### I02. 폭발 피해와 위조 방지

- Related Files:
  - `assets/js/battle-engine.js` :: `resolveProjectile` timeline에 폭발 고정 피해 1 추가; modify.
  - `src/game/gameSession.js` :: `fireShot`의 `validAbilityContacts`를 예약된 폭탄 좌표·시각·반경·대상 목록과 비교; modify.
  - `tests/shot-hit-integrity.test.mjs`, `tests/battle-engine.test.cjs` :: 반경·명중·중복 검증; modify.

#### Details

- 직접 스톤 피해와 폭탄 피해는 시각 순서대로 확정한다. 폭발 대상은 그 시각 살아 있을 때만 `min(hp,1)` 차감한다. 같은 폭발에서 한 적은 한 번만 맞으며, 이전 직접 명중은 별도 접촉이므로 허용한다. 점수는 실제 제거 HP × 기존 등급 배율.
- 발사 중 `shotMeta`를 꾸며 적 ID를 더해도 예약된 `pendingShot.flight.bomb`이 허용한 대상만 확정된다. `fireShot`의 메타 없는 내부/기존 호출 계약은 유지한다.

## Acceptance Criteria

- [ ] 수동·자동 설치 위치가 실제 스톤 접촉점과 맞고 원래 스톤이 계속 비행한다.
- [ ] 폭탄은 한 발당 1개, 0.35초 후 폭발, 최대 2명에게만 고정 피해 1.
- [ ] 샷 판정과 연출을 모두 마친 뒤 단 한 번 적 반격으로 넘어간다.
- [ ] 창·불공 조합 및 위조된 대상 목록이 규칙을 깨지 않는다.

## Validation

- `node --test tests/shot-resolution.test.mjs tests/game-session.test.mjs tests/shot-hit-integrity.test.mjs tests/battle-engine.test.cjs` — 입력·시간·대상·피해 검증.
- `npm.cmd run build` — 번들 확인.

## Commit Message

```text
feat(combat): 체리맛 스톤의 설치형 폭탄 구현

Plan: 2026-11-26-twelve-cookie-roster-and-signature-stones
Phase: P02-stone-combat
Task: T04-cherry-delayed-bomb

- 수동·자동 설치 후 원래 스톤 비행을 유지
- 지연 폭발의 실제 범위 피해와 중복 발동 차단
```

## Progress

- [x] 구현 완료
- [x] 지정 검증 통과
- commit: 이 문서를 포함한 Task 커밋
