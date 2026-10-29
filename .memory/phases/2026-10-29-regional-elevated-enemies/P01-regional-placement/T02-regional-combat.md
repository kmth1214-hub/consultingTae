# Task: T02 지역별 받침 전투와 화면 표현

## Status: done

## Goal
눈·도시·혼돈의 받침이 사탕 또는 다른 물체에 쓰러질 때 위 몬스터가 포물선으로 낙하해 피해를 받고, 기존 지역별 장애물 효과도 발동하도록 한다.

## Decision Summary
- 낮음·중간·높음 낙하 피해 1·2·3. 생존 적은 착지 위치에 잔류한다.
- 눈의 공격 피해 감소, 도시의 전체 적 범위 피해, 혼돈의 무작위 효과는 낙하와 함께 발동한다. 숲의 통나무 직접 충돌 규칙을 유지한다.

## Implementation

### I01. 샷·전투 판정
- Related Files: `src/game/shotGeometry.js` :: `planStackedShot.activate`; `src/game/shotResolution.js` :: `flightResultPayload`; `src/game/gameSession.js` :: `fireShot`; `assets/js/battle-engine.js` :: `enterRound`, `resolveProjectile`; modify.
- Data & Schema: `contact.riderMotion` has `enemyId:string,supportObstacleId:string,elevation:'low'|'medium'|'high',startTime:number,durationSeconds:number,landing:{x:number,y:900},fallDamage:1|2|3`; `shotMeta.riderFalls[]` maps same data and `landingTime:number`.
- Execution Flow: any supported obstacle contact (direct or chain) starts `simulateObstacleMotion` and `simulateRiderFall`. A supported rider is excluded from physical log strike target list. Preserve the real contact and fall time ordering. Validate each fall against current enemy, actual contact and allowed damage; reject forged or duplicate falls. On impact, apply regional obstacle effect once, then fall damage at landing once; living rider remains at landing x/y. A defeated rider never counterattacks. Clear landing positions on new round. A spear's existing contact behavior must remain consistent with its prior exclusion of obstacle effects.
- Error cases: malformed/mismatched fall payload rejected; duplicate shot ID cannot resolve twice; no phantom rider if support is not struck.

### I02. 화면과 관리자 일치
- Related Files: `src/components/ArenaScenery.jsx` :: `StackBody`, `ArenaScenery`; `src/components/MonsterGroup.jsx` :: `MonsterGroup`; `src/components/BattleArena.jsx` :: battle render; `src/components/BattlefieldMinimap.jsx` :: minimap render; modify only where needed.
- Add region-fitting wide top and support structure to ice and crate (chaos uses each kind with chaos accent). Existing `sampleLogMotion` rotates/translates the entire stack. `MonsterGroup` follows placement and rider motion, then settles at the actual landing; mini map follows layout. Preserve existing boss art and private effects.

### I03. Tests
- Related Files: `tests/regional-elevated-combat.test.mjs`, `tests/e2e/regional-elevated.spec.cjs`; new. Existing `tests/battle-engine.test.cjs`, `tests/shot-hit-integrity.test.mjs`, `tests/shot-geometry.test.mjs`; run and adjust only where valid new behavior requires.
- Verify actual reachable shots for snow/city/chaos; fall damage 1–3 and one regional effect; no double fall; surviving rider landing and dead rider no attack; chain topple; visible support/rider/fall in public game and map preview.

## Acceptance Criteria
- [ ] 화면에서 본 낙하가 실제 체력·점수·반격에 같은 순서로 반영된다.
- [ ] 지역 효과와 낙하 피해가 각각 1회씩 적용된다.
- [ ] 미니맵·관리자·공개 화면의 좌표가 일치한다.

## Validation
- `node --test tests/regional-elevated-combat.test.mjs tests/battle-engine.test.cjs tests/shot-hit-integrity.test.mjs tests/shot-geometry.test.mjs`
- `npx playwright test tests/e2e/regional-elevated.spec.cjs`
- `npm run build`

## Commit Message
```text
feat(combat): 지역별 받침 낙하와 장애물 효과 연결

Plan: 2026-10-29-regional-elevated-enemies
Phase: P01-regional-placement
Task: T02-regional-combat

- 받침이 쓰러질 때 몬스터 낙하와 지역 효과를 시간순 반영
- 공개 전투와 관리자 화면에서 고저차를 일치
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 단위 72개, 공개 브라우저 9개, 관리자 브라우저 4개, 빌드
- commit: pending
