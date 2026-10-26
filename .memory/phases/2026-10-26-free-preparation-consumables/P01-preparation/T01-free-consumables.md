# Task: T01 소모품을 무반격 발사 준비로 변경

## Status: done

## Goal
소모품은 반격 없이 쓰고 사탕 발사 사이1개만 사용한다. 방어는 실제 다음 발사 후 반격에서 소모된다.

## Decision Summary
- 수락된 소모품은 탄수·영구 무기 큐·턴·보스 공격 횟수를 건드리지 않는다.
- 사탕 발사, 라운드 진입만 사용권을 새로 준다. UI 잠금뿐 아니라 엔진도 재사용을 거절한다.

## Implementation

### I01. 공통 엔진 규칙
- Related Files:
  - `assets/js/battle-engine.js` :: createRunState, enterRound, resolveProjectile, useConsumable, finishAction; modify
- Schema: RunState.consumableUsedSinceShot:boolean=false. 이전/테스트 상태에 필드가 없으면 false 취급.
- `finishAction(state,event,rng,enemyResponds=true)`에서 클리어/패배 판정은 그대로, 생존 적 반격은 enemyResponds=true일 때만 호출한다.
- useConsumable 검증 순서: 기존 combat-ended/unknown/aiming/blocked/empty 뒤 item-used 검사. 거절은 상태/RNG/재고를 변경하지 않는다.
- 수락 시 flag=true, 재고1차감·효과횟수·연금술사 점수·개별 효과는 그대로. turnNumber 증가는 제거한다. finishAction(...,false)로 마무리한다. 방어/불공은 다음 사탕까지 유지한다.
- resolveProjectile에서 유효성/탄수 검증 통과 후 flag=false. 미스·역발사도 발사로 인정하지만 취소·반격·리뷰 중 요청·유효하지 않은 shotMeta는 세션 가드 때문에 여기에 도달하지 않는다.
- enterRound/createRunState는 flag=false. 창 전멸 시 기존 markRoundClear·보상·프로필 저장이 정상 동작해야 한다.

### I02. HUD와 메시지
- Related Files:
  - `src/game/gameSession.js` :: REASONS item-used; modify
  - `src/components/ConsumableTable.jsx` :: disabled/title/status; modify
  - `src/components/BattleScreen.jsx` :: 방어 안내 문구; modify
  - `src/components/BattleArena.jsx` :: 결과 확인 중 대기 중인 방어 보호막 표시 유지; modify
  - `src/styles/arena.css` :: 작은 HUD caption 상태 표시; modify
- 준비 사용 전 "반격 없이 사용 · 발사 사이1개", 사용 후 "사용 완료 · 사탕 발사 후 다시 사용"을 표시한다. 동결 안내가 우선이다.
- 버튼은 flag=true에서 모두 비활성. 단축키는 엔진 item-used 거절 메시지 "이번 발사 전에 소모품을 이미 사용했어요. 사탕을 발사하면 다시 사용할 수 있어요."를 표시한다.
- 방어 메시지는 다음 발사 후 반격 차단임을 알려준다. 기존 모바일·키보드·스크린리더 이름을 유지한다.
- 발사 결과2초 확인 중 엔진은 다음 반격을 이미 계산하지만, 보호막 그림은 pending defense 반격까지 유지한다.
- 좁은 화면은 기존 HUD 높이를 유지하도록 caption에 짧은 상태를 표시하고, 긴 상태 문장은 스크린리더용으로 유지한다.

### I03. 규칙 회귀 및 기존 적 공격 테스트 이관
- Related Files:
  - `tests/battle-engine.test.cjs`, `tests/game-session.test.mjs`, `tests/gameplay-rules.test.cjs`; modify
  - `tests/e2e/game-flow.spec.cjs`, `tests/e2e/enemy-response.spec.cjs`, `tests/e2e/player-cookie.spec.cjs`; modify
  - `tests/e2e/consumable-preparation.spec.cjs`; new
  - `tests/e2e/accessibility.spec.cjs` :: 반격 경고 viewport 확인의 발사 경계 갱신; modify
