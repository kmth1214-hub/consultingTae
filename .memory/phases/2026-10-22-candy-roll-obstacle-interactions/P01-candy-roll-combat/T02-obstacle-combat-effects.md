# Task: T02 지역별 장애물 전투 효과

## Status: done

## Goal
충돌 메타데이터를 사용해 React 장면 애니메이션과 분리된 BattleEngine이 지역별 장애물 효과를 한 번 처리하고, 피해·점수·다음 적 공격·혼돈 조작 반전 상태를 이벤트에 반환하게 한다.

## Decision Summary
- 숲: 충돌 위치에서 가장 가까운 생존 적에게 3 피해. 눈: 다음 적 공격 피해를 절반으로 줄인다. 도시: 모든 생존 적에게 각 1~2 무작위 피해.
- 혼돈은 위 세 효과 또는 한 발 조작 반전 중 하나를 같은 확률로 선택한다. 모든 효과는 기존 점수/전투 종료/적 반격 경로를 사용한다.

## Implementation

### I01. 엔진 상태와 단일 장애물 효과 해석
- Related Files:
  - `assets/js/battle-engine.js` :: `createRunState`, `resolveProjectile`, `resolveEnemyTurn`, `getLivingEnemies`, `addScore`; modify
  - `tests/battle-engine.test.cjs`; modify
- **Signatures & Types**:
  ```typescript
  type ObstacleKind = 'log'|'ice'|'crate';
  type ShotMeta = {impactKind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout';
    obstacleId:string|null;obstacleKind:ObstacleKind|null;obstacleTargetIds:string[];
    rolling:boolean;reverse:boolean};
  type ObstacleEffect = {kind:'log-strike'|'ice-guard'|'jar-burst'|'aim-inversion';
    hits:Array<{id:string;kind:string;damage:number;remainingHp:number;defeated:boolean;scoreDelta:number}>;
    damageReduction?:number;armed?:boolean};
  resolveProjectile(state, options:{hitIds:string[];selectedTargetId?:string|null;
    shotMeta?:ShotMeta;rng?:()=>number;source?:string;damage?:number;weaponGrade?:string}):ProjectileEvent;
  ```
- **상태**:
  - RunState에 `nextAttackDamageMultiplier:number|null` (초기 null), `pendingAimInversion:boolean` (초기 false)를 추가한다. `enterRound`는 두 값 모두를 지우지 않는다. 각각 다음 적 공격/다음 발사 1회에서 소비된다.
  - `ProjectileEvent.obstacleEffect:ObstacleEffect|null` 추가. effect의 `hits`는 실제 HP 감소와 기존 grade multiplier에 따른 점수 delta를 기록한다. `event.hits`에도 같은 실제 hit를 합쳐 기존 몬스터 피해 표시가 재사용되게 한다.
- **실행 흐름**:
  1. `resolveProjectile`은 탄약/등급/기본 피해를 기존과 동일하게 처리한다. 장애물 hit metadata가 있는 경우 기존 `hitIds`는 장애물 접촉 전에 실제로 만난 적만 포함한다. 벽 뒤 적은 포함되지 않는다. 정상 선행 직격 피해를 적용한 뒤 장애물 효과를 정확히 한 번 실행한다.
  2. Forest: `obstacleTargetIds`에서 아직 생존한 첫 적을 선택한다. 최대 3 HP 제거, 점수 `removed * GRADE_MULTIPLIER[grade]`, 일반 hit/event 형식을 기록한다. 후보가 없으면 효과 이벤트는 hit 없이 반환한다.
  3. Snow: `nextAttackDamageMultiplier=.5`를 설정한다. `resolveEnemyTurn`은 현재 shield/Milk block을 먼저 결정하고, 기존처럼 block된 공격은 RNG damage roll을 하지 않는다. 막히지 않은 공격은 기존 RNG로 정수 피해를 굴린 뒤 `Math.floor(rawDamage*.5)`를 HP에 적용한다. modifier는 block 여부와 무관하게 그 다음 적 공격 1회에서 소비한다. 새로 설정한 효과는 실제 HP 피해를 다음 턴까지 보존한다.
  4. City: 현재 생존 적 각자에 대해 injected RNG로 `randomInt(rng,1,2)`를 굴린다. 각 적 HP 이상으로 적용하지 않고 기존 `addScore`와 hit event를 사용한다.
  5. Chaos: `randomInt(rng,0,3)`로 동등 확률 인덱스를 선택해 log/ice/jar/aim-inversion을 발동한다. 0·1·2는 위 구현을 재사용하고 3은 `pendingAimInversion=true`로 설정한다. 적중 연출용 `obstacleEffect`에 선택 결과가 남아야 한다. 외부/DOM RNG 금지.
  6. 효과 뒤 모든 적이 처치되면 기존 `finishAction`이 보스/라운드 클리어를 처리하고 적 반격을 만들지 않는다. 생존 적이 있으면 기존대로 적 반격을 한 번 만든다. 효과가 없던 경우도 기존 missed/turn 규칙을 유지한다.
  7. 실제 effect 피해 점수는 active route의 기존 `addScore`로 계산한다. Chaos 점수는 bonusScore, 일반 지역 점수는 score에만 반영한다. Spear/소모품 즉시 피해는 장애물 metadata를 받지 않는다.

