# Task: T02 Leaderboard UI and Main-Run Submission

## Status: done

## Goal
Connect eligible main-run results to the API and add a responsive leaderboard screen reachable from home and both main result outcomes, returning to the exact source screen without disturbing the current run summary.

## Decision Summary
- Submit `summary.finalScore` automatically only on `main-results`; do not submit bonus results or `bonusScore`.
- Show rank, Entra display name, selected cookie, and score only. Do not render the tie-break fields.
- A leaderboard load/save failure never prevents a result, another run, or returning to the origin.

## Implementation

### I01. Client API and result submission status
- Related Files:
  - `src/game/leaderboardClient.js` :: GET/POST client and input projection; new
  - `src/components/RunResults.jsx` :: auto-submit eligible result and show save state; modify
  - `tests/leaderboard-client.test.mjs` :: request contract and error handling; new
  - `tests/e2e/leaderboard-results.spec.cjs` :: result/bonus submission behavior; new

#### Details
- **Signatures & Types**:
  ```js
  getLeaderboard({ fetchImpl = fetch, signal } = {}) // Promise<BoardResponse>
  submitMainRunRecord({ summary, selectedCharacterId, fetchImpl = fetch, signal }) // Promise<{ saved:boolean }>
  ```
- **Data & Schema Fields**:
  - GET `/api/leaderboard` with `credentials:'same-origin'`, `Accept: application/json`.
  - POST `/api/leaderboard` with JSON `{score:summary.finalScore,cookieId:selectedCharacterId,furthestArea:summary.furthestArea,round:summary.round,durationMs:summary.durationMs}`; no client identity or display name.
  - Parse `{entries:[{rank,displayName,cookieId,score}],personalBest:null|{rank,cookieId,score}}`; reject malformed response shapes as retryable UI errors.
- **Execution Flow / Logic**:
  1. `RunResults` submits on mount/effect only when `session.screen === 'main-results'`; do not submit in `bonus-results`. The server's best-only policy makes duplicate React StrictMode effect requests idempotent.
  2. Render an accessible live status: saving, saved/new-best or previous-best-kept, and a clear save-failed message. A failed call must not disable clear/bonus/retry buttons.
  3. Use an AbortController for result effect cleanup; ignore late responses after unmount. Retry is optional; if exposed, retry the same payload and never mutate the run.
  4. Render network errors as recoverable UI state, not an uncaught rejection or blocking modal.
- **Error Handling**: Handle non-2xx, malformed JSON, network/abort failures. Abort on unmount silently; other errors update the save status and preserve result navigation.

### I02. Leaderboard screen and return-aware session navigation
- Related Files:
  - `src/components/LeaderboardScreen.jsx` :: load and render the board; new
  - `src/game/gameSession.js` :: `leaderboardReturnScreen`, `openLeaderboard`, `closeLeaderboard`; modify
  - `src/App.jsx` :: register the leaderboard screen and pass session actions; modify
  - `src/components/GameHome.jsx` :: home entry point; modify
  - `src/components/RunResults.jsx` :: main result entry point; modify
  - `src/styles/game.css` :: responsive leaderboard and status styling; modify
  - `tests/game-session.test.mjs` :: navigation and state preservation; modify
  - `tests/e2e/leaderboard-ui.spec.cjs` :: home/result entry, rendering and return; new

#### Details
- **Signatures & Types**:
  ```js
  // gameSession actions
  openLeaderboard() // only from home or main-results; stores the source screen and sets screen='leaderboard'
  closeLeaderboard() // returns to stored source screen; preserves run, summary, selectedCharacter and outcome
  ```
- **Data & Schema Fields**:
  - Add snapshot field `leaderboardReturnScreen: 'home'|'main-results'|null`; clear it when starting a new run from home flow or returning from the board.
  - `LeaderboardScreen` calls `getLeaderboard` and renders only API public fields, with states `loading|loaded|empty|error`.
- **Execution Flow / Logic**:
  1. Add `leaderboard` to the App screen map. `openLeaderboard` rejects/ignores sources other than `home` and `main-results`; bonus results are excluded.
  2. Add a button to GameHome and main RunResults for `session.openLeaderboard`; retain all existing controls.
  3. Board lists ranks 1–10. If `personalBest` exists, render a clearly separate “내 최고 기록” row with rank/cookie/score; the current user may not be named twice when it is already in top 10.
  4. The UI must not display area, round, duration, internal owner ID/hash, or email. Cookie names/assets resolve only through the existing `CHARACTERS` catalog; unknown cookie IDs use a safe text fallback.
  5. Provide loading, no-records empty state, retry button on error, semantic table/list headings, and a back button calling `closeLeaderboard`.
  6. Keep the original home/result context in session memory; returning from leaderboard must show the exact result/run, including its existing summary and clear/defeat actions.
- **Error Handling**: Error state includes retry. A 401/503 is displayed as a readable sign-in/service-unavailable message without losing context. Unknown cookie IDs never break screen rendering.

## Acceptance Criteria
- [x] Main defeat and main clear submit the eligible `finalScore`; optional bonus route and `bonus-results` make no submission.
- [x] Home and both main outcome screens link to the board; board return preserves the exact source screen and current result.
- [x] Board shows top 10 and, only when needed, the current user's own rank; visible fields are rank/name/cookie/score only.
- [x] Loading, empty, retryable error, save-in-progress, save-success, existing-best, and save-failure states are accessible and do not block game controls.
- [x] Client sends no user ID, display name, or email, and never submits bonus score.

## Validation
- `npm test` -> client contract, malformed response, network failure, main-vs-bonus request projection, and origin-preserving session navigation tests pass.
- `npm run build` -> production build passes.
- `npm run test:e2e` -> home and defeat/clear board navigation, top10/personal-best visibility, hidden tie-breaks, error retry, and bonus exclusion pass.

## Commit Message
```text
feat(ui): 게임 홈과 결과에 회사 리더보드 연결

Plan: 2026-10-22-company-leaderboard
Phase: P01-company-board
Task: T02-leaderboard-ui

- 본편 결과를 자동 제출하고 보너스 점수 제출을 제외한다.
- 홈·결과의 리더보드 진입과 원래 화면으로 복귀를 지원한다.
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test` 97/97, `npm run build`, 3 leaderboard E2E scenarios)
- commit: pending
