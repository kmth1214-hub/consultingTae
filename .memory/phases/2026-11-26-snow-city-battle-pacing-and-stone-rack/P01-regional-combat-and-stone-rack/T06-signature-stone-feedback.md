# Task: T06 가속·회전 표시와 수동 폭발 보상

## Status: done

## Goal

용감한과 딸기맛의 물리 효과를 눈으로 읽고, 연금술사의 수동 폭발 타이밍에 확정 범위 피해를 얻는다.

## Decision Summary

- 기존 physicsModifier와 실제 candyRadius를 연출에 사용한다. 수동 폭발 성공은 session이 결정하고 자동 발동만 기존 등급별 RNG를 사용한다.
- 선행 작업은 T05-oven-vent-weakpoint이다. 목표 설계는 `.memory/decisions/2026-11-26-snow-city-battle-pacing-and-stone-rack.md`의 D01~D06을 따른다.
- 전투 진입은 createGameSession → beginShot → preparePhysicalFlight → ProjectileFlight → fireShot → BattleEngine.resolveProjectile 순서다. 물리 결과를 예약 token으로 한 번만 확정하고 화면 재생에서 피해를 재계산하지 않는다.
- 실제 코드는 JavaScript/React이고 아래 TypeScript는 문서용 타입 계약이다. 기존 함수의 사용자가 의존하는 반환값·유효성 검증을 보존한다.
- 공통 시작은 전용 C 1개+기본 2개, 일반 HP 4다. 새 API·DB 테이블·계정 해금 필드는 만들지 않는다. 지정 검증만 실행하고 전체 회귀는 배포 시 실행한다.

## Implementation

### I01. 상태·물리·화면 계약 연결

- Related Files:
  - `src/game/gameSession.js` :: `activatePendingAbility` — modify
  - `src/game/shotResolution.js` :: `activatePhysicalFlight`; `src/game/shotGeometry.js` :: `activatePlannedAbility` — read-only unless timing/metadata adjustments required
  - `src/game/projectilePlayback.js` :: `getSignaturePlaybackFrame`; `src/components/ProjectileFlight.jsx` :: `tick`, projectile SVG — modify
  - `src/components/CandyProjectileArt.jsx`, `src/styles/arena.css` :: 가속 잔상·회전 외곽 — modify
  - `src/game/candyPresentation.js` :: `getCandyDetails`; `src/game/signatureStones.js` :: `describeSignatureStone` — modify
  - `tests/active-candy-abilities.test.mjs` — modify if present, otherwise add matching cases to tests/game-session.test.mjs
  - `tests/projectile-playback.test.mjs`, `tests/candy-presentation.test.mjs` — modify
  - `tests/e2e/signature-stone-feedback.spec.cjs` — new

#### Details

- **Signatures & Types**

```typescript
type ActivationSource = 'click' | 'space' | 'auto-contact' | 'auto-ground';
// Existing activatePendingAbility({shotId,encounterId,simulationTime,source}) returns {accepted:true,flight} or rejection.
type SignatureFrame = ExistingSignatureFrame & { dashBurstProgress: number | null };
getSignaturePlaybackFrame(flight: PhysicalFlight, time: number): SignatureFrame;
```

- **Data & Schema Fields**

- manual source=click|space는 연금술사 success=true이며 RNG를 호출하지 않는다. auto-contact|auto-ground는 grade C/B/A별 .2/.45/.7로 기존 확률 추첨을 한 번만 한다.
- 범위 C/B/A 300/375/450와 고정 피해 1을 유지한다. 수동 입력 시 범위 내 적이 없어도 스톤은 사라진다. 직접 충돌 기본 피해와 폭발 피해의 기존 분리를 따른다.
- dashBurstProgress는 실제 가속 startTime=.25 후 .3초 동안 0~1, 그 외 null. 딸기맛 외곽은 이미 radiusScale이 적용된 flight.candyRadius를 사용하며 비율을 다시 곱하지 않는다.

- **Execution Flow / Logic**

