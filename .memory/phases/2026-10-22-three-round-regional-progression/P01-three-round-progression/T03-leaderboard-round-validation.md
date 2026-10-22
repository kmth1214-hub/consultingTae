# Task: T03 Leaderboard Round Validation

## Status: done

## Goal
Ensure newly submitted company leaderboard results accept only valid main-run rounds 1–3 after the regional progression change, while retaining compatibility for existing stored leaderboard entries.

## Decision Summary
- Leaderboard submissions describe the main run, whose maximum reached round is now 3.
- Existing stored records are read as-is; this task does not migrate or rewrite Azure Table Storage data.

## Implementation

### I01. API submission validation

- Related Files:
  - `api/src/leaderboard/validation.js` :: `validateSubmission`; modify
  - `tests/api/leaderboard-api.test.cjs` :: submission validation cases; modify

#### Details
- **Request Shape**:
  - Preserve exact fields `score: number`, `cookieId: string`, `furthestArea: 'forest' | 'snow' | 'city'`, `round: integer`, and `durationMs: number`.
  - Keep all current score, cookie, area, duration, and extra-field validation unchanged.
- **Execution Flow / Logic**:
  1. Change the accepted main-run round range in `validateSubmission` from 1–5 to 1–3.
  2. Continue returning the existing `Invalid main-run round.` validation error for non-integer values, values below 1, and values above 3.
  3. Keep repository read/serialization behavior unchanged so legacy stored records with historical round values can still be displayed. Do not change sorting or score comparison behavior.
- **Regression Coverage**:
  - Accept 1 and 3; reject 0, 4, 5, and a fractional round.
  - Preserve assertions for all other request validation and response status behavior.

### I02. Client contract fixtures and full regression

- Related Files:
  - `tests/leaderboard-client.test.mjs` :: submission and summary fixtures; modify only fixtures that represent newly submitted main-run records above round 3
  - `tests/e2e/leaderboard-results.spec.cjs` :: current-run submission fixtures; modify only if they model a new submission at round 4 or 5
  - `tests/game-session.test.mjs` :: regional session routing, complete-run length, snow unlock timing, and valid battlefield fixture; modify

#### Details
- Keep leaderboard entry display fixtures containing historical round 4/5 values when they represent already stored records, proving they remain readable.
- Change only current-run summaries submitted by the application so their round is at most 3. Keep bonus completion semantics and the main summary submitted after optional Chaos unchanged.
- Update the session integration tests to clear three rounds in each main region (9 total), assert both camps still occur, verify the Snow unlock after its round-3 boss (sixth main encounter), and retain the three Chaos bonus rounds. Change visual-layout setup from invalid main round 4 to regular City round 2.
- In the enemy-response E2E check, assert the visible player hit feedback while the impact stage is active; do not rely on the short-lived `data-impact-id` instrumentation attribute after the impact animation may have completed.
- Run the full Node suite, the Playwright E2E suite, and Vite production build after T01 and T02 are complete; fix only failures caused by the three-round progression within this plan's scope.

## Acceptance Criteria
- [x] API accepts new main-run leaderboard submissions only for rounds 1–3.
- [x] Existing stored leaderboard records remain readable without migration.
- [x] Current main-run result submission and optional bonus summary behavior remain intact.

## Validation
- `node --test tests/api/leaderboard-api.test.cjs tests/leaderboard-client.test.mjs` — API boundary and client contract tests pass.
- `npm test` — all Node unit and API tests pass.
- `npx playwright test` — browser regression suite passes.
- `npm run build` — Vite production build succeeds.

## Commit Message
```text
feat(리더보드): 제출 라운드를 3으로 제한

Plan: 2026-10-22-three-round-regional-progression
Phase: P01-three-round-progression
Task: T03-leaderboard-round-validation

- 신규 본편 기록의 최대 라운드를 3으로 제한
- 기존 저장 기록 표시와 혼돈 보너스 결과 연동을 보존
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm test`: 99 passed, Playwright: 82 passed, `npm run build`: passed)
- commit: pending
