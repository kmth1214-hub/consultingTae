# Task: T05 태엽 까마귀 순찰과 급강하 반격

## Status: pending

## Goal
까마귀가 공중에서 좌우로 순찰하고 스톤이 실제 위치에 닿을 때만 피해를 받으며, 반격할 때 쿠키 쪽으로 급강하한 뒤 돌아오게 한다.

## Decision Summary
- 짧은 수평 구간을 반복 순찰한다. 충돌 판정은 발사 예약 시의 위치·이동 속도를 사용하고 렌더와 같은 공식으로 계산한다.
- 반격 횟수와 피해는 도시 일반 몬스터와 동일하다. 시각적 급강하가 데미지를 중복 적용하지 않는다.

## Implementation

### I01. 순찰 위치와 충돌
- Related Files:
  - `src/game/battlefieldModel.js` :: enemy placements — 까마귀 `patrol:{centerX:number,range:number,periodMs:number,phase:number}` 메타데이터를 배치마다 결정, 화면 경계 밖으로 나가지 않게 클램프; modify.
  - `src/game/shotGeometry.js` :: `planShot`, `findMovingRiderContact` 인접 충돌 함수 — 까마귀 이동 원형 콜라이더와 비행 경로의 시간별 첫 접촉을 판정; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — 발사 시작 시간을 고정하고 까마귀의 해당 시점 위치를 플래너에 전달; modify.
  - `src/components/MonsterGroup.jsx` :: `MonsterGroup` — 같은 patrol 공식으로 현재 x 위치 표시, 정지/피격 중에도 기준 위치와 콜라이더 동기화; modify.
  - `src/components/BattleArena.jsx` :: `makeSolution` — 조준 미리보기에도 같은 동적 배치 사용; modify.
- Signatures & Types: `patrolX(patrol,elapsedMs):number`; `flightStartMs:number`. 기존 `ShotPlan`의 `enemyContacts`와 `targetId` 계약 유지. 충돌 시간이 월드 비행 시간과 일치해야 한다.
- Data & Schema Fields: `placement.patrol`은 까마귀에만 존재. 고정 월드 centerX, 왕복 거리 `range`, 주기 `periodMs`, 시작 위상 `phase`를 숫자로 둔다. 난수는 배치 시에만 사용하며 프레임별 난수 금지.
- Execution Flow / Logic: 까마귀 충돌은 사탕 반지름+몬스터 반지름의 시간별 교차로 판단한다. 기존 장애물과 일반 몬스터의 첫 충돌 순서를 유지한다. 까마귀를 시각적으로 움직일 때 `left` 또는 `transform`을 동일 월드 좌표에서 계산한다.
- Error Handling: patrol 메타데이터가 없으면 기존 고정 콜라이더 사용. 잘못된 비행 상태는 보상/피해 처리 전 거부.

### I02. 급강하 반격
- Related Files:
  - `assets/js/battle-engine.js` :: `enemyAttack`/공격 시각 정보 — 까마귀를 투사체 없는 급강하 타입으로 분기하되 한 번의 피해 처리 유지; modify.
  - `src/components/EnemyResponse.jsx` :: `attackStyle` — `clockwork-crow` 급강하 스타일; modify.
  - `src/components/MonsterGroup.jsx` :: 반격 단계별 급강하 클래스; modify.
  - `src/styles/arena.css` :: `.monster--crow.is-attacking` — windup, dive, return 애니메이션; modify.
- Execution Flow / Logic: 선택된 까마귀가 쿠키 쪽으로 전진/하강했다가 원래 순찰 위치로 돌아온다. 사망 또는 전투 종료 시 애니메이션을 중단한다. 피해는 기존 엔진의 단 한 번의 `applyIncomingDamage` 경로를 쓴다.

### I03. 검증
- Related Files:
  - `tests/city-crow.test.mjs` :: 고정 시계로 순찰/명중/빗나감/반격 한 번 검증; modify.
  - `tests/e2e/city-crow.spec.cjs` :: 공중 그림·왕복·급강하 시각 스모크; new.

## Acceptance Criteria
- [ ] 공중 위치가 조준·비행·피격에서 일치한다.
- [ ] 고정 지점으로 허공을 쏴도 움직인 까마귀를 맞힌 것으로 처리하지 않는다.
- [ ] 급강하 뒤 복귀하며 피해는 한 번만 발생한다.

## Validation
- `node --test tests/city-crow.test.mjs`
- `npx playwright test tests/e2e/city-crow.spec.cjs`
- `npm run build`

## Commit Message
```text
feat(city): 까마귀 순찰과 급강하 반격 구현

Plan: 2026-10-30-cookie-stone-slots-city-crow
Phase: P02-presentation
Task: T05-city-crow-motion

- 시간 기반 공중 순찰과 실위치 충돌 판정 연결
- 까마귀 급강하 및 복귀 연출 추가
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
