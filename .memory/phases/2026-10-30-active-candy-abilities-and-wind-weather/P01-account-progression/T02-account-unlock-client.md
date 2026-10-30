# Task: T02 계정 해금 로드와 저장 재시도

## Status: done

## Goal
Azure 게임은 계정 프로필을 읽은 뒤에만 시작하고, 눈 보스 클리어를 계정에 저장할 때까지 다음 지역 이동을 막는다. 로컬 개발은 기존 브라우저 프로필을 사용한다.

## Decision Summary
- Azure에서는 브라우저의 예전 해금 값을 서버로 가져오지 않는다. 로드 실패 시 재시도, 저장 실패 시 클리어 화면에서 재시도한다.
- 현재 `createGameSession`의 `persistUnlock`은 동기 localStorage 처리이므로 계정 API 비동기 흐름과 라운드 전환 가드가 함께 필요하다.

## Implementation

### I01. 프로필 클라이언트와 세션 상태
- Related Files:
  - `src/game/playerProfileClient.js` :: `createPlayerProfileClient` — new
  - `src/game/gameSession.js` :: `createGameSession`, `persistUnlock`, `routeCombat`, `actions.startCharacterSelect`, `actions.startRun`, `actions.advanceRound`, `actions.finishCampSlot` — modify
  - `src/game/profileStore.js` :: `loadProfile`, `saveProfile` — read-only; local dev only
  - `src/game/useGameSession.js` :: `useGameSession` — read-only; options already injected
- **Signatures & Types**:
  ```js
  createPlayerProfileClient({ fetchImpl = fetch } = {})
    // -> { get(): Promise<{version:1,snowAreaCleared:boolean}>, unlockSnow(): Promise<same> }
  createGameSession({ ..., profileClient = null } = {})
    // new actions: loadAccountProfile(): Promise<Result>, retryProfileSave(): Promise<Result>
  ```
- **Data & Schema Fields**: `state.profile` remains `{version:1,snowAreaCleared:boolean}`. Add `profileStatus: 'loading'|'ready'|'load-error'|'saving'|'save-error'` and `profileSaveRequired: boolean`; initial local status `ready`, Azure client status `loading`. Session never stores an account ID from the browser. `profileClient` validates HTTP status and exact DTO; reject malformed data.
- **Execution Flow / Logic**: When a client exists, initialize locked without consulting localStorage; `loadAccountProfile` GETs once and publishes `ready`, else `load-error`. `startCharacterSelect`/`startRun` reject until `ready`. When engine marks Snow boss clear, preserve battle result and initiate one POST; publish `saving`, then server profile and `ready`, or `save-error`. `retryProfileSave` is idempotent. Gate Snow-to-City/camp and any alternate continuation while `profileSaveRequired` remains true. Do not stop playback/review animations or lose the battle result. Local session retains existing `saveProfile` behavior. Repeated route/render calls do not send duplicate writes.

### I02. 화면과 검증
- Related Files:
  - `src/App.jsx` :: `App` — inject profile client only when `VITE_REQUIRE_ACCOUNT_PROFILE === 'true'` and start load in effect
  - `.github/workflows/azure-static-web-apps.yml` :: `Build tenant-restricted Azure artifact` — set `VITE_REQUIRE_ACCOUNT_PROFILE: 'true'` on that build step only; modify
  - `src/components/GameHome.jsx` :: `GameHome` — loading/error retry, disable start until ready
  - `src/components/CharacterSelect.jsx` :: `CharacterSelect` — account-specific unlock copy; local copy only in dev
  - `src/components/RewardScreen.jsx` :: `RewardScreen` — Snow-clear saving/error retry and blocked continuation
  - `src/components/CampScreen.jsx`, `src/components/CampSlotScreen.jsx` :: continuation buttons — guard during failed save where reachable
  - `tests/game-session.test.mjs`, `tests/profile-store.test.mjs`, `tests/e2e/candy-unlock.spec.cjs` — modify
  - `tests/player-profile-client.test.mjs` — new
- **Execution Flow / Logic**: `import.meta.env.VITE_REQUIRE_ACCOUNT_PROFILE === 'true'` in `App` selects account client. Only the Azure artifact build sets this flag; local `npm run build`/Playwright preview and dev/studio tests receive no client and continue synchronously. Never set it as a global workflow env because `npm run test:e2e` builds a local preview without the managed API. Loading and error messages are visible/accessible. Tests cover refresh/new session with server unlock, no migration from localStorage, 503/401, POST retry, run-start block, and Snow clear followed by next-region gate. Avoid treating a rejected promise as a successful unlock.

## Acceptance Criteria
- [ ] Azure account unlock is read from API before character selection; other account starts locked.
- [ ] Failed GET blocks start; failed Snow-clear POST blocks transition but can be retried without replaying battle.
- [ ] Local dev unlock behavior and existing game tests remain usable.

## Validation
- `node --test tests/player-profile-client.test.mjs tests/profile-store.test.mjs tests/game-session.test.mjs` — client and session states
- `npx playwright test tests/e2e/candy-unlock.spec.cjs` — local flow and accessible retry
- `npm run build` — React build

## Commit Message
```text
feat(profile): 계정 해금 로드와 저장 재시도 연결

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P01-account-progression
Task: T02-account-unlock-client

- Azure 게임 시작 전 계정 해금 상태 확인
- 눈 지역 클리어 저장 실패 시 안전하게 재시도
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
