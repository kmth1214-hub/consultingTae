# Task: T03 Local SWA Workflow, Regression, and Azure Plan Alignment

## Status: done

## Goal
Make the local leaderboard API workflow reproducible with an emulated fake identity and memory storage, add integrated production-preview checks for the whole leaderboard flow, and update the existing Azure release plan so it will package the new managed API without provisioning cloud resources in this task.

## Decision Summary
- Use the Microsoft Static Web Apps CLI authentication emulator plus the API's explicitly gated local memory repository for local testing; production never enables these paths.
- Keep actual Azure resources, Entra app registration, secrets, and deployment execution in React First Release P02.
- Do not remove or weaken current React, combat, map-studio, tenant-authentication, or bonus-route checks.

## Implementation

### I01. Local Static Web Apps emulator workflow
- Related Files:
  - `package.json` :: `dev:leaderboard` and any needed API-test script; modify
  - `.memory/plans/2026-10-21-react-first-release.md` :: reopen release boundary for the leaderboard/API; modify
  - `.memory/phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md` :: include managed API packaging and Table settings; modify
  - `docs/leaderboard-local-development.md` :: local fake identity/API instructions; new

#### Details
- **Signatures & Types**:
  ```text
  Local commands: npm run dev (terminal 1); in terminal 2, set
  NODE_ENV=development, LEADERBOARD_LOCAL_MODE=true,
  LEADERBOARD_LOCAL_USER_ID=local-player-1,
  LEADERBOARD_LOCAL_DISPLAY_NAME=Local Player;
  then run `npx swa start http://127.0.0.1:5173 --api-location api`.
  ```
- **Data & Schema Fields**:
  - Use the SWA CLI auth emulator for the UI's `/.auth/me`-style identity/session behavior. If a fixed fake principal is used inside the API, it is the explicitly gated env triple above and cannot be set by browser input.
  - Local storage lives only in the API process memory and disappears on restart. Azure test mode reads `LEADERBOARD_STORAGE_CONNECTION_STRING` and optional `LEADERBOARD_TABLE_NAME` only when deliberately configured.
- **Execution Flow / Logic**:
  1. Document exact Node/Azure Functions Core Tools/SWA CLI prerequisites, two-terminal commands, localhost URL, fake account behavior, process restart reset, and how a developer returns to the local auth emulator to change identity.
  2. Add `dev:leaderboard` only if it starts without replacing the default game dev server or colliding with existing ports; preserve ports 4173/5173/4180/4181 used by existing tasks.
  3. Update the React release goal/boundary to say leaderboard is now included and Azure API deployment is required; keep tenant restrictions and owner-provided Azure values intact.
  4. Amend release P02-T01 to deploy the Vite `dist/` and `api/` source together, set `platform.apiRuntime` to `node:22`, preserve authenticated route policy for `/api/*`, document `LEADERBOARD_STORAGE_CONNECTION_STRING` and optional `LEADERBOARD_TABLE_NAME` as Azure Function app settings, and state that live verification requires owner resources.
  5. Do not place a real connection string, tenant secret, or API key in tracked files or local docs.
- **Error Handling**: Local start instructions diagnose missing Functions Core Tools or unavailable ports. `npm run build` and production build remain independent of local fake-account env values.

### I02. Integrated leaderboard regression coverage
- Related Files:
  - `tests/e2e/leaderboard.spec.cjs` :: end-to-end leaderboard flow against local emulator/stubs; new
  - `playwright.config.cjs` :: use existing production preview and add only required test setup; modify only if necessary
  - `tests/api/leaderboard-api.test.cjs` :: API contract coverage from T01; read-only/reuse
  - `tests/e2e/support.cjs` :: shared test helpers; modify only for reusable leaderboard fixture

#### Details
- **Test Scenarios**:
  1. Unauthenticated/malformed principal requests receive no user data; production-like missing Table config fails closed and does not silently use memory.
  2. Local fake account submits main result; page reload shows the saved record within the same API process; alternate local identity receives its own record/rank.
  3. A top-10 user appears exactly once; a user below rank 10 sees own rank separately; tie-break metadata is absent from DOM text, accessible names, and JSON response.
  4. Main clear and defeat submit final score once-or-idempotently; bonus result and bonus score submit zero requests.
  5. Home and result entry points return to their source; unavailable API error has a working retry and does not hide the result/restart action.
  6. At 1440x900 and 390x844, no horizontal overflow; no runtime errors or failed same-origin requests.
- **Execution Flow / Logic**:
  1. Prefer deterministic fixtures/fake API responses in the production-preview browser suite; use SWA CLI plus Functions Core Tools for a separately invoked API integration smoke test where those tools are installed.
  2. Avoid live Azure accounts, external network calls, credentials, and persistent browser localStorage for leaderboard data in automated tests.
  3. Preserve existing `npm test`, `npm run test:e2e`, `npm run test:studio`, and `npm run build` gates. Record command outcomes and any environment-gated local API test separately.

## Acceptance Criteria
- [x] Developer can run the React UI and managed API locally, log in with a fake SWA-emulated account, and create/read in-memory leaderboard records.
- [x] Production build contains no local fake principal credentials/configuration and production-like API config cannot select in-memory persistence.
- [x] Existing root Node, E2E, studio, and build gates pass together with new leaderboard regressions.
- [x] React release and Azure deployment task now include managed API packaging and required Table settings, while real provisioning/deployment remains pending.
- [x] No secrets, table connection strings, tenant IDs, or deployment tokens are added to tracked files.

## Validation
- `npm test` -> full root Node + API test suite passes.
- `npm run test:e2e` -> complete existing production-preview Chromium suite plus leaderboard suite passes.
- `npm run test:studio` -> existing map-studio suite passes.
- `npm run build` -> Vite production build passes with no local secrets/env values.
- Local integration smoke: **not run** because the SWA CLI and Functions Core Tools are not installed in this environment and the npm registry is unreachable. The manual smoke procedure is documented above; this environment-dependent check is not reported as passed.

## Commit Message
```text
test(leaderboard): 로컬 API와 전체 리더보드 흐름 검증

Plan: 2026-10-22-company-leaderboard
Phase: P01-company-board
Task: T03-leaderboard-integration

- 로컬 SWA 인증 에뮬레이터와 메모리 저장 절차를 문서화한다.
- 기존 Azure 배포 계획에 관리형 API와 Table 설정을 연결한다.
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test` 97/97, full E2E 82/82, studio 8/8, production build)
- commit: pending
