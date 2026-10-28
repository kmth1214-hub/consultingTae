# Task: T04 마법사 사탕의 정점 분기 구슬

## Status: done

## Goal

관리자 숲 시범판에서 현재 장전된 마법사 구슬이 비행 중 작은 구슬 2개로 갈라지며, 각 작은 구슬이 실제 궤적에서 적에게 닿았을 때만 피해 1을 준다. 작은 구슬이 장애물에 닿으면 흔들림만 표시하고 쓰러뜨리거나 지역 효과를 일으키지 않는다.

## Decision Summary

- 위로 쏜 샷은 비행 정점, 낮거나 아래로 향한 샷은 비행 거리 약 1/3 지점에서 분기한다. 큰 구슬은 기존 비행과 직접 피해를 계속한다.
- 큰 구슬+작은 구슬 2개가 같은 적을 실제로 각각 맞히면 최대 3회 피해가 가능하다. 작은 구슬은 서로 다른 고정 각도이며 각각 피해 1. 기존 마법사 상시 세 번째 직접 충돌 +1은 큰 구슬에만 카운트한다.
- 불공은 큰 구슬 직접 피해만 2배, 작은 구슬은 피해 1. 창은 그 발의 분기 능력을 대체한다.

## Implementation

### I01. 분기 시각과 두 보조 궤적

