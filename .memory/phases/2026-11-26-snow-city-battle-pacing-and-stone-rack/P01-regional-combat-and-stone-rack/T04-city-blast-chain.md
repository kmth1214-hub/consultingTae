# Task: T04 도시 상자의 범위 폭발과 연쇄

## Status: pending

## Goal

도시 상자가 폭발 순간의 주변 적에게만 피해를 주고, 범위 안 상자가 순서대로 한 번씩 터진다.

## Decision Summary

- 폭발 위치·시각·대상은 예약된 발사 계산이 확정한다. 물체 직접 충돌과 폭발 전파를 한 번만 처리하며 혼돈의 전체 대상 무작위 폭발은 기존 경로를 사용한다.
- 선행 작업은 T03-snow-city-encounters이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `src/game/shotGeometry.js` :: `planStackedShot`, `activate`, `advanceChains`, `enemyCenterAt` — modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `activatePhysicalFlight`, `flightResultPayload` — modify
  - `src/game/gameSession.js` :: `fireShot`의 validContacts/예약 결과 검증 — modify
  - `assets/js/battle-engine.js` :: `resolveProjectile`, `applyObstacle`, `burst` — modify
  - `src/game/battlefieldModel.js`, `src/game/battlefieldPlacement.js` :: 도시 round2 연쇄 쌍 배치 검증 — modify
  - `src/components/ObstacleRegionalEffects.jsx` :: `CityGroundBursts`; `src/components/BattleArena.jsx` :: 효과 재생 — modify
  - `tests/city-blast-chain.test.mjs` — new
  - `tests/e2e/obstacle-chain.spec.cjs`, `tests/e2e/regional-obstacle-effects.spec.cjs` — modify

#### Details

- **Signatures & Types**

```typescript
type CityBlast = { obstacleId: string; point: { x: number; y: number }; time: number; radius: 420; targetIds: string[] };
type ObstacleContact = ExistingObstacleContact & { trigger?: 'candy' | 'obstacle' | 'blast'; blast?: CityBlast };
// flightResultPayload must preserve blast, and strip only heavy motion samples as before.
```

- **Data & Schema Fields**

- 도시 crate 접촉의 blast.time=접촉 time, point=그 순간 물체 중심. 전파 지연은 부모 폭발 후 0.18초, radius=420 월드 단위로 worldScale에 다시 곱하지 않는다.
- trigger='blast'면 sourceObstacleId는 먼저 폭발한 부모 ID, chainDepth=부모+1. time은 부모보다 크고 distance는 부모 이후 현재 candy 누적 거리로 비감소 유지한다.
- 한 contact의 blast.targetIds는 고유 ID 배열, 해당 시각 실제 collider와 원이 겹친 적만 담는다. 판정에 riderMotion/vortexMoves/patrol의 같은 timestamp를 사용한다.
- event.obstacleEffects의 도시 jar-burst 결과에 point/time/radius를 보존해 화면이 전체 맵으로 연출하지 않게 한다.

- **Execution Flow / Logic**

1. 도시 crate가 활성화될 때 접촉 시각 물체 pose를 얻고 폭발을 예약한다. 살아 있는 적의 collider와 원의 거리가 radius+collider.radius 이하인지 계산한다. 상자 영역은 그 순간 polygon/pose와 원이 겹치는지 계산한다.
2. 물체 운동에서 생긴 obstacleHits와 폭발 전파를 동일 시간순 pending 목록으로 합친다. 이미 활성화/소진된 상자는 재예약하지 않는다. 같은 시간에는 obstacleId로 안정 정렬한다. 전파는 물체 수 이하에서 종료하고 손상된 순환 데이터는 실패로 반환한다.
3. 체인 처리로 바닥 낙하한 적과 날아가는 물체의 위치를 이후 충돌에 반영한다. 연쇄로 먼저 쓰러진 상자에 사탕이 나중에 닿았다고 에너지를 다시 잃지 않도록 기존 재계산 경로를 유지한다. 전체 simulationSeconds는 마지막 폭발/낙하까지 확장한다.
4. session 검증은 blast의 유한 좌표, radius=420, 부모 시간·종류·대상 ID와 고유성을 검사한다. 외부 호출이 만든 targetIds는 채택하지 않고 pendingShot의 최종 결과만 엔진에 보낸다. 마법사/체리/연금술사 재계산 후에도 이미 처리한 전파가 중복되지 않는다.
5. 엔진은 도시에서 blast.targetIds의 그 시점 생존 적만 각각 1~2 피해로 처리한다. 서로 다른 폭발에 같은 적이 맞는 것은 허용하되 같은 상자 한 번만, 실제 제거 HP만 점수로 더한다. 혼돈 jar-burst는 기존 전체 적 루프를 사용한다.
6. 도시 round2에는 거리가 420 이내인 서로 다른 상자 2개를 seed 기반으로 배치한다. 적과 겹치지 않고 최소 한 상자를 기본탄으로 직접 맞힐 수 있는지 배치 검증에 포함한다. 기존 physical chain도 허용한다.
7. CityGroundBursts는 해당 폭발 중심과 반경 안에서 작은 지면 폭발을 연달아 보여준다. 실제 폭발 이벤트 시간에 맞춰 1회 재생하고 reduced-motion에서는 정지 원/섬광으로 표시한다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 바깥 적 무피해, 경계 collider 교차, 공중 까마귀가 그때 들어오거나 벗어나는 경우, 이동 눈덩이 helper와 낙하 위치, 상자 전파 A→B→C와 A/B 동시 충돌, 같은 적 중복 폭발, 이미 깨진 상자, 마지막 탄 클리어, 숨김 탭과 재시도 1회 커밋, 혼돈 기존 전체 피해 유지 등을 검사한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [ ] 도시 폭발 범위 밖 적은 피해와 점수를 만들지 않는다.
- [ ] 전파/물체 충돌이 겹쳐도 상자는 한 번만 폭발한다.
- [ ] 도시 round2에 실제로 시작 가능한 연쇄 쌍이 존재한다.

## Validation

- `node --test tests/city-blast-chain.test.mjs tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs tests/chaos-obstacle-feedback.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/obstacle-chain.spec.cjs tests/e2e/regional-obstacle-effects.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.

## Commit Message

```text
feat(combat): 도시 상자 범위 피해와 폭발 전파 구현

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T04-city-blast-chain

- 도시 상자가 폭발 순간의 주변 적에게만 피해를 주고, 범위 안 상자가 순서대로 한 번씩 터진다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
