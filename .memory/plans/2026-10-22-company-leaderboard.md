# Plan: Company Leaderboard

## Goal
Add a company-wide top-10 leaderboard to the Vite + React game using an Azure Static Web Apps managed HTTP API and Azure Table Storage. Automatically submit eligible main-run results, preserve one all-time best per authenticated Entra user, and expose rank, display name, cookie, and score while keeping tie-break fields hidden.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Implement the authenticated leaderboard API, best-record storage, result submission, return-aware UI, and local/test workflow. Azure resources and live deployment remain in the existing React release P02. | [P01](../phases/2026-10-22-company-leaderboard/P01-company-board/phase.md) |

## Confirmed boundaries
- Use SWA managed Azure Functions HTTP APIs with Node.js 22 and Azure Table Storage. The API accepts authenticated SWA principal data and never trusts browser-supplied identity or display name.
- A main run ending in defeat or main clear submits `summary.finalScore`; Chaos bonus results never submit. Keep only a user's personal best; tied or lower results do not replace it.
- Rank by score descending, current/furthest main round descending, duration ascending, then stable hashed owner key ascending. Do not expose the round, area, duration, owner key, or email in the board UI.
- Show the top 10. If the authenticated user's best is below the top 10, show that user's own rank and best separately. Enter from home or main results and return to the exact originating screen.
- Loading, empty, and retryable error states are required. API errors must not block play or result navigation.
- Local verification uses a local-only fake SWA identity and an in-memory repository; production must fail closed when authenticated identity or Table Storage configuration is absent.
- Actual Azure resource creation, tenant/app registration, credentials, and live deployment remain in [React First Release P02](./2026-10-21-react-first-release.md). That release task must be updated to package and deploy the `api/` managed functions alongside `dist/` and document Table Storage settings.

## Implementation notes
- API response contract: `GET /api/leaderboard` returns `{ entries: [{ rank, displayName, cookieId, score }], personalBest: null | { rank, cookieId, score } }`. `personalBest` is non-null only when the authenticated user ranks below 10.
- API request contract: `POST /api/leaderboard` receives `{ score, cookieId, furthestArea, round, durationMs }`; identity is derived from the SWA client-principal header. Successful responses identify whether the best was saved or retained.
- Table entity: `PartitionKey='GLOBAL'`, `RowKey=sha256(principal.userId)`, and server-owned fields `displayName`, `cookieId`, `score`, `furthestArea`, `round`, `durationMs`, `updatedAt`. No email or raw principal ID is persisted.
- API validation limits: safe integer score `0..1000000`; `cookieId` in the existing character ID set; area in `forest|snow|city`; integer round `1..5`; safe integer duration `0..864000000`. Reject malformed JSON, unknown properties only if needed for identity safety, and bonus area submissions.

## Validation gate
- `npm test` includes API unit tests for principal parsing, request validation, ranking, personal-best updates, and failure behavior.
- `npm run build` succeeds without Azure credentials and omits development-only identity/storage behavior from the browser bundle.
- `npm run test:e2e` covers the home/results entry points, origin-preserving return, score submission, top 10 and personal-best presentation, bonus exclusion, and API error recovery against a local in-memory API.
- `npm run test:studio` continues to pass to guard the existing development-only map studio.
- Azure staging auth/storage verification is deferred to the existing P02 release task and requires owner-provided resources/secrets.
