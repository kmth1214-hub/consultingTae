# Task: T01 사탕 보상 해금

## Status: done

## Goal
해금 전 라운드/야영지에서 우유맛·바람궁수 사탕 획득을 막고, 눈 클리어 후 즉시 후보에 포함한다.

## Decision Summary
- 기본 쿠키 3종 유지. 제한은 우유맛·바람궁수 사탕의 획득 후보에 적용.
- 과거 프로필 해금과 이번 플레이 달성 기록을 섞지 않는다.

## Implementation
### I01. 엔진의 공통 보상 후보
- `assets/js/battle-engine.js` :: `WEAPON_CATALOG`, `createRunState`, `drawRewardChoices`, `chooseCampReward`, `grantWeapon` — modify.
- Signatures: 기존 함수 시그니처 유지. private `availableRewardWeapons(state): Weapon[]` 추가.
- Schema: 두 사탕 catalog `requiresSnowClear: true` (나머지는 생략). Run `snowRewardsUnlocked: boolean`, 기본 false, create config의 strict true로만 초기화. 기존 `snowAreaCleared: boolean`은 이번 플레이 달성 기록으로 유지.
- 후보 조건: requiresSnowClear 없는 사탕 또는 `state.snowRewardsUnlocked === true || state.snowAreaCleared === true`.
- 라운드/야영지 모두 이 후보를 shuffle한다. 선택 수 3, 등급 및 합성 로직 유지. grantWeapon에서도 잠긴 카탈로그 id는 `accepted:false,reason:'candy-locked'`로 거부하여 오래된 후보/대기 보상도 획득 불가. 거부 전에 변경 없음.
### I02. 프로필 전달과 안내
- `src/game/gameSession.js` :: `startRun` — createRunState에 프로필 snowAreaCleared를 snowRewardsUnlocked로 전달. 거부 안내와 해금 알림에 사탕을 포함.
- `src/components/CharacterSelect.jsx`, `RewardScreen.jsx`, `CampScreen.jsx` — 제한 또는 해금 상태를 짧게 안내. 보상 안내는 run의 과거/현재 해금 조건 사용.
- 관리자 createStudioSession은 options 전달을 유지하므로 기존 내부 프로필 true가 자연스럽게 적용됨. 별도 사용자 저장소 접근 금지.
### I03. 회귀 검증
- new `tests/candy-unlock.test.mjs`: 여러 RNG에서 기본 3종만, 모든 5종 해금 가능, C/B 야영지 및 합성 재진입 후보 유지, grant 거부 무변경, 프로필 true 재시작 및 false 기본, 실제 눈 보스 즉시 해금과 저장, 관리자 격리.
- new `tests/e2e/candy-unlock.spec.cjs`: 실제 보상 화면 기본 3종, 저장된 해금으로 milk/wind 등장, 눈 보스 완료 직후 안내/후보와 재접속 캐릭터 선택.

## Acceptance Criteria
- [x] 두 보상 경로 모두 미해금 사탕 제외
- [x] 과거 프로필 및 현재 눈 보스 클리어 모두 해금
- [x] 합성·소모품·관리자 테스트 유지
- [x] 단위·브라우저·빌드 통과

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test candy-unlock.spec.cjs` (또는 동일 production preview를 사용하는 독립 config)

## Commit Message
```text
feat(보상): 눈 지역 해금 전 특수 마법사탕 획득 제한

Plan: 2026-10-26-snow-candy-reward-unlock
Phase: P01-rewards
Task: T01-reward-unlock

- 라운드와 야영지는 해금 전 기본 3종 사탕만 제공
- 과거 브라우저 기록과 현재 눈 보스 클리어로 특수 사탕 해금
- 합성 및 관리자 격리와 보상 화면 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

## Validation Results
- 전체 단위 154/154 통과. 신규 5개는 100개 seed와 C/B 야영지, 합성 재진입, 잠긴 후보의 변경 없는 거부, 프로필 분리, 실제 눈 보스 클리어/저장, 관리자 격리를 검증.
- production build 통과. 새 브라우저 테스트 3개와 기존 야영지/연속 합성/모바일 3개 모두 통과 (6/6).
- `tmp/candy-locked-rewards.png` 실제 화면 검토: 기본 세 카드와 해금 설명이 보임.
- 첫 단위 실행에서 테스트가 라운드 진입의 정상 큐 셔플까지 재추첨으로 판단하여 실패. 보상 대기 items의 동일성으로 수정해 의미에 맞는 검증으로 교정했으며 전체 재실행 통과.
- 기존 자동 승인 검토 사용량 제한 때문에 git add/commit 미실행. 우회나 재시도 없음. 완료 상태 전진은 커밋 후 동기화.
- 범위 밖 발견: 특이사항 없음.
