# Task: T02 발사 결과 카메라 2초 유지

## Status: done

## Goal
사탕 및 통나무 재생이 끝난 위치에서 결과를2000ms 확인한 뒤 적 반격 또는 다음 화면으로 넘어간다. 피해는 기다리지 않고1회 반영된다.

## Decision Summary
- 사용자의 후속 요청으로 복귀 전 읽는 시간을 확보한다. 굴림 시간/거리/피해 계산은 T01 그대로 유지한다.
- committed run과 presentation 단계를 분리한다. 기다리는 동안 발사를 취소해 결과를 되돌릴 수 없다.

## Implementation

### I01. 결과 확인 상태
- Related Files:
  - `src/game/gameSession.js` :: initial state, routeCombat, fireShot, completeShotReview, guards; modify
  - `src/components/BattleScreen.jsx` :: BattleArena props, status; modify
  - `src/components/BattleArena.jsx` :: camera mode, review timer and response rendering; modify
  - `src/components/ProjectileFlight.jsx` :: settled candy presentation; modify
- Schema: session `shotReview:{id:number}|null`, default null. enemyResponse는 대기 중에도 다음 windup 데이터를 보유하여 기존 playerHpBefore/ammoLost 표시를 보존한다.
- API: `fireShot({hitIds,selectedTargetId,shotMeta,reviewResult=false})`. 생산 BattleArena만 reviewResult:true 전달. `completeShotReview(id:number):void`는 현재 id 일치 시에만 완료한다.
- routeCombat(run,event,reviewResult=false): 결과 반영은 그대로. reviewResult면 shotReview{id}와 enemyResponse windup을 publish하고 finishCombatRouting은 보류. 아니라면 기존 흐름.
- completeShotReview는 shotReview를 null로 만들고 enemyResponse가 있으면 그대로 재생 시작, 없으면 finishCombatRouting을 호출한다. 중복·이전 id는 무시한다.
- setAim/fireShot/useConsumable 및 enemy phase callbacks는 review 중 무시/거절. 새 게임은 review를 초기화한다.
- BattleArena는 review 중 follow camera를 유지하고 EnemyResponse·notice·attacking pose를 렌더하지 않는다. 종료 지점 focusRef를 유지하며, 통나무 후행이 있으면 마지막 logMotion 종료 좌표에 둔다.
- useEffect([shotReview?.id,onReviewComplete])의2000ms timer로 id를 전달한다. unmount/변경 시 clearTimeout. resize/blur로 committed 결과가 취소되지 않는다.
- 바닥에 멈춘 사탕은 review 중 최종 자세로 남긴다. 먼지/잔상은 종료하고 적에 맞은 사탕은 숨긴다. timer 완료 시 flight를 제거한다.
- 결과 확인 중 HUD·입력 잠금, data-aim-phase=reviewing. 설명은 결과 확인 중임을 알리고 반격 피해는 미리 표시하지 않는다. 모션 감소도2000ms 확인 시간 유지.
- 대기 중인 오븐 반격의 healedEnemy는 visibleEnemies에서 빼서, 반격 impact 이전에 회복이 미리 노출되지 않도록 한다. 실제 run/RNG는 변경하지 않는다.

### I02. 검증
- Related Files:
  - `tests/game-session.test.mjs` :: 결과 즉시 반영·전환 보류·중복 완료·입력 보호; modify
  - `tests/e2e/shot-review.spec.cjs` :: 고정 시계 실발사 결과 hold; new
  - `tests/e2e/support.cjs` :: idle 대기 timeout을 필요한 경우10초로; modify
- 일반 굴림 shot 완료 후1990ms까지 review/follow 유지, 반격 없음,2010ms 이후 반격 시작. 결과/탄수는1회만 변경.
- clear shot도 결과 화면2000ms 유지 후 reward 이동. 이전id/중복완료가 다음턴을 진행시키지 않아야 한다.
- 모션 감소·모바일·새 게임 초기화 및 타이머 정리 확인. 반복 플레이 테스트 시간은 늘어난 의도적 대기만큼 조정한다.

## Acceptance Criteria
- [x] 결과 위치에 카메라가2초 머문다.
- [x] 피해는 즉시 반영되고 반격·화면 전환은 대기한다.
- [x] 입력 잠금과 중복 처리 방지, 기존 굴림·전투 유지.

## Validation
- `npm.cmd test`, `npm.cmd run build`.
- `npx.cmd playwright test tests/e2e/shot-review.spec.cjs tests/e2e/candy-roll-visibility.spec.cjs tests/e2e/enemy-response.spec.cjs tests/e2e/forest-log.spec.cjs --config tmp/roll-vfx-playwright.config.cjs`.
- 전체 브라우저 회귀를 실행하여 의도적 대기와 무관한 회귀가 없는지 확인한다. 임시4192 preview/config는 종료·제거한다.

## Commit Message
```text
feat(카메라): 발사 결과를 2초 보여준 뒤 다음 턴 진행

Plan: 2026-10-26-readable-candy-roll
Phase: P01-roll-playback
Task: T02-shot-review

- 발사 결과는 즉시 반영하고 카메라와 반격 전환을 2초 대기
- 결과 확인 중 입력 잠금과 중복 완료 방지 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 53c2921

## Validation Results
- `npm.cmd test`:127/127 통과. `npm.cmd run build`:성공.
- session 회귀2개가 기존 즉시 전환에서 실패함을 확인했고, 구현 후 통과했다.
- 결과 확인 브라우저 테스트는 `clock.pauseAt`으로 실제 경과를 멈춘 뒤, 발사 완료 후1950ms 유지/2050ms 전환을 검증한다. 단순 clock.install만 사용하면 assertion 중에도 시간이 흐르므로 고정 시계로 보완했다.
- 전체 E2E111개를2worker·60초 제한으로 실행:110개 통과, 숲 보스 돌진 위치 poll1개 실패. 그 테스트는 단일worker에서 재검증 통과(7.1초). 관련 전투 코드는 변경하지 않았다.
- 최종 빌드 후 결과 유지4개(오븐 반격 회복·탄수 선표시 방지 포함)+위 재검증1개=5/5 통과.
- 최종 source 보완: stale/undefined review 완료 무시, pending 오븐 회복은 반격 impact까지 숨김. 단위127개 재통과.
- 캡처: `tmp/shot-review-two-seconds.png`. 별도 preview4192와 임시 config는 검증 후 정리한다.
- 추가 발견: 기존 보스 돌진 위치 poll은 병렬 실행에서 순간 이동 구간을 놓칠 수 있다. 이번 Task에서는 테스트 동작을 바꾸지 않고 단독 재검증 결과를 기록한다.
