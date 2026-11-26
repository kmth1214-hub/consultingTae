# Task: T03 눈·도시 적 수와 이동 배치

## Status: pending

## Goal

눈 일반전을 3·4마리, 도시 일반전을 5·6마리로 줄이고 이동 눈덩이·까마귀 높이·받침을 실제 충돌 위치와 맞춘다.

## Decision Summary

- 기존 seed 기반 전장과 patrolX를 사용한다. 움직임은 새 kind를 만들지 않고 slot의 patrol 메타데이터로 나타낸다. 고정 눈덩이와 지상 로봇만 받침에 올린다.
- 선행 작업은 T02-stone-rack-interface이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `assets/js/battle-engine.js` :: `REGULAR_COUNTS`, `createRoundEnemies` — modify
  - `src/game/battlefieldModel.js` :: `buildBattlefield`, `riderCount` — modify
  - `src/game/battlefieldPlacement.js` :: `isPlayableBattlefield`, `buildPlayableBattlefield` — modify
  - `src/components/MonsterGroup.jsx` :: patrol renderer — modify
  - `src/components/BattleArena.jsx`, `src/components/BattlefieldMinimap.jsx` :: moving enemy presentation — modify if needed
  - `src/styles/arena.css` :: 눈덩이 미끄러짐·까마귀 방향 전환 — modify
  - `tests/battlefield-model.test.mjs`, `tests/battle-engine.test.cjs`, `tests/shot-geometry.test.mjs`, `tests/e2e/regional-elevated.spec.cjs`, `tests/e2e/city-crow.spec.cjs` — modify
  - `tests/e2e/snow-city-pacing.spec.cjs` — new

#### Details

- **Signatures & Types**

```typescript
// Preserve existing buildBattlefield/buildPlayableBattlefield signatures.
type Patrol = { centerX: number; range: number; periodMs: number; phase: number };
type EnemySlot = ExistingEnemySlot & { patrol?: Patrol; movement?: 'slide' | 'fly' };
```

- **Data & Schema Fields**

- snow round1 kinds는 dry-ice 1 + snowball 2이며 마지막 snowball 1개에 slide patrol을 준다. round2는 dry-ice 1 + snowball 3이며 1마리를 기존 얼음 받침에 올린다.
- city round1은 robot 4 + crow 1, round2는 robot 4 + crow 2. 종별 index로 공중 높이를 정해 round2 까마귀가 같은 y에 놓이지 않게 한다.
- slide range=75*worldScale, periodMs=3000, phase=seed RNG. y와 충돌 중심 높이는 기존 지상 값이다. 까마귀는 기존 range/period 규칙, 높이는 groundY-240 및 groundY-320을 사용한다.
- 새 영구 런 필드는 없다. 보스/혼돈 적 수와 종류는 이 Task에서 변경하지 않는다.

- **Execution Flow / Logic**

1. 엔진의 적 수·종 구성을 갱신하고 ID 생성 형식은 유지한다. 일반 몬스터 HP=4와 반격 범위를 유지한다.
2. buildBattlefield에서 종별 인덱스로 이동 슬롯을 결정한다. 이동 눈덩이의 순찰 전체 폭을 장애물/다른 적 배치 제외 영역에 포함한다. 받침 선정에서는 patrol 슬롯을 제외한다.
3. 기존 시간 기준 patrolX와 findPatrolContact를 사용한다. MonsterGroup은 실제 x 이동을 공유하고 movement별 몸체 동작만 달리한다. 파도에서 공중 여부를 patrol 존재로 판단하던 `withTravelingAbility`는 movement='fly'로 판별하도록 수정해 지상 눈덩이가 파도 대상에서 빠지지 않게 한다.
4. isPlayableBattlefield의 경로 확인은 이동 눈덩이와 까마귀를 같은 시간 기준으로 검사한다. 각 순찰의 대표 4개 phase 중 최소 한 시점에서 기본 스톤으로 도달 가능한 경로를 검증한다. seed 반복 시 동일 배치, 무한 재시도 방지 32회와 검증된 fallback을 유지한다.
5. 눈 보스전에서는 사탕이 실제로 닿을 수 있는 얼음 최소 1개를 보장한다. 눈 round2의 받침 낙하 1~3과 얼음 방어 .5는 기존 경로를 따른다. 렌더/미니맵과 물리의 서로 다른 이동 속도를 만들지 않는다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 정확한 적 수/까마귀 수/서로 다른 높이, slide 순찰 bounds와 실제 명중, 지상 파도 적중, 받침 선정에서 이동 적 제외, 첫 눈 보스 얼음 접근, 여러 seed의 겹침·도달 가능성, 기존 숲/혼돈 및 도시 추가 크기 시범판을 검사한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [ ] 눈 3·4, 도시 5·6마리가 실제 전투와 관리자에서 동일하다.
- [ ] 눈덩이와 까마귀의 표시 위치에서만 실제 충돌한다.
- [ ] 눈 round2 낙하와 얼음 보호가 함께 동작한다.

## Validation

- `node --test tests/battle-engine.test.cjs tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/snow-city-pacing.spec.cjs tests/e2e/city-crow.spec.cjs tests/e2e/regional-elevated.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.

## Commit Message

```text
feat(battle): 눈 도시 전투 인원과 이동 배치 개선

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T03-snow-city-encounters

- 눈 일반전을 3·4마리, 도시 일반전을 5·6마리로 줄이고 이동 눈덩이·까마귀 높이·받침을 실제 충돌 위치와 맞춘다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
