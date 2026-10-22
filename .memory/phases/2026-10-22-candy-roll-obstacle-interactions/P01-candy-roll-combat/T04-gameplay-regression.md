# Task: T04 브라우저 및 전투 회귀 검증

## Status: done

## Goal
지역별 효과, 굴림, 충돌 순서, 난수와 일회성 입력 상태를 실제 플레이 경로와 전체 테스트로 검증하고, 요청한 변경만 남긴 채 Plan/Phase/current를 정확히 완료 처리한다.

## Decision Summary
- 테스트는 실제 production bundle과 포인터 입력을 사용한다. 강제 엔진 주입만으로 굴림·충돌 성공을 주장하지 않는다.
- 기존 progression, 보스 공격, items, Wind bypass, scores, camera, reduced motion을 함께 회귀 검사한다. Azure는 완료 상태로 표시하지 않는다.

## Implementation

### I01. 실제 브라우저 장애물 플레이 시나리오
- Related Files:
  - `tests/e2e/obstacle-effects.spec.cjs` :: 지역 효과/굴림/반전 specs; modify
  - `tests/e2e/support.cjs` :: `installGame`, `dragPull`, `shoot`, state observation; modify only if a reusable actual-input helper is missing
  - `playwright.config.cjs` :: production preview configuration; read-only unless a reproduced test runner issue requires a fix
- **독립 확인 시나리오**:
  1. 각 영역에서 실제 drag path가 지면까지 가는 case와 장애물에 먼저 닿는 case를 각각 실행한다. Forest는 nearest living target에 3피해, Snow는 다음 attack 피해 감소, City는 모든 생존 적에게 각각 1/2 피해를 내는 fixed-RNG case를 확인한다.
  2. Chaos는 injected RNG 0, .25, .5, .75로 네 outcome을 각각 선택한다. aim inversion case는 다음 pull의 두 축을 독립 기준 계산과 비교하고, fire 이후 normal pull, cancellation 후 pending 유지, duplicate callback 방지를 확인한다.
  3. 굴림 중 적 선행/장애물 선행/동률 fixture를 path geometry로 만들고 passive DOM과 실제 state HP/effect event를 함께 확인한다. Wind homing은 장애물 collision/effect를 건너뛰고 기존 once-per-round 상태만 사용한다.
  4. HP=1 적, boss, 다수 적, last ammo, reduced-motion, 새 round 경계에서 effect duration/round clear/response가 한 번만 발생한다. 점수 증가량은 실제 제거 HP와 기존 grade multiplier를 기준으로 독립 계산한다.
  5. Playwright에 기존 실패 진단(console/pageerror/failed asset), localStorage fixture, animation 완료 대기를 보존한다. sleep 기반 flaky test나 개발 전용 production API를 추가하지 않는다.

### I02. 전체 검증, 시각 확인, 메모리 종료
- Related Files:
  - `tests/battle-engine.test.cjs`, `tests/game-session.test.mjs`, `tests/shot-geometry.test.mjs`, `tests/e2e/obstacle-effects.spec.cjs`; read-only except related regression fix
  - `.memory/phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/T01-ground-roll-geometry.md` through `T04-gameplay-regression.md`; update outcomes
  - `.memory/phases/2026-10-22-candy-roll-obstacle-interactions/P01-candy-roll-combat/phase.md`, `.memory/plans/2026-10-22-candy-roll-obstacle-interactions.md`, `.memory/current.md`; update complete state
- **처리 흐름**:
  1. Feature E2E를 통과시킨 뒤 전체 `npm.cmd test`, `npm.cmd run test:e2e`, `npm.cmd run build`, `git diff --check`를 실행한다. 실패가 있으면 related regression만 수정하고 실패한 커맨드 및 새 전체 checks를 다시 실행한다.
  2. Playwright production preview를 통해 1440×900 및 390×844에서 숲·눈·도시·혼돈, 기본/굴림/충돌/반전 안내를 확인한다. HUD나 monster art가 가리지 않고 reduced-motion에서 결과와 collision point가 같은지 확인한다. Evidence는 필요 시 untracked `tmp/roll-t04-*.png`에 둔다.
  3. Task 완료 표시와 실제 테스트 결과를 기록하고 한국어 commit message로 T04 변경을 커밋한 뒤 Phase `4/4`, Plan `done`, current `Status: complete`를 갱신한다. `.memory/phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md` 및 credentials를 수정하지 않는다.

## Acceptance Criteria
- [x] 새 browser specs와 전체 Node/browser suite/build가 실제 실행 결과로 통과한다.
- [x] 1440×900·390×844에서 굴림과 각 장애물 피드백이 읽히며 캐릭터/HUD를 가리지 않는다.
- [x] feature scope 밖 파일/사용자 변경/미완료 Azure Task는 그대로 보존된다.
- [x] Task, Phase, Plan, current의 상태와 commit message가 서로 일치한다.

## Validation
- `npm.cmd test` — 전체 Node test 통과.
- `npm.cmd run test:e2e -- tests/e2e/obstacle-effects.spec.cjs` — 신규 실제 조작 scenario 전부 통과.
- `npm.cmd run test:e2e` — 전체 production browser suite 통과.
- `npm.cmd run build` — production build 통과.
- `git diff --check` — 공백 오류 없음.

## Commit Message
```text
검증(전투): 사탕 굴림과 장애물 효과 회귀 확인

Plan: 2026-10-22-candy-roll-obstacle-interactions
Phase: P01-candy-roll-combat
Task: T04-gameplay-regression

- 지역 효과와 일회성 혼돈 조작을 실제 포인터 플레이로 검증한다.
- 전체 게임 회귀와 화면 크기별 굴림 연출을 확인한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`105` Node tests; `94` Playwright tests; production build; `git diff --check`)
- commit: `검증(전투): 사탕 굴림과 장애물 효과 회귀 확인`
