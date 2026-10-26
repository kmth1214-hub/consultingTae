# Task: T01 Combat Transition

## Status: done

## Goal
혼돈 최종전에서 하나의 보스가 세 보스로 바뀌어도 피해·점수·방어·아이템과 무작위 결과가 정확히 한 번만 확정된다.

## Decision Summary
- 융합 56 HP, 50% 이하에서 분리, 0 HP 처치 우선. 15:18:23 정수 비율 분배. 융합 크기414, 분리276.
- 발사·연쇄 처리 후 일반 반격 대신 착지 피해1~3 한 번. 방어 > 미사용 우유 보호막 > 얼음50% 기존 우선순위와 내림 규칙 재사용.

## Implementation
### I01. 전투와 이벤트
- Related Files:
  - `assets/js/battle-engine.js` :: `createRoundEnemies`, `createRunState`, `enterRound`, `finishAction`, `resolveEnemyTurn`, `resolveProjectile` — modify
#### Details
```typescript
type ChaosBossPhase = null | 'fused' | 'split';
type BossSplit = { fromEnemy: Enemy; remainingHp: number; bosses: Enemy[]; shock: EnemyAttack };
// BossSplit.previousScenery:{toppledObstacleIds:string[],forestLogDebris:object[],obstacleDebris:object[]}
// 리뷰 동안 분리 전 장애물 상태를 표시하기 위한 읽기 전용 스냅샷.
// Enemy 신규 optional normalAttackCount:number (융합 일반 공격 순환용).
// Run 신규 chaosBossPhase:ChaosBossPhase. create/enterRound에서 roster를 기준으로 설정.
// CombatEvent 신규 bossSplit?:BossSplit. 기존 enemyAttack은 분리 턴 null.
```
- 혼돈3의 `chaos-fused-boss`는 `isBoss:true,hp:56,maxHp:56,attackCount:0,normalAttackCount:0,alive:true`. 다른 roster 유지.
- 융합 공격은 전체 attackCount 매3 특수, 세 특수 uniform 독립 추첨. 일반 순환은 별도 normalAttackCount로 멧돼지→눈사람→로봇. 이벤트 `kind`는 실제 융합체, `attackKind`는 재사용할 공격 종류. 동일한 방어·특수·투척 실수 규칙 적용.
- `finishAction`에서 모든 적 처치 우선, 생존 융합체 hp<=28이면 분리. 체력 합계는 원래 비율 몫을 내림 후 소수부 큰 순서(동률 원래 순서)로 잔여 배분. 0 HP 개체는 alive:false. 개별 maxHp는 기존 Chaos 보스 값15/18/26, attackCount는0.
- 세 보스 교체, enemyTurnIndex=0, chaosBossPhase='split'. toppledObstacleIds/forestLogDebris/obstacleDebris만 정리. 기존 사탕/점수/능력 사용/방어 상태 보존. 착지 피해는 shield/Milk/ice 공통 함수를 통해 한 번 적용; RNG1~3은 한 번 확정. 기존 ammo<=0 패배와 HP 패배 우선순위를 보존하고 전환이 있으면 시각 재생 후 결과 처리.
- 융합 HP0이면 markRoundClear, bossSplit 없음. 분리 후에는 다시 합체하지 않음.
- 신규 helper를 내부 함수로 두고 기존 API 반환 형태 유지. 테스트는 실제 resolveProjectile/resolveEnemyTurn 사용, damage override는 경계 재현에만 사용.

### I02. 세션 전환 계약과 배치
- Related Files:
  - `src/game/gameSession.js` :: `routeCombat`, actions — modify
  - `src/game/battlefieldModel.js` :: `buildBattlefield` — modify
  - `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield` — modify
  - `src/game/battlefieldCamera.js` :: `getCameraPose` — modify
#### Details
```typescript
type BossTransition = { id:number; stage:'flight'|'impact'; split:BossSplit };
// SessionSnapshot.bossTransition:BossTransition|null (default null).
// actions.advanceBossTransition(id:number):void; completeBossTransition(id:number):void
// buildBattlefield/buildPlayableBattlefield optional encounterPhase:'split'|null.
```
- routeCombat은 split 이벤트를 session에 보관. shotReview가 끝날 때도 전환이 남으면 결과 화면으로 이동하지 않음. 조준/발사/소모품은 transition 동안 차단. id 확인으로 stale/중복 콜백 무시. 완료 시 transition=null 후 기존 결과 라우팅. startRun/home/bonus 등 새 전투 진입 시 초기화.
- 배치 phase split이면 기존 seeded enemy placement를 유지하고 장애물 정확히3개, 각 보스 근처에 non-overlap gap을 두고 배치. ids에는 `split` 포함. 기존 first-contact 도달 검증 유지. 일반 phase 장애물 개수2~4 유지. 융합 크기414 및 collider 반영. layout key에 phase 포함.
- 분리 카메라는 전체 조망에 포물선 최대 높이를 담을 여유를 추가하고 viewport에 맞춰 축소한다. reduced motion은 정적 전체 조망.

### I03. 단위 검증
- Related Files: `tests/chaos-fused-boss.test.mjs` — new
- 56 시작, 다른지역 불변, 정확히28/29 경계, 직접+연쇄 종료 후 분리, 0처치 우선, HP1/2 잔여, 합계 보존, 반복 특수·일반 순환, 분리 후 기존 AI, 방어별/치명 착지, ammo/능력/점수 유지, 세션 stale/blocked/completion, split 배치 검증·카메라를 실제 모듈로 확인.
- 기존 tests의 Chaos3 세 보스 전제는 T03에서 신규 계약에 맞춰 갱신한다. 기존 의미를 삭제하지 않는다.

## Acceptance Criteria
- [x] HP 경계·방어·체력 합계·RNG 한 번 확정 통과
- [x] 재생 중 입력과 결과 이동이 차단되고 정상 종료
- [x] 실제 충돌 기준 크기·split 장애물3 및 비중첩·도달 검증 통과

## Validation
- `node --test tests/chaos-fused-boss.test.mjs` — 신규 경계 테스트 통과
- `npm.cmd run build` — 프로덕션 번들 성공

## Commit Message
```text
feat(혼돈): 융합 보스와 체력 보존 분리 전투 구현

Plan: 2026-10-26-chaos-fused-boss
Phase: P01-encounter
Task: T01-combat-transition

- 일반 공격 순환과 무작위 세 번째 특수기 적용
- 연쇄 피해 후 분리와 방어 가능한 단일 착지 피해 확정
- 세션 입력 제한과 새 장애물 세 개 배치 연결
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 신규 단위10/build 통과
- commit: pending
- 자동 승인 검토 사용량 제한으로 Git 쓰기를 재시도하거나 우회하지 않음. 사용자 연속 실행 요청에 따라 T02 구현 진행.
- 준비된 메시지: `tmp/chaos-fused-t01-commit.txt`. 기존 미커밋 engine/session 변경과 혼합 스테이징 금지.
- 추가 경계 검증: 마지막 탄약으로 비치명타면 기존 탄약소진 패배가 우선, 마지막 탄약으로 처치하면 승리 우선. 전투11 + 궤도1 테스트 통과.