- Related Files:
  - `src/game/shotGeometry.js` :: `planShot`, `planStackedShot`, `ballisticFromVelocity`, `circleContact`, `findObstacleContact`, `sampleAtTime` — 보조 궤적·실제 접촉 계산; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload` — 장전 ID, 분기 flight의 재생·정산 정보; modify.
  - `tests/shot-geometry.test.mjs`, `tests/shot-resolution.test.mjs` — 정점/거리 분기 및 궤적; modify.

#### Signatures & Types

- `ShotSolution.splitOrbs?: {splitTime:number,splitPoint:{x,y},children:[ChildOrb,ChildOrb]}`. `ChildOrb = {id:'left'|'right',path:BallisticPath,impactKind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout',impactTime:number,hit?:{enemyId:string,time:number,point:{x,y}}|null,wobble?:{obstacleId:string,time:number,point:{x,y}}|null}`. `path`는 큰 사탕과 같은 월드 좌표·상대 시간 기준으로 샘플링 가능해야 한다.
- `shotMeta.childHits?: {orbId:'left'|'right',enemyId:string,time:number,point:{x,y}}[]`; `shotMeta.childWobbles?:{orbId,obstacleId,time,point}[]`. 같은 orb는 살아 있는 첫 적 1명에게만 피해 1을 주고 종료한다.

#### Execution Flow / Logic

1. `prototype==='forest-elevated-v1'`, 장전 ID가 `wizard-orb`, 창 미사용일 때만 분기 계산을 한다. 원래 큰 사탕의 path·hitIds·obstacle contacts는 먼저 기존 규칙으로 만든다. 첫 큰 사탕 충돌 이전에 분기 시점이 없으면 자식 구슬을 만들지 않는다.
2. 발사 초기에 `direction.y<0`이며 궤적에 실제 정점(수직 속도 0)이 있으면 그 시각·지점을 선택한다. 초기 방향이 낮거나 아래이고 정점이 실질적으로 없으면 첫 충돌 전 비행 경로 길이의 약 1/3 지점을 사용한다. 분기점이 장애물 안·지면 아래·맵 밖이면 분기를 건너뛴다.
3. 두 자식은 분기 지점의 큰 구슬 순간 속도에서 정해진 작은 좌/우 각도 편차와 제한 속도를 적용해 각각 `ballisticFromVelocity`로 전진한다. RNG를 쓰지 않는다. `BATTLEFIELD.sampleStep`, `maxSeconds`, 월드 경계를 따른다. 큰 구슬은 원래 path를 보존하고 자식이 큰 구슬의 첫 접촉을 선행 변경하지 않는다.
4. 자식 각각에 대해 현재 시각의 살아 있는 적 collider와 swept 충돌을 수행한다. T02의 탑승 적이 낙하 중이면 그 시각의 움직이는 collider를 사용한다. 같은 적에 두 자식이 닿아도 두 **별도** 접촉을 남긴다.
5. 자식이 장애물 폴리곤을 먼저 건드리면 `wobble`만 기록하고 자식 궤적은 계속 통과한다. obstacle `contacts`, `toppledObstacleIds`, chain 및 지역 효과를 **전혀** 생성하지 않는다. 필요하면 충돌 ID별 첫 wobble만 기록해 시각화가 반복 진동하지 않게 한다.
6. 전체 재생 완료 시간은 큰 구슬·두 자식·통나무 낙하·연쇄 중 최댓값이다. 카메라는 실제 구슬들 중 현재 유효한 하나를 추적하되 지도 끝 제한을 유지한다.

#### Error / State

- 자식 path가 유효하지 않으면 그 자식만 생략하고 큰 구슬 결과를 유지한다. 동일 자식의 중복 hit, 적이 이미 죽은 뒤 도착한 hit, 첫 충돌 이전의 임의 위조 hit는 정산하지 않는다.

### I02. 물리 결과 검증과 시간순 피해

- Related Files:
  - `src/game/gameSession.js` :: `fireShot` — 예약 flight에서 재생성한 자식 접촉의 타입·시각·ID 검증; modify.
  - `assets/js/battle-engine.js` :: `resolveProjectile` — 자식 접촉당 살아 있는 실제 적에 고정 피해 1 및 점수; modify.
  - `src/game/candyPresentation.js` :: `getCandyDetails` — 현재 마법사 고유 능력 설명 데이터; modify.
  - `tests/battle-engine.test.cjs`, `tests/shot-hit-integrity.test.mjs`, `tests/candy-presentation.test.mjs` — 같은 적 다중 실충돌·기존 카운터; modify.

#### Details

- `flightResultPayload`은 큰 구슬과 별도로 `childHits` 및 wobble 시각을 넘기되 외부 caller의 `shotMeta`를 믿지 않는다. `fireShot`의 물리 커밋은 `pendingShot.flight`로 payload를 다시 만들고, `orbId` 유일성, 전장 적/장애물 ID, 시간/좌표의 유한성, 분기 이후·해당 자식 첫 접촉 이전 조건을 검증한다. metadata-free 레거시 호출에 임의 자식 피해를 붙이지 않는다.
- 엔진의 timeline에는 큰 구슬 직접 피해, 통나무/낙하/파동, 두 작은 구슬 명중을 실제 시각순으로 넣는다. 자식 hit는 매번 그 시각 **살아 있는** 적의 현재 HP에서 최대 1만 제거한다. 등급 점수 배수는 현재 무기의 기존 배수를 사용하고 실제 제거 HP만 점수에 반영한다.
- 자식 피해는 `projectileCollisions`, `permanentWeaponHits`, 큰 사탕의 `directHitCount`를 올리지 않으며 큰 사탕의 불공 2배/마법사 보너스 +1을 받지 않는다. 창을 썼으면 child hit가 0개이고 기존 최대 3관통과 피해 감소만 적용한다.
- 검증: 높은 발사 정점, 낮은 발사 1/3, 정점 이전 장애물, 같은 적 큰 구슬+자식 둘, 첫 자식이 적을 죽여 둘째는 0, 자식의 통나무 wobble만, 불공/창 조합, 시범판 off를 포함한다.

## Acceptance Criteria

- [ ] 실제 분기점에서 두 작은 구슬이 서로 다른 경로로 날며 각각 실제 적 접촉 때만 피해 1을 준다.
- [ ] 같은 적의 큰 구슬·두 자식 접촉이 모두 실제라면 각각 정산되고, 죽은 적을 재차 해치거나 점수를 더하지 않는다.
- [ ] 작은 구슬의 장애물 접촉은 흔들림만 남기며 통나무 붕괴·연쇄·지역 효과를 만들지 않는다.
- [ ] 불공/창과 기존 마법사 직접 명중 카운터, 일반 게임 경로가 유지된다.

## Validation

- `node --test tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs tests/candy-presentation.test.mjs tests/battle-engine.test.cjs` — 분기·다중 접촉·아이템 조합 통과.
- `npm.cmd run build` — 번들 통과.

## Commit Message

```text
feat(마법사탕): 정점에서 갈라지는 작은 구슬 두 개 추가

Plan: 2026-10-28-forest-elevated-enemies-candy-abilities
Phase: P01-combat-simulation
Task: T04-wizard-split-orbs

- 실제 궤적과 첫 적 접촉으로 작은 구슬 피해 정산
- 장애물은 흔들림만 표시하고 기존 직접 명중 카운터 유지
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: T04 작업 커밋