1. 기존 activation의 예약 token·시각·종류 검증을 모두 먼저 수행한다. 연금술사만 source에 따라 성공을 결정하고 기존 activatePhysicalFlight에 전달한다. 실패/중복/너무 늦은 입력은 RNG를 소비하거나 flight를 바꾸지 않는다. Space 장전으로 시작된 이벤트가 비행 발동으로 재해석되지 않게 T02 입력 조건을 유지한다.
2. 큰 스톤 직접 충돌 이전 수동 폭발은 큰 탄을 종료하고 성공 범위 내 적만 피해 1을 준다. 자동 접촉이면 직접 피해 후 폭발을 적용한다. 불공은 기존 큰 탄 직접 피해만 강화하고 폭발 고정 피해는 1이다. 창 준비 시 전용 능력은 발동하지 않는다.
3. ProjectileFlight는 매 프레임 실제 시간으로 잔상 투명도/위치를 갱신한다. 이미 지나간 실제 경로 3개 지점에 짧게 남기는 방식으로 미래 궤적을 추가 노출하지 않는다. 취소/완료/숨김 탭에 효과를 정리한다.
4. 딸기맛은 스톤 실제 반경에 맞는 회전 테두리를 SVG local 좌표에 그린다. 이동·회전은 기존 candyRef 변환을 따른다. reduced-motion에서는 잔상을 정지 강조로, 회전은 고정 테두리로 표현한다.
5. HUD에 수동 폭발 확정 피해와 자동 성공률을 명확히 구분한다. 가속/반경 수치를 실제 catalog에서 읽고 별도 상수로 복제하지 않는다.

### I02. 해당 기능 검증과 회귀 방지

- Related Files:
  - 위 I01의 tests 경로 — 변경된 실제 진입점과 실패 조건을 검증한다. modify/new 구분은 I01과 같다.

#### Details

- **Signatures & Types** — Node 테스트는 `node:test`의 `test(name, fn)`와 assert를, 브라우저 테스트는 기존 `tests/e2e/support.cjs`의 `test`, `installGame`, `start`, `dragPull`, `snapshot`, `phase`를 사용한다.
- **Data & Schema Fields** — fixture는 기존 instanceId/seed/flightStartMs/주입 RNG를 사용한다. 기대 피해는 실제 감소 HP와 해당 이벤트를 검사한다.
- **Execution Flow / Logic** — C/B/A 수동 클릭·Space 100%, 자동 성공/실패 경계, 빈 범위, 직접 명중+폭발, 이동 적 폭발 시각, fireball/spear, 예약 재사용 거부, 가속 .25초 이전·이후 잔상, 딸기 radius 1.25/1.35/1.45 중복 확대 방지, reduced-motion 표시를 검사한다.
- 실패 시 원래 재현 입력으로 원인을 확인하고, 확인 전 Task를 done으로 바꾸지 않는다. 브라우저 자산 로딩 시간과 물리 시간은 구분하며 타이밍 실패를 피해 결과 덮어쓰기로 해결하지 않는다.

## Acceptance Criteria

- [x] 연금술사 수동 폭발은 실제 범위 내 적에게만 피해 1을 확정한다.
- [x] 자동 성공률과 다른 쿠키의 발동 경로가 유지된다.
- [x] 가속과 실제 넓은 충돌 범위를 데스크톱·휴대폰에서 읽을 수 있다.

## Validation

- `node --test tests/game-session.test.mjs tests/projectile-playback.test.mjs tests/candy-presentation.test.mjs tests/shot-hit-integrity.test.mjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run test:e2e -- tests/e2e/signature-stone-feedback.spec.cjs` — 지정 기능의 회귀와 실제 입력 경로가 통과한다.
- `npm.cmd run build -- --logLevel error` — 빌드 또는 변경 형식 검증이 통과한다.

## Commit Message

```text
feat(stones): 수동 폭발 보상과 가속 회전 피드백 개선

Plan: 2026-11-26-snow-city-battle-pacing-and-stone-rack
Phase: P01-regional-combat-and-stone-rack
Task: T06-signature-stone-feedback

- 용감한과 딸기맛의 물리 효과를 눈으로 읽고, 연금술사의 수동 폭발 타이밍에 확정 범위 피해를 얻는다.
- 지정 검증 결과와 회귀 수정 반영
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 문서를 포함한 Task 커밋
