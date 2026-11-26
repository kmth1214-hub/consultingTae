# Task: T05 오븐 환기구 명중과 과열 약화

## Status: pending

## Goal

도시 보스의 과열 직전 차례에 드러나는 환기구를 직접 맞혀 다음 과열의 피해와 부가 효과를 줄인다.

## Decision Summary

- 환기구 원은 실제 피격 경계에 있고 표시와 명중 판정이 같은 영역을 쓴다. 일반 몸통·물체·파편·폭발 피해로 약점을 원격 활성화하지 않는다.
- 선행 작업은 T04-city-blast-chain이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `src/game/battlefieldModel.js` :: `buildBattlefield` — modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `activatePhysicalFlight`, `flightResultPayload` — modify
  - `src/game/gameSession.js` :: `fireShot`의 예약 결과 검증 — modify
  - `assets/js/battle-engine.js` :: `resolveProjectile`, `resolveEnemyTurn`, `applyIncomingDamage` — modify
  - `src/components/MonsterGroup.jsx` :: 환기구 표시; `src/components/EnemyResponse.jsx` :: 약화 공격 안내 — modify
  - `src/styles/arena.css` :: 환기구 및 reduced-motion — modify
  - `tests/oven-vent.test.mjs` — new
  - `tests/e2e/enemy-response.spec.cjs` — modify

#### Details

- **Signatures & Types**

```typescript
type Vent = { enemyId: string; x: number; y: number; radius: number };
type VentHit = { enemyId: string; point: { x: number; y: number }; time: number };
type Boss = ExistingEnemy & { ventWeakened?: boolean };
// Layout EnemySlot.vent?: Vent; flight.ventHits?: VentHit[]; shotMeta.ventHits?: VentHit[]
```

- **Data & Schema Fields**

- 환기구는 city round3의 oven-robot에만 생성한다. 중심 x=collider.x-collider.radius, y=collider.y, radius=size*.18로 새총을 향한 원형 경계에 둔다.
- 노출 조건은 alive && !ventWeakened && (attackCount+1)%3===0. 보스 위치와 크기를 바꾸면 같은 layout 좌표에서 계산한다.
- enemy.ventWeakened 기본 false. 없는 기존 상태도 false로 해석한다. enemyAttack.overheatWeakened?: boolean으로 이번 반격 약화를 화면에 알린다.

- **Execution Flow / Logic**

1. 준비 차례의 살아 있는 도시 보스만 환기구를 표시한다. 물리 발사에서 각 큰 스톤의 직접 enemyContacts 또는 첫 직접 충돌점이 환기구 원과 스톤 반경의 합 안에 닿았는지 검사한다. 같은 발사의 같은 보스는 한 번 기록한다. 관통·튕김의 직접 명중은 허용하되 splitOrbs, 파도, 상자 폭발 등은 기록하지 않는다.
2. 약점 데이터는 preparePhysicalFlight에서 만들고 활성 능력 재계산 후 원래 큰 스톤의 실제 직접 충돌만 유지한다. session은 pendingShot에서 확정한 ventHits만 복사하고 알 수 없는 적, 음수/비유한 시각·좌표를 거절한다.
3. 엔진은 보스가 그 순간 노출 중인지 검사한 뒤 ventWeakened=true를 설정한다. 실제 oven-overheat 반격에서만 소모한다. frozenNextAttack으로 반격을 건너뛰면 보스 공격 횟수와 약화 표시를 유지한다. 처치 시 후속 과열은 없다.
4. 방어/우유 보호막은 기존 우선순위를 따른다. 방어되지 않은 약화 과열은 기존 nextAttackDamageMultiplier에 .5를 곱해 floor한다. 예를 들어 얼음 .5와 환기구 .5가 함께 있으면 원래 피해의 .25를 내림한다. 탄 제거와 보스 회복은 과열 약화 시 0이다.
5. ventWeakened는 과열 처리 직후 false로 되돌린다. 표시만으로 상태를 재추첨하거나 공격을 한 번 더 만들지 않는다. 혼돈 융합체/분리 오븐 보스에는 이번 환기구 규칙을 적용하지 않는다.
6. 경고에 과열 약화/부가 효과 차단을 표시하고, 적 반격 화살표·방어·피격 효과는 기존 시간 흐름에 맞춘다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — 노출 전 몸통/노출 중 환기구/노출 중 몸통, 0 기본 피해의 직접 명중, 큰 스톤의 관통·튕김, 파편/도시 폭발 미발동, .5 내림, 얼음 .25, 우유/방어 차단, 빙결 후 다음 과열까지 보존, 한 발 처치 우선, 중복 커밋·취소, 혼돈 기존 특수기를 검사한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [ ] 환기구가 세 번째 반격 전 플레이어 차례에만 노출된다.
- [ ] 실제 환기구 직접 명중 후 다음 과열 피해가 절반이고 탄 손실·회복이 0이다.
- [ ] 빙결·방어·처치와 함께 일관된 결과를 만든다.

## Validation

- `node --test tests/oven-vent.test.mjs tests/game-session.test.mjs tests/shot-hit-integrity.test.mjs tests/chaos-fused-boss.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/enemy-response.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.

## Commit Message

```text
feat(boss): 오븐 환기구 약점과 과열 약화 추가

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T05-oven-vent-weakpoint

- 도시 보스의 과열 직전 차례에 드러나는 환기구를 직접 맞혀 다음 과열의 피해와 부가 효과를 줄인다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
