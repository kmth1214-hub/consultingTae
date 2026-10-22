# Task: T02 Game UI and Flow

## Status: done

## Goal
Make the React game communicate the three-round main-region progression accurately and keep battlefield and user-flow regression coverage aligned with the new boss round.

## Decision Summary
- Main-region battle and reward screens show a denominator of 3; Chaos also remains 3 rounds.
- A regional boss is reached in round 3, and reward-screen continuation reflects the engine's camp or final-result routing after that round.

## Implementation

### I01. React round labels and reward continuation

- Related Files:
  - `src/components/BattleScreen.jsx` :: round counter in the battle header; modify
  - `src/components/RewardScreen.jsx` :: reward progress eyebrow and final button label; modify

#### Details
- **Data and Types**:
  - Read existing `session.run.area: 'forest' | 'snow' | 'city' | 'chaos'`, `session.run.round: number`, and `session.run.bonusMode: boolean`. Do not add state or alter component props.
- **Execution Flow / Logic**:
  1. In `BattleScreen`, render `run.round / 3` for both main and bonus play; remove the conditional `5` main-run denominator.
  2. In `RewardScreen`, display `run.round / 3` in the progress eyebrow.
  3. Select the post-reward button label based on the new final round: City round 3 says the existing result-view action; Forest or Snow round 3 says the existing camp action; rounds 1–2 say the existing next-round action. The button continues calling `session.continueAfterReward` and remains disabled until reward choices are complete.
  4. Preserve existing region names, reward choices, keyboard controls, and Chaos wording.

### I02. Battlefield and browser-flow regression coverage

- Related Files:
  - `tests/battlefield-model.test.mjs` :: regional round iteration; modify
  - `tests/shot-geometry.test.mjs` :: regional layout/trajectory iteration; modify
  - `tests/e2e/game-flow.spec.cjs` :: battle headings, region camps, snow unlock, and final result routes; modify
  - `tests/e2e/enemy-response.spec.cjs` :: regional boss response setup; modify

#### Details
- Change test loops that enumerate main-region rounds from 1–5 to 1–3; keep Chaos loops at 1–3.
- Change regional boss fixtures and E2E setup from round 5 to round 3. Replace assertions such as `숲 지역 2 / 5` with the matching three-round label.
- Cover both round-3 reward-screen continuation branches: Forest/Snow into camp, City into final result. Verify all three boss third-response presentations still work after the fixture update.
- Keep camera, obstacle geometry, parallax, and shot interaction assertions unchanged except where a round-specific fixture must move from 5 to 3.

## Acceptance Criteria
- [ ] Main and bonus battle screens show `n / 3`; no React battle or reward screen advertises five main rounds.
- [ ] Round-3 rewards route to camp for Forest/Snow and to the main result for City.
- [ ] Battlefield and E2E tests cover rounds 1–3 while preserving Chaos's existing three-round flow.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs` — battlefield geometry tests pass.
- `npx playwright test tests/e2e/game-flow.spec.cjs tests/e2e/enemy-response.spec.cjs` — regional progression and boss response browser flows pass.

## Commit Message
```text
feat(게임): 화면 진행도를 3라운드로 통일

Plan: 2026-10-22-three-round-regional-progression
Phase: P01-three-round-progression
Task: T02-game-ui-and-flow

- 전투·보상 화면의 라운드 표기를 3라운드 기준으로 변경
- 보스 라운드 변경에 맞춰 전장 및 브라우저 흐름 검증 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
