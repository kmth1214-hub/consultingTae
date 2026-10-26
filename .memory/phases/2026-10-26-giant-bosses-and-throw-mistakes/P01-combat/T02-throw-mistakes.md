# Task: T02 투척 실수

## Status: done

## Goal
드문 적 투척 실수를 실제 피해0과 일치하는 포물선/동작으로 보여준다.

## Implementation
### I01. 전투 이벤트
- modify `assets/js/battle-engine.js` :: resolveEnemyTurn. kinds snake/dry-ice/snowball/washing-robot/cowardly-snowman/oven-robot의 일반 공격에만 일반10%, boss5% 실패. 보스 세 번째 special 및 근접boar 제외.
- Event 기존 필드 유지 + `missed:boolean`, `missStyle:'slip'|'overshoot'|null`. 판정 RNG 1회, 표본 >=.9(일반)/.95(boss)이 실수; 실패구간 전반 slip, 후반 overshoot. special/근접은 추가 RNG 없음. 렌더 RNG 없음.
- turnNumber/공격 순서/boss attackCount 갱신 뒤 shield/milk/얼음감소 소비 전에 실패 return. damage0, blockedfalse, blockedBynull, specialnull, healedEnemy0, ammoLost0, consumablesBlockedfalse, playerHp 동일. 보호 상태들 유지. 기존 명중 계산 유지.
### I02. 재생
- new `src/game/enemyAttackPresentation.js` :: getEnemyAttackTarget(attack,layout): finite {x,y}. 정상 player.impact, slip={x:player.x+player.width+180,y:groundY-14}, overshoot={x:20,y:groundY-340}. 겹치지 않는 짧은착지/높은통과 궤적.
- modify `src/components/EnemyResponse.jsx`: 확정 target으로 parabola/잔상 재생. 실패 windup '?' 및 slip 몸동작, impact는 player-impact/shield-impact 대신 landing puff/miss text. responseLabel에 명확한 실수/피해없음.
- modify `MonsterGroup.jsx`, `src/styles/arena.css`: data-miss-style, slip keyframe과 당황 표시; reduced 정지. 정상·특수동작 유지.
- modify `BattleScreen.jsx` :: combatMessage — miss는 적 투척 빗나감으로 표시, 반격−0 제거.
- PlayerCookie는 기존 damage>0 조건으로 실수 피격 표시를 만들지 않음. 별도 RNG/전투 판정 금지.
### I03. 검증
- new `tests/enemy-throw-mistakes.test.mjs`: 일반10%/boss5% 경계/두종류, 특수/근접 제외, HP·공격카운트·방어/milk/얼음감소 유지와 후속명중 소비, source/target geometry.
- new `tests/e2e/enemy-throw-mistakes.spec.cjs`: RNG로 실제 slip/overshoot 재현, projectile 종점/라벨/피격없음/방어유지/후속공격, boss 일반miss와3rd special, reduced phone.
- 기존 min/max 공격 테스트는 새로운 RNG draw 때문에 잘못된 전제가 있는 fixture만 갱신하며 피해 규칙을 약화하지 않는다.
- modify `tests/battle-engine.test.cjs`: .999는 이제 실수이므로 눈 피해감소/혼돈 guard 소비 테스트는 정상 명중 표본.5와 최대 피해 표본.999를 분리.
- new `tests/studio-e2e/boss-mistakes.spec.cjs`: 관리자 도시3 진입, 보스크기/실수, 특수부터 시작 전환 및 실제 프로필 격리 확인.

## Acceptance Criteria
- [x] 일반10%/보스5%, 특수/근접 제외
- [x] 실수 피해0·보호상태 유지·동작/궤적 일치
- [x] 재생/취소/관리자/폰에서 중복 판정 없음

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test enemy-throw-mistakes.spec.cjs monster-throw.spec.cjs enemy-response.spec.cjs` 또는 독립 preview config

## Commit Message
```text
feat(전투): 몬스터 투척 실수와 빗나가는 포물선 추가

Plan: 2026-10-26-giant-bosses-and-throw-mistakes
Phase: P01-combat
Task: T02-throw-mistakes

- 일반 투척10%·보스 일반 투척5% 실수와 미끄러짐·과투척 재생
- 빗나간 공격은 피해와 방어 소모 없이 공격 순서만 진행
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 단위160/160, production build 통과. 1,000표본×6종류의 실수율/경계, 세 번째 special/근접 제외, 보호상태 유지와 후속소비 검증.
- production 브라우저20개(기존 enemy-response11+monster-throw5+신규4) 검증. 첫 실행의18개는 통과했으며 신규2개는 전역 Math.random 변경으로 세션이 이미 캡처한 RNG를 교체할 수 없어서 실패. 실제 engine.resolveProjectile 입력의 RNG만 고정하는 테스트 제어로 수정 후 두 경우 재실행 통과.
- 마지막 화면 검토에서 overshoot 착지 문구가 왼쪽에 잘려 start anchor로 교정, 해당 실제 두 경로 재검증.
- 관리자 브라우저1 통과: 도시3의276크기, 실수와 강제 세 번째 특수 전환, 실제 프로필 false 유지.
- 관리자 첫 cold 진입 지연 후 재시도에서 진입 성공. 다음 실패는 hidden preview와 live toolbar의 동일 checkbox label을 getByLabel이 모두 고른 테스트 문제로, visible role checkbox로 고쳐 통과. 제품 동작 변경 없음.
- `tmp/enemy-mistake-slip.png`, `tmp/enemy-mistake-overshoot.png`, `tmp/studio-giant-boss-slip.png` 검토.
- 범위 밖 발견: 특이사항 없음. git commit은 이전 자동 승인 검토 사용량 제한으로 미실행, 우회/재시도 없음.
