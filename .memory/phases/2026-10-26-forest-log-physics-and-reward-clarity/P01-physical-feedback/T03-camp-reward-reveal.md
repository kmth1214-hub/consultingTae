# Task: T03 Camp Reward Reveal

## Status: done

## Goal
야영지 무작위 사탕을 받은 사용자가 모든 획득/합성 결과를 확인한 뒤 다음 지역으로 이동한다.

## Decision Summary
- 엔진의 추첨/지급을 한 번 실행한 뒤 결과 스냅샷을 세션에 보관한다. 확인 화면에서는 지급을 재실행하지 않는다.
- 일반 라운드의 기존 보상 선택과 야영지 회복 이동은 유지한다.

## Implementation
### I01. Reward snapshot and routing
- Related Files:
  - `assets/js/battle-engine.js` :: `chooseCampReward` — result identity/effect fields; modify
  - `src/game/gameSession.js` :: state, `chooseCampReward`, `continueAfterCampReward`, resets — result route; modify
  - `src/App.jsx` :: screen registry; modify
  - `src/components/CampRewardResult.jsx` — acquisition screen; new
  - `src/styles/game.css` — result card layout if existing classes insufficient; modify
#### Details
- **Signatures & Types**:
  ```ts
  type CampGrant = {weaponId:string,instanceId:string,name:string,grade:'C'|'B'|'A',effect:string,fused:boolean};
  type CampRewardReveal = {items:CampGrant[],area:'snow'|'city'};
  session.campRewardReveal:CampRewardReveal|null;
  session.continueAfterCampReward():{accepted:boolean,reason?:string};
  ```
- **Data & Schema Fields**: augment existing pending.grants entries rather than redrawing. Engine still prepares next run once all duplicate choices complete. Session publishes `screen:'camp-reward'`, final `run`, `campRewardReveal`, `fusion:null`, no stale lastEvent/enemyResponse. The confirmation action only changes screen to battle and clears reveal; no RNG, grant, layout seed or turn mutation.
- **Execution Flow / Logic**: preserve fusion recursion and both C grants. If `event.pendingCamp`, remain camp. If finished and choice weapon, copy effect.weapons to reveal and assign one next-round seed. Heal retains battle transition. Continue rejects unless screen and reveal match; repeated click cannot duplicate. Reset reveal on character selection/new run. Reload returns existing home flow without restoring/regranting a run.
- **UI**: heading “새로운 사탕을 얻었어요”, card for each name/grade/effect plus “새로 획득” or “합성 완료”; destination-region label and “다음 지역으로” button. Use focus routing already in App, semantic headings/list, phone width no overflow. Do not show internal engine metadata.

### I02. Tests
- Related Files:
  - `tests/game-session.test.mjs`, `tests/battle-engine.test.cjs` — result fidelity, repeated actions and fusion; modify
  - `tests/e2e/game-flow.spec.cjs` — B grant/C pair and fusion reveal; modify
#### Details
- Cover C pair, B single, duplicate fusion including repeated weapon identity, final grade/effect, no RNG/turn/seed change on confirm, and heal immediate transition. Confirm button enters the correct next area once and reload does not regrant.

## Acceptance Criteria
- [x] Random weapon path cannot enter the next battle until final acquisition results have been shown.
- [x] Every awarded/fused item is accurate and confirmation never grants it twice.

## Validation
- `node --test tests/game-session.test.mjs tests/battle-engine.test.cjs` — pass
- `npm.cmd run build` — pass
- `npm.cmd run test:e2e -- tests/e2e/game-flow.spec.cjs` — pass

## Commit Message
```text
feat(보상): 야영지 사탕 획득 결과를 지역 이동 전에 표시

Plan: 2026-10-26-forest-log-physics-and-reward-clarity
Phase: P01-physical-feedback
Task: T03-camp-reward-reveal

- 무작위 지급과 합성 결과를 이름·등급·능력으로 안내
- 확인 후 지역 이동과 중복 지급 방지 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 42 unit tests, build and 11 browser flow tests; desktop/phone screenshots inspected.
- commit: pending
