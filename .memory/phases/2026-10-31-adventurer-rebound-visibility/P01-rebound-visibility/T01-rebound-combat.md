# Task: T01 등급별 충돌 경로와 명중별 피해

## Status: done

## Goal
모험가 전용 스톤이 적·바닥 충돌 후 등급별 횟수까지 실제 탄도로 튕기고, 서로 다른 몬스터의 실제 접촉마다 등급 피해를 독립 추첨한다.

## Decision Summary
- C/B/A는 각각 최대 1/2/3회 반동한다. 직접 접촉한 몬스터마다 별도 무작위 피해를 준다.
- 창은 기존 관통 효과를 우선하며 일반 스톤·다른 캐릭터 능력의 한 대상 판정을 유지한다.

## Implementation
### I01. 탄도 및 예약 발사
- Related Files: `src/game/shotGeometry.js` :: `planStackedShot`, `planShot`; `src/game/shotResolution.js` :: `preparePhysicalFlight`; `src/components/BattleArena.jsx` :: `makeSolution`.
- Signatures & Types: `planShot({loadedCandyGrade?: 'C'|'B'|'A', ...})`; `planStackedShot({maxBounces: 0|1|2|3, ...})`; 결과의 `bounces: {time:number,point:{x:number,y:number},trigger:'ground'|'enemy'}[]`, 기존 `bounce`는 첫 이벤트 호환 필드. `enemyContacts: {id,point,time,distance}[]`는 모험가 및 창에 제공.
- Logic: 각 실제 적 접촉을 시간·거리 순으로 기록하고 이미 맞은 적은 재충돌에서 제외한다. 충돌 시점의 수평·수직 속도로 반동 경로를 이어 붙인다. 바닥도 남은 횟수에서 반동한다. 최대 횟수 이후에는 기존 착지·굴림을 수행한다. 미리보기·예약 발사에 동일 등급을 전달한다. 경로 시간·거리와 접촉 기록을 단조 증가시킨다.
### I02. 피해 및 검증
- Related Files: `assets/js/battle-engine.js` :: `resolveProjectile`, `rollWeaponDamage`; `src/game/gameSession.js` :: `validEnemyContacts`; `tests/shot-geometry.test.mjs`, `tests/shot-hit-integrity.test.mjs`, `tests/battle-engine.test.cjs`.
- Data fields: `shotMeta.enemyContacts` 최대 길이는 등급별 튕김 횟수+1이며 실제 예약된 경로의 접촉만 허용한다. `hits[]`는 명중별 실제 제거 체력과 점수·남은 HP를 기록한다.
- Logic: 전용 스톤 경로에 한해서 시간 순서로 직접 명중을 처리한다. 최초 및 후속 명중은 각각 `rollWeaponDamage` 호출로 독립 피해를 정한다. 불공은 각 직접 피해에 기존 2배를 적용한다. 기본 스톤의 다중 타격 방지는 유지한다. 피해가 0이어도 경로 충돌은 기록한다.

## Acceptance Criteria
- [x] C/B/A 반동 1/2/3회이며 몬스터 명중 후에도 비행한다.
- [x] 실제 접촉한 서로 다른 몬스터에 대해 독립 추첨이 적용된다.
- [x] 한 발의 적중 순서·시각 경로·결과 HP가 일치한다.

## Validation
- `node --test tests/shot-geometry.test.mjs tests/shot-hit-integrity.test.mjs tests/battle-engine.test.cjs`
- `npm.cmd run build`

## Commit Message
```text
fix(combat): 모험가 스톤 반동과 명중별 피해 수정

Plan: 2026-10-31-adventurer-rebound-visibility
Phase: P01-rebound-visibility
Task: T01-rebound-combat

- 등급별 적·바닥 충돌 반동 경로 연결
- 실제 명중마다 독립 피해 추첨 및 판정 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 758ad64
