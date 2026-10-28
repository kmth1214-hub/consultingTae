# Task: T02 받침 위 몬스터 낙하와 실충돌

## Status: pending

## Goal

통나무가 실제로 쓰러질 때 위에 선 몬스터가 통나무 진행 방향으로 포물선 낙하한다. 사탕은 낙하 중 움직이는 몸에 실제로 맞을 수 있고, 착지 시 받침 높이에 따라 1~3의 피해가 한 번 발생한다. 살아남은 적의 새 지면 위치를 같은 라운드의 다음 발사와 반격에 유지한다.

## Decision Summary

- 받침 탑승자는 **낙하 피해만** 받는다. 같은 받침의 기존 통나무 강타 3을 중복으로 받지 않는다. 통나무가 별도의 적을 실제로 때렸을 때만 그 적에게 기존 3 피해를 적용한다.
- 떨어진 적이 다른 적에 닿아도 아래 적에게 낙하 피해를 주지 않는다. 살아 있는 적의 체력·점수만 실제 제거량으로 갱신한다.

## Implementation

### I01. 결정적 낙하 경로와 동적 충돌

- Related Files:
  - `src/game/forestLogPhysics.js` :: `simulateObstacleMotion`, `sampleLogMotion` — 받침 motion과 같은 시간축의 rider path 계산·샘플; modify.
  - `src/game/shotGeometry.js` :: `planStackedShot`, `planShot`, `circleContact` — log 접촉 시 rider path 생성 및 시간별 사탕/적 swept 충돌; modify.
  - `src/game/battlefieldModel.js` :: `buildBattlefield` — 다음 발사 시 낙하 후 위치 override; modify.
  - `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield` — override 전달; modify.

#### Signatures & Types

- `simulateRiderFall({supportMotion, riderSlot, layout, startTime}): RiderMotion|null`을 `forestLogPhysics.js`에서 export한다. `RiderMotion = {enemyId:string, supportObstacleId:string, startTime:number, durationSeconds:number, samples:{time:number,x:number,y:number}[], landing:{x:number,y:900}, fallDamage:1|2|3}`. `samples.time`은 낙하 시작 이후 상대 시간, 공개 이벤트의 착지 시각은 `startTime + durationSeconds`.
- 높이→피해 매핑은 `low=1`, `medium=2`, `high=3`; 높이가 누락되거나 다른 값이면 낙하 이벤트를 만들지 않는다. 몬스터 y는 발 위치, collider 중심은 `y - size*.52`를 모든 샘플에 적용한다.
- `ShotContact`의 log 전용 `riderMotion?:RiderMotion`과 물리 해석 결과 `riderHits?:{id:string,time:number,point:{x,y}}[]`는 선택 필드다. `logHit`은 **탑승자를 제외한** 실제 통나무 타격 적만 가리킨다.
- `run.enemyLandingPositions?:Record<enemyId,{x:number,y:900}>`는 낙하 완료 후 살아 있는 적의 월드 발 위치를 저장한다. `buildBattlefield`의 선택적 `enemyLandingPositions`는 같은 적 ID의 x/y/collider만 교체한다. 새 라운드에서는 비우고, 일반 run에서는 사용하지 않는다.

#### Execution Flow / Logic

1. 활성 log에 `supportsEnemyId`가 있고 탑승자가 살아 있으면 `simulateObstacleMotion`에 그 적을 log 충돌 후보로 전달하지 않는다. log의 속도·회전 방향과 받침 높이로 탑승자의 출발 위치와 초기 횡속도를 정한다. 1/240초 단위로 x/y를 적분하고 바닥 y=900에 닿을 때까지 샘플을 만든다. 월드 경계를 넘지 않도록 x를 적 크기 반폭 안에 제한한다.
2. `planStackedShot`은 log motion이 시작된 뒤 해당 탑승 적의 정적 원형 collider를 더는 사용하지 않는다. 각 사탕 세그먼트 샘플 시간과 낙하 샘플 시간을 맞춰 두 이동 원의 선분 swept 충돌을 찾는다. 낙하 전에는 원래 높은 collider, 낙하 완료 후에는 landing collider를 사용한다. 첫 충돌 규칙, 창 최대 3 관통 규칙, 연쇄 log 순서와 `directHitTime`은 실제 시각순으로 유지한다.
3. log motion 자체의 `hit`은 탑승자를 제외한 다른 적만 검사한다. 낙하 중 적을 통나무가 중복으로 쳐도 같은 적의 물리 이벤트를 두 번 만들지 않는다. 사탕이 탑승 적에 먼저 직접 닿아 죽인 경우에도 낙하 경로의 시각화는 가능하지만 착지 피해/추가 점수는 없다.
4. `simulationSeconds`를 사탕·연쇄 장애물·탑승자 착지 중 최댓값으로 설정한다. `durationMs`와 재생/결과 커밋의 완료 시각도 그 값을 따른다.
5. 샷이 끝난 후 `enemyLandingPositions[id]`를 저장한다. 이후 `preparePhysicalFlight`와 `BattleArena`가 동일 위치 override를 배치 모델에 주어 다음 사탕·적 반격·미니맵에 같은 위치를 쓴다. 넘어진 받침은 기존 `toppledObstacleIds`로 비활성화한다.

