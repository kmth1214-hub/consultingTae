# Task: T01 획득순 탄창과 장전 상태

## Status: done

## Goal

모든 기본·전용 스톤을 획득순으로 자동 장전하고, 남은 스톤을 골라 장전해도 같은 스톤을 한 라운드에 두 번 발사하지 않는다.

## Decision Summary

- 보유 목록 weapons의 instanceId를 식별자로 사용한다. 이번 라운드의 발사 가능 목록 weaponQueue와 ammo를 함께 변경한다. 보관함 선택과 발사 예약은 session 경계에서 상호 배제한다.
- 선행 작업은 없음이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `assets/js/battle-engine.js` :: `refillWeaponQueue`, `getCurrentWeapon`, `resolveProjectile`, `advanceRound`, `grantWeapon`, `startBonusRoute`, `resolveEnemyTurn`와 export 목록 — modify
  - `src/game/gameSession.js` :: `createGameSession`, `actions`, `beginShot` — modify
  - `src/game/candyPresentation.js` :: `getCandyDetails` — modify
  - `src/dev/createStudioSession.js` :: `createStudioSession`의 action 전달 — modify
  - `tests/stone-rack.test.mjs` — new
  - `tests/game-session.test.mjs`, `tests/slot-rewards.test.mjs`, `tests/wind-skill.test.mjs` — modify

#### Details

- **Signatures & Types**

```typescript
type LoadStoneResult = { accepted: true; instanceId: string } | { accepted: false; reason: 'invalid-state' | 'stone-unavailable' | 'wind-armed' };
BattleEngine.loadStone(state: RunState, instanceId: string): LoadStoneResult;
session.actions.loadStone(instanceId: string): LoadStoneResult;
// Existing refillWeaponQueue(state, rng) stays callable by existing lifecycle paths.
```

- **Data & Schema Fields**

- `weapons: Weapon[]`는 누적 획득순이며 각 `instanceId: string`은 중복되지 않는다. 같은 id와 grade라도 별개 스톤이다.
- `weaponQueue: string[]`는 이번 라운드에 사용 가능한 인스턴스 ID만 가진다. 장전된 ID가 첫 칸이고, 나머지는 weapons의 획득순이다.
- `currentWeaponId: string | null`는 항상 queue[0] 또는 null. `ammo: number`는 queue.length, `maxAmmo: number`는 그 라운드 시작 시 채운 수다.
- 새 영구 저장 필드와 DB 변경은 필요 없다. 레거시 초기 options.ammo가 maxAmmo보다 작으면 생성한 획득순 queue를 그 수로 자른다. 기존 런은 저장·복구하지 않는 구조지만 배열 필드가 없는 기존 테스트 입력은 초기화 경계에서 정상화한다.

- **Execution Flow / Logic**

1. `refillWeaponQueue`는 weapons의 ID를 그대로 복사한다. createRunState, 다음 라운드, 야영지 이후 진입, 혼돈 진입에서 호출한다. shuffle 함수는 슬롯의 소모품 보상 등 다른 호출자에 남긴다.
2. 발사 시 queue 첫 ID만 제거한다. 기존 resolveProjectile의 발사 직전/직후 빈 queue 자동 리필은 제거하고, 마지막 발사 뒤 currentWeaponId=null로 둔다. getCurrentWeapon은 소진 시 weapons[0]로 돌아가지 않는다. 마지막 탄으로 모든 적을 잡으면 클리어를 우선한다.
3. loadStone은 queue에 있는 ID만 허용한다. 선택 ID를 첫 칸에 놓고 나머지 미사용 ID는 weapons 순서로 정렬한다. 같은 ID 재선택은 accepted이며 탄·턴·점수·RNG를 소비하지 않는다.
4. session은 battle, terminal 없음, idle aim, pendingShot/shotReview/enemyResponse/bossTransition 없음, ammo>0일 때만 사본 run에 loadStone을 수행해 publish한다. 비행 예약 뒤 장전 요청은 거절하며 예약된 flight의 스톤과 피해가 바뀌지 않게 한다. windArmedMode가 있으면 wind-armed로 거절한다. 기존 fireball/spear 준비는 다음 발사 강화이므로 장전 변경으로 소비하지 않는다.
5. 오븐 과열의 ammoLost=1 처리도 queue.shift와 currentWeaponId 갱신으로 구현한다. 잃은 ID는 그 라운드에서 재선택할 수 없다. 중복 콜백으로 탄이 다시 줄어들지 않게 기존 committed event 경계를 따른다.
6. 보상 grantWeapon은 weapons 끝에 추가한다. 현재 라운드 탄은 늘리지 않고 다음 전투 리필에서만 반영한다. 반환 실패 시 run/queue/강화 상태를 그대로 유지한다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 획득순 기본 장전, 중복 종류의 별개 ID, B/A 등급 인스턴스, 임의 선택 후 나머지 순서, 소진 ID 거부, 마지막 발사 후 빈 queue, 다음 라운드 복원, 슬롯 중복 보상, 과열 소실, Q 강화 뒤 변경 거부, 비행 중 거부, 취소된 조준, 기존 options.ammo 입력을 검사한다. 기존 RNG 고정 테스트의 shuffle 의존 기대값을 새 규칙으로 갱신한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [x] 매 발사마다 ammo와 queue.length가 일치하고 소진 스톤이 재등장하지 않는다.
- [x] 선택만으로 피해·턴·바람 충전·소모품 사용 횟수가 변하지 않는다.
- [x] 다음 전투는 보유 목록 전체를 획득순으로 재장전한다.

## Validation

- `node --test tests/stone-rack.test.mjs tests/game-session.test.mjs tests/slot-rewards.test.mjs tests/wind-skill.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run build -- --logLevel error` — 빌드 또는 변경 형식 검증이 통과한다.

## Commit Message

```text
feat(stones): 획득순 탄창과 스톤 장전 상태 구현

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T01-stone-queue-and-loading

- 모든 기본·전용 스톤을 획득순으로 자동 장전하고, 남은 스톤을 골라 장전해도 같은 스톤을 한 라운드에 두 번 발사하지 않는다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 Task 커밋