- Heal은 순수25 회복·무반격/턴0, Defense는 준비 후 실제 발사에서 보스 특수 차단, Fireball/Spear 기존 효과·점수 유지.
- 두 번째 소모품은 다른 종류도 금지, 실패 요청/조준 취소/blur는 제한 유지. 실제 발사·새 라운드는 해제. 거절 시 deepEqual 상태/RNG 보장.
- 세션 반격 상태 테스트는 방어 준비 뒤 실제 fireShot으로 반격을 만든다.
- 브라우저의 적 모션·피격·보스3번째 반격·우유 방어·모션 감소 테스트는 실제 짧은 발사로 카운터를 만들고 기존 시각 검증을 유지한다. 보스 돌진 비교 기준은 발사 전 위치를 기록해 순간 travel 시작을 놓치지 않게 한다.
- 기존 Heal/Defense/Fireball E2E를 새 발사 경계 기준으로 갱신한다. PlayerCookie 회복은 공격 없는 준비 중 연출을 확인한다.

## Acceptance Criteria
- [x] 네 종류 모두 소모품 자체로 반격·턴 진행 없음.
- [x] 발사 사이1개 제한이 엔진·버튼·키보드에서 일치.
- [x] 방어·강화·회복·창 및 라운드 보상 효과 유지.
- [x] 조준 취소/리뷰/반격·동결 중 우회 불가, 모바일 표시 정상.

## Validation
- `npm.cmd test` — 실제 기존 엔진/세션 테스트 및 새 경계 회귀 통과.
- `npm.cmd run build`.
- `npx.cmd playwright test tests/e2e/consumable-preparation.spec.cjs tests/e2e/game-flow.spec.cjs tests/e2e/enemy-response.spec.cjs tests/e2e/player-cookie.spec.cjs tests/e2e/candy-details.spec.cjs --config tmp/preparation-playwright.config.cjs --timeout=90000` (별도4192 preview).
- 위 흐름이 통과하면 전체 E2E를 실행한다. 신규 규칙으로 바뀐 행동을 반영하되 피해·모션 검증을 삭제하지 않는다. 임시 preview/config는 정리한다.

## Commit Message
```text
feat(소모품): 반격 없는 발사 준비와 발사 사이 한 개 제한 적용

Plan: 2026-10-26-free-preparation-consumables
Phase: P01-preparation
Task: T01-free-consumables

- 소모품 사용에서 반격과 턴 소모 제거
- 실제 사탕 발사 후 사용 제한 해제 및 HUD 상태 안내
- 쉴드·보스 반격·아이템 효과 회귀를 실제 발사 기준으로 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 수정 전 새 엔진 규칙5개가 실패함을 확인했다. 구현 후 `npm.cmd test`:130/130 통과.
- 최종 `npm.cmd run build` 성공.
- 대상 E2E29개 최초 실행27통과/2실패. 두 실패는 보상 draw로 바뀐 lastEvent를 읽던 계측과, 실행 중 흐르는 실제 시계로 피격 전 HP를 놓친 테스트였다. accepted useConsumable 이벤트를 직접 확인하고, 해당 투사체 테스트를 clock.pauseAt 기반으로 고정했다. 수정 후 준비3개+투사체1개=4/4 통과.
- 나머지86개 E2E를 대상5개 파일을 제외한 파일명 배열로 실행하여86/86 통과. 대상29개와 합쳐115개 범위를 검증했다. 반복되는 동일 검증은 재실행하지 않았다.
- 최종 보호막 표시 보완 후 다시 빌드하고 desktop/mobile 준비2개+실제 쉴드 차단1개를 재검증하여3/3 통과.
- 보스 특수 공격은 실제3발 후 발동, Defense 우선/Milk 보호, 투사체 경로·피격 시점, 회복·점수·탄수·큐 유지·창 클리어·다음 라운드 슬롯 초기화를 확인했다.
- 모바일 긴 상태 문장으로 HUD가 커지는 것을 피하기 위해 caption에 짧은 상태를 표시하고 긴 문장은 접근성 안내로 유지했다. 캡처: `tmp/preparation-desktop.png`, `tmp/preparation-mobile.png`.
- 소모품 사용 후 취소로 제한을 우회할 수 없다. 결과 확인 중 엔진이 소비한 방어의 그림은 pending defense 반격까지 유지한다.
- 임시4192 preview/config는 검증 후 종료·제거한다. 사용자 mockup 및 기존 미추적 파일은 포함하지 않는다. 추가 발견 사항 없음.
