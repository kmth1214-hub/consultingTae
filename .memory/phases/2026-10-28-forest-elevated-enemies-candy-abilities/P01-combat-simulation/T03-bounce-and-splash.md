# Task: T03 모험가 바운스와 연금술사 파동

## Status: done

## Goal

관리자 숲 시범판에서 **이번에 장전된** 모험가 사탕은 첫 지면 착지 후 한 번 튀고, 연금술사 사탕은 실제 적/장애물 충돌점에서 반경 180의 피해 1 파동을 일으킨다. 기존 보유 사탕의 상시 점수 능력과 불공·창의 의미를 유지한다.

## Decision Summary

- 모험가: 첫 바닥 착지→한 번 반동 비행→두 번째 착지 후 기존 최대 지름×5 굴림. 그전에 적/장애물을 맞히면 기존 첫 접촉 규칙을 따른다.
- 연금술사: 살아 있는 범위 내 적마다 추가 1 피해; 직접 맞은 적도 살아 있으면 추가 1. 파동과 바운스는 장전된 사탕의 고유 효과다. 창은 그 발의 새 고유 효과를 대체하고, 불공의 2배는 큰 사탕 직접 피해에만 적용한다.

## Implementation

### I01. 장전 사탕 식별과 바운스 경로

- Related Files:
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — `run.weaponQueue[0]`의 instance ID로 현재 weapon ID를 조회하고 `planShot`에 전달; modify.
  - `src/game/shotGeometry.js` :: `planShot`, `planStackedShot`, `appendGroundRoll`, `ballisticFromVelocity`, `makePath` — 첫 착지 바운스·두 번째 착지 굴림; modify.
  - `src/game/projectilePlayback.js` :: `createProjectilePlayback` — 확장된 path·simulationSeconds 재생; modify if needed.
  - `tests/shot-geometry.test.mjs`, `tests/shot-resolution.test.mjs` — 물리 경로와 장전 식별; modify.

#### Signatures & Types

- `planShot`의 선택 입력 `loadedCandyId?:'adventurer-candy'|'alchemist-candy'|'wizard-orb'|string|null`, `prototype?:'forest-elevated-v1'|null`을 추가한다. `piercing===true`면 `loadedCandyId`에 관계없이 새 능력 off다.
- `ShotSolution`에 시범판용 `abilityKind?:'bounce'|'splash'|'split'`, `bounce?:{firstLandingTime:number,firstLanding:{x,y},secondLandingTime:number}|null`, `abilityContacts?:{kind:'splash',time:number,point:{x,y},trigger:'enemy'|'obstacle',sourceId:string,radius:180}[]`를 둔다. 일반 솔루션은 이전 shape을 유지한다.

#### Execution Flow / Logic

1. `preparePhysicalFlight`는 현재 queue 맨 앞 instance를 `run.weapons`에서 찾고 ID를 정한다. engine이 `resolveProjectile`에서 사용하는 같은 무기여야 하므로 큐가 비었을 때의 기존 refill 경로를 확인하고 null이면 능력을 발동하지 않는다. `run.studioPrototype`이 없는 일반 전투, 숲 이외 지역, 창 준비 중이면 이전 물리 경로로 간다.
2. 모험가 사탕의 기본 포물선이 지면에 먼저 닿으면 그 지점·시각의 수평 속도를 유지하며 위쪽 반동 속도로 **한 번만** `ballisticFromVelocity`를 시작한다. 반동 속도는 첫 충돌 속도와 제한값에서 결정하며 RNG를 쓰지 않는다. 반동 비행도 기존 적·장애물 first-contact와 연쇄 log 물리를 사용한다. 두 번째 바닥 착지 후 `appendGroundRoll`을 호출하되 총 굴림 거리는 현재 지름×5 한도를 넘지 않는다.
3. 기존 `planStackedShot`의 충돌로 반동 전에 장애물을 때렸거나 적에 맞으면 그 접촉을 우선한다. 굴림 중 장애물에 닿아 활성화되는 기존 규칙도 그대로다. 역발사·맵 경계·최대 시뮬레이션 시간 8초를 지키고 화면 밖에서 무한 반동하지 않는다.
4. `simulationSeconds`는 바운스·굴림·연쇄 물체 motion 중 최댓값을 사용한다. 첫 30% 궤도 미리보기는 새 경로를 미리 전부 노출하지 않고 기존 preview 제한을 유지한다.

#### Error / State

- 비정상 반동(수평 속도 0, 첫 착지에서 곧바로 경계 밖, 시간 초과)은 바운스 없이 기존 착지·굴림으로 끝낸다. 속도/시간 NaN은 shot 준비 실패로 반환한다. 두 번째 바운스는 절대 만들지 않는다.

### I02. 파동의 실제 적 판정과 엔진 정산