### I02. 세션 collision metadata 검증과 전달
- Related Files:
  - `src/game/gameSession.js` :: `fireShot`, `routeCombat`; modify
  - `tests/game-session.test.mjs`; modify
- **필드 검증**: 기존 `impactKind`, `obstacleId`, `reverse`에 `obstacleKind`, `obstacleTargetIds`, `rolling`을 추가한다. obstacle일 때 id는 문자열, kind는 세 허용값 중 하나, 후보는 고유 문자열 id 배열, rolling은 boolean이어야 한다. obstacle이 아닌 경우 obstacleId/kind는 null, 후보는 빈 배열이어야 한다. 잘못된 메타데이터는 엔진 호출 전 `invalid-state`로 거부하고 RunState를 바꾸지 않는다.
- **전달/이벤트**: 복사한 metadata만 `engine.resolveProjectile(run,{hitIds,selectedTargetId,rng,shotMeta})`에 전달한다. accepted 이벤트의 `lastEvent.shotMeta`는 원본 객체 alias가 없도록 clone한다. `event.obstacleEffect`를 그대로 lastEvent에 보존한다. 애니메이션 콜백/구독자는 엔진을 재호출하지 않는다.
- **기존 호출 회귀**: `tests/game-session.test.mjs`의 obstacle metadata 수락 케이스를 새 전체 필드(`obstacleKind:'log'`, `obstacleTargetIds:[]`, `rolling:false`)로 갱신한다. malformed 케이스는 각 신규 필드의 잘못된 조합을 검사하며, 다른 impactKind의 기존 호출 형식은 그대로 통과해야 한다.

## Acceptance Criteria
- [x] 주입 RNG로 도시의 적별 1/2 피해와 혼돈 네 효과를 각각 결정적으로 재현한다.
- [x] 숲은 가장 가까운 생존 후보로 후퇴하고, 눈 효과는 다음 적 공격 1회만 절반 감소한다.
- [x] 효과가 보스/일반 적을 처치하면 기존 clear routing과 점수가 일치하고 반격이 중복되지 않는다.
- [x] 잘못된 shot metadata는 탄약·체력·점수·상태를 변경하지 않는다.

## Validation
- `node --test tests/battle-engine.test.cjs tests/game-session.test.mjs tests/gameplay-rules.test.cjs` — 엔진/세션/기존 규칙 통과.
- `git diff --check` — 공백 오류 없음.

## Commit Message
```text
기능(전투): 지역별 장애물 효과 처리

Plan: 2026-10-22-candy-roll-obstacle-interactions
Phase: P01-candy-roll-combat
Task: T02-obstacle-combat-effects

- 숲·눈·도시·혼돈 장애물 효과와 점수를 엔진에서 처리한다.
- 다음 공격 감소와 1회 조작 반전 상태를 안전하게 소비한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`62` tests; `npm.cmd run build`; `git diff --check`)
- commit: `기능(전투): 지역별 장애물 효과 처리`