#### Error / State

- 죽은 적에게 낙하 피해·영속 위치 갱신을 하지 않는다. 받침이 이미 넘어졌거나 `supportsEnemyId`가 없으면 낙하 이벤트를 재생성하지 않는다. 난수는 낙하 경로·피해에 사용하지 않는다.
- 경로가 무효이거나 시간 역전/NaN이면 물리 결과를 거부하고 기존 shot 예약을 취소한다. `enemyLandingPositions`를 임의 payload로 받지 않고 예약된 물리 flight로만 산출한다.

### I02. 예약된 접촉 결과의 전투 정산

- Related Files:
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload` — rider 접촉·착지 시각/위치 전달; modify.
  - `src/game/gameSession.js` :: `fireShot` — 새 metadata의 타입/ID/시간/높이 검증과 pending flight 동일성; modify.
  - `assets/js/battle-engine.js` :: `createRunState`, `resolveProjectile`, `advanceRound` — 착지 damage와 영속 위치의 시간순 적용·초기화; modify.
  - `tests/forest-log-physics.test.mjs`, `tests/shot-geometry.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/battle-engine.test.cjs` — 실제·허위 낙하 경로 및 점수; modify.

#### Details

- `flightResultPayload`은 샘플 수천 개를 엔진에 복사하지 말고 검증된 예약 flight에서 `enemyId`, `supportObstacleId`, `startTime`, `landingTime`, `landing`, `fallDamage`, 실제 candy `riderHits`만 추린다. `fireShot`은 caller 제공 metadata가 아닌 `pendingShot.flight`에서 payload를 다시 만들고, 숲 시범판·유효한 log 접촉·유일한 적 ID·시간순·피해 1~3·유한한 월드 좌표를 검증한다.
- `resolveProjectile`의 기존 `contacts`→`logHit`→`directHitTime` timeline에 착지 이벤트를 추가한다. 동시각 우선순위: 장애물 활성화 → 통나무의 별도 적 충돌 → 사탕 직접 충돌 → 착지 피해. 실제 도착 순서가 다르면 시각순이 우선이다. 각 이벤트는 살아 있는 적에게만 HP를 깎고 `scoreDelta`는 실제 제거 HP에 기존 등급 배수를 적용한다. 착지 피해는 사탕 직접 명중·상시 세 번째 카운터를 올리지 않는다.
- 착지 위치는 살아 있던 적에게만 기록한다. `event.hits`에는 낙하 피해를 별도 원인으로 표기해 화면이 원인을 구별하게 하되 결과 총점은 한 번만 더한다. 라운드 전환 시 위치 map을 초기화한다.
- 검증: 받침 높이 3종 피해, 낙하 중 사탕 충돌, 사탕보다 먼저 사망, 다른 몬스터 위 착지, 다른 몬스터에 통나무 직접 강타, 다음 턴 새 collider, 여러 접촉의 시간순, 위조 metadata 거절을 포함한다.

## Acceptance Criteria

- [ ] 세 받침 높이의 낙하 피해가 각각 1/2/3이고, 기존 log 강타 3과 탑승자 피해가 중복되지 않는다.
- [ ] 낙하 중의 적과 사탕이 실제 경로에서 겹칠 때만 맞는다. 착지 후 생존 적의 다음 발사·반격 위치가 새 좌표와 일치한다.
- [ ] 타 적에게 통나무가 실제 충돌하면 기존 3 피해가 유지된다. 착지 충격은 다른 적을 해치지 않는다.
- [ ] 사망·중복 접촉·위조 결과로 HP/점수가 늘거나 두 번 정산되지 않는다.

## Validation

- `node --test tests/forest-log-physics.test.mjs tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs tests/battle-engine.test.cjs` — 낙하·충돌·정산·보안 회귀 통과.
- `npm.cmd run build` — 번들 통과.

## Commit Message

```text
feat(숲전투): 통나무 탑승 몬스터의 낙하와 실충돌 적용

Plan: 2026-10-28-forest-elevated-enemies-candy-abilities
Phase: P01-combat-simulation
Task: T02-rider-fall-physics

- 높이별 포물선 낙하와 이동 중 사탕 충돌 계산
- 중복 피해 없이 착지 위치·피해·점수 정산
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