- Related Files:
  - `src/game/shotGeometry.js` :: `planStackedShot`, `planShot` — 직접 적·장애물의 접촉점/시각을 한 번씩 기록; modify.
  - `src/game/shotResolution.js` :: `flightResultPayload` — 예약된 flight의 `abilityContacts`만 전달; modify.
  - `src/game/gameSession.js` :: `fireShot` — 시범판·장전 ID·창 제외·접촉점/시각/ID/중복 검증; modify.
  - `assets/js/battle-engine.js` :: `resolveProjectile` — 동일 contact timeline에서 실제 살아 있는 적과 반경 180 검사 후 피해·점수; modify.
  - `src/game/candyPresentation.js` :: `getCandyDetails` — 시범판에서 현재 사탕 효과/창 대체 안내 데이터; modify.
  - `tests/battle-engine.test.cjs`, `tests/shot-hit-integrity.test.mjs`, `tests/candy-presentation.test.mjs` — 추가 피해·카운터·보안; modify.

#### Data & Schema

- `shotMeta.abilityContacts`는 `[{kind:'splash', time:number, point:{x:number,y:number}, trigger:'enemy'|'obstacle', sourceId:string, radius:180}]`이다. 샷 예약 토큰 없이 이 필드를 직접 제출하는 호출은 현재와 같이 거부한다. 각 물리 contact의 source ID는 한 shot에 한 번만 사용한다.
- 범위 판정은 접촉 시각의 적 collider 중심과 `point`의 월드 거리 `<=180 + collider.radius`를 사용한다. 낙하 중 적이라면 T02의 그 시각 위치를 사용한다. 화면 픽셀·카메라 확대값은 쓰지 않는다.
- 추가 피해의 `event.hits`에는 `source:'alchemist-splash'`, 실제 제거 HP, 남은 HP, 기존 등급 점수 배수를 넣는다. splash는 `projectileCollisions`·`permanentWeaponHits`를 올리지 않는다.

#### Execution Flow / Logic

1. 큰 사탕이 적이나 장애물에 실제 닿은 시점만 파동 트리거로 넣는다. 미리보기 예상선, 지나간 근접 거리, 투사체 분기, log끼리 연쇄 충돌만으로는 파동을 만들지 않는다.
2. 엔진의 기존 timeline에 직접 적 피해/장애물 활성화와 같은 시각의 파동을 넣는다. 같은 시각에는 직접 피해를 먼저 적용하고 그 뒤 범위 피해를 적용한다. 그 사이 처치된 적은 추가 피해 0, 살아 있는 직접 맞은 적은 1 추가 피해를 받을 수 있다. 각 범위 안의 다른 적도 각각 1 피해를 받는다.
3. 기본 직접 피해·불공 2배·기존 상시 효과 카운터는 오직 원래 큰 사탕의 직접 적 충돌에 적용한다. 불공은 파동을 2배로 하지 않는다. 창은 관통 판정을 우선하고 바운스·파동을 둘 다 비활성화한다.
4. 남은 적이 모두 죽으면 기존 `finishAction`의 라운드 종료를 한 번만 실행한다. 빗나감 반격이나 클리어 직후 반격 순서가 앞서지 않도록 timeline 완료 후에 정산한다.

#### Tests

- 첫 착지 바운스→두 번째 착지 굴림, 적/장애물 조기 접촉, 역발사, 경계 밖, 시범판 off 비교.
- 직접 맞은 적이 파동으로 1 더 맞는 경우, 먼 적 미피해, 살아 있는 낙하 적 범위 판정, 죽은 적 중복 방지, 여러 파동의 시간순.
- 불공의 큰 사탕 직접 피해만 ×2, 창의 파동/바운스 대체, 세 번째 직접 명중 카운터 불변, 임의 metadata 거절.

## Acceptance Criteria

- [ ] 모험가 사탕이 첫 바닥 충돌에 한 번 튀고 두 번째 충돌 뒤에만 구른다. 장애물·적을 먼저 맞히면 실제 첫 접촉 규칙이 적용된다.
- [ ] 연금술사 사탕의 실제 접촉 반경 180에만 각 적 피해 1이 들어가고 직접 맞은 적도 생존 시 추가 1을 받는다.
- [ ] 불공·창 우선순위, 상시 점수 능력, 원래 카운터 및 일반 게임의 피해량은 유지된다.

## Validation

- `node --test tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs tests/shot-hit-integrity.test.mjs tests/candy-presentation.test.mjs tests/battle-engine.test.cjs` — 바운스·파동·아이템 조합·위조 거절 통과.
- `npm.cmd run build` — 번들 통과.

## Commit Message

```text
feat(마법사탕): 모험가 반동과 연금술사 파동 추가

Plan: 2026-10-28-forest-elevated-enemies-candy-abilities
Phase: P01-combat-simulation
Task: T03-bounce-and-splash

- 첫 착지 반동과 두 번째 착지 후 굴림 계산
- 실제 충돌 반경 파동과 불공·창 우선순위 정산
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: T03 작업 커밋
