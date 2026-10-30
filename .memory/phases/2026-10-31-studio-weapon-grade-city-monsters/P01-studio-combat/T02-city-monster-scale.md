# Task: T02 도시 몬스터 및 콜라이더 추가 확대

## Status: done

## Goal
관리자 도시 지도와 테스트 플레이에서 일반·공중·보스 몬스터를 현재보다 1.5배 확대하고 그림·충돌 판정을 같은 월드 좌표로 유지한다.

## Decision Summary
- 관리자 시범판 도시만 추가 1.5배이다. 기본 월드 1.5배는 유지하며 몬스터 최종 크기는 2.25배다.
- 쿠키·새총·사탕·장애물 및 일반 게임은 유지한다.

## Implementation
### I01. 월드 배치와 물리
- Related Files: `src/game/battlefieldModel.js` :: `buildBattlefield`; `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield`.
- Signature: 두 함수 모두 `enemyScale?:1|1.5` (기본값 1) 옵션. 도시가 아닌 지역에는 1.5를 허용하지 않는다.
- Data schema: `layout.enemyScale:number`, `layout.enemies[].size:number`, `layout.enemies[].collider:{id,x,y,radius}`; `size = baseSize * worldScale * enemyScale`, `radius = size*.42`, 중심 `y = actorY-size*.52`.
- Execution: 적 배치·장애물과 간격·받침 위 적·공중 순찰 경로가 확대된 콜라이더를 사용한다. 레이아웃 키에 enemyScale을 포함해 캐시 혼동을 막는다. playable 후보 검사도 같은 배율로 수행한다. 장애물 및 투사체 크기는 변경하지 않는다.
### I02. 관리자 화면과 예약 발사
- Related Files: `src/dev/createStudioSession.js` :: `createStudioScenario`; `src/components/BattleArena.jsx` :: `BattleArena`; `src/game/shotResolution.js` :: `preparePhysicalFlight`, `activatePhysicalFlight`.
- Data schema: `run.studioEnemyScale=area==='city'?1.5:1`.
- Execution: 관리자 미리보기·전투 렌더·조준 미리보기·예약 물리 경로·능력 발동 경로에 동일 enemyScale을 전달한다. 일반 게임의 인자가 없으면 1을 사용한다.
### I03. 검증
- Related Files: `tests/studio-session.test.mjs` :: 도시 배율 및 경로 일치; `tests/studio-e2e/map-studio.spec.cjs` :: 도시 미리보기와 테스트 플레이 몸체 크기 일치.
- Cases: 관리자 도시 2.25배, 다른 지역 1.5배, 일반 도시 1.5배, 도시 첫 적 콜라이더와 몸체 크기 일치, 예약 발사 경로와 미리보기 동일.

## Acceptance Criteria
- [x] 도시 관리자 몬스터의 몸체와 콜라이더가 현재보다 1.5배 커진다.
- [x] 미리보기·테스트 플레이·예약된 탄도가 동일 배치를 사용한다.
- [x] 다른 지역과 공개 게임의 크기 규칙은 유지된다.

## Validation
- `node --test tests/studio-session.test.mjs tests/shot-geometry.test.mjs`
- `npm.cmd run build`

## Commit Message
```text
feat(studio): 도시 몬스터와 피격 판정 확대

Plan: 2026-10-31-studio-weapon-grade-city-monsters
Phase: P01-studio-combat
Task: T02-city-monster-scale

- 관리자 도시 몬스터 크기 1.5배 추가 확대
- 미리보기와 실제 탄도에 같은 콜라이더 적용
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
