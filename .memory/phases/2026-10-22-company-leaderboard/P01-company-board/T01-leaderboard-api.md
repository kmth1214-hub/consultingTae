# Task: T01 Authenticated Leaderboard API and Storage

## Status: done

## Goal
Implement a testable Node.js 22 Azure Static Web Apps managed API that derives each owner from authenticated SWA identity, validates eligible main-run results, stores only each user's best record in Azure Table Storage, and calculates the top 10 plus the requesting user's rank.

## Decision Summary
- Use HTTP-only Azure Functions Node.js v4 managed API endpoints at `/api/leaderboard`; SWA supplies authenticated identity in `x-ms-client-principal`.
- Production requires a valid SWA principal and Table Storage configuration. Local-only fake identity and in-memory persistence require an explicit development flag and are never activated by a production environment.
- Store no email or raw principal ID. Hash the authenticated `userId` for the table RowKey.
- Keep best-record comparison and rank order: score descending, round descending, duration ascending, hashed owner key ascending. Only rank/name/cookie/score are public response fields.

## Implementation

### I01. Azure Functions API and identity boundary
- Related Files:
  - `api/host.json` :: Functions host v4 defaults; new
  - `api/package.json` :: Node function entry and dependencies; new
  - `api/src/functions/leaderboard.js` :: register GET/POST HTTP handlers; new
  - `api/src/leaderboard/principal.js` :: decode and validate SWA client principal; new
  - `api/src/leaderboard/validation.js` :: normalize/validate API payload; new
  - `api/src/leaderboard/service.js` :: best-record and ranking service; new
  - `tests/api/leaderboard-api.test.cjs` :: identity/validation/handler regressions; new
  - `package.json` :: include `tests/api/*.test.cjs` in root `test` script; modify

#### Details
- **Signatures & Types**:
  ```js
  // principal.js
  function resolvePrincipal(headers, env = process.env) // -> { userId: string, displayName: string } | null
  function stableOwnerKey(userId) // -> lowercase 64-char SHA-256 hex

  // validation.js
  function validateSubmission(body) // -> { ok: true, value: Submission } | { ok: false, error: string }

  // service.js
  function createLeaderboardService({ repository, now = () => new Date() })
  // service.submit({ principal, submission }) -> { saved: boolean, record: OwnRecord }
  // service.getBoard(principal) -> { entries: PublicEntry[], personalBest: OwnRecord | null }
  ```
- **Data & Schema Fields**:
  - `Submission`: `score:number` safe integer `0..1000000`; `cookieId:string` one of `adventurer|alchemist|wizard|milk|wind`; `furthestArea:string` one of `forest|snow|city`; `round:number` integer `1..5`; `durationMs:number` safe integer `0..864000000`.
  - `LeaderboardEntity`: `partitionKey:'GLOBAL'`, `rowKey:sha256(Entra userId)`, `displayName:string`, `cookieId:string`, `score:number`, `furthestArea:string`, `round:number`, `durationMs:number`, `updatedAt:string` ISO timestamp. Raw Entra user ID and email are forbidden fields.
  - `PublicEntry`: `{ rank:number, displayName:string, cookieId:string, score:number }`.
  - `OwnRecord`: `{ rank:number, cookieId:string, score:number }`; do not include display name or tie-break values in this separate private response unless present in top 10.
  - GET response: `{ entries: PublicEntry[] /* max 10 */, personalBest: OwnRecord | null /* only when rank > 10 */ }`.
  - POST body: exactly the five `Submission` fields above. Identity comes only from the principal resolver.
- **Execution Flow / Logic**:
  1. Register `app.http('leaderboardGet', { route:'leaderboard', methods:['GET'], authLevel:'anonymous', handler })` and equivalent POST. SWA route policy protects `/api/*`; the handler independently requires the SWA principal.
  2. Decode `x-ms-client-principal` as base64 JSON. Require `userId`, a non-empty non-email `userDetails` mapped from Entra's `name` claim, `identityProvider === 'aad'`, and an authenticated role. Reject malformed/missing identity or email-shaped `userDetails` with `401`; never read identity from query/body. The SWA release config must select that Entra name claim.
  3. Allow a fake principal only when `NODE_ENV !== 'production'`, `LEADERBOARD_LOCAL_MODE === 'true'`, and explicit `LEADERBOARD_LOCAL_USER_ID`/`LEADERBOARD_LOCAL_DISPLAY_NAME` are set. A deployed SWA/Functions environment always disables this path. Missing required production identity returns `401`.
  4. Validate JSON and submission schema; reject invalid values and `chaos`/bonus records with `400`. Do not accept a display name, email, owner ID, or bonus score.
  5. `submit`: read the owner's current row. Insert if absent. Replace only when tuple `(score, round, -durationMs)` is strictly better; identical/worse scores keep the prior record. Use conditional Table update with ETag; on 409/412 reload and compare again, retry at most 3 times, then return retryable `503`.
  6. `getBoard`: page through all rows in `GLOBAL`, sort by score desc, round desc, duration asc, RowKey asc, assign 1-based ranks. Return first 10 and only the caller's `{rank,cookieId,score}` when rank > 10. Never return hashed owner keys.
  7. Convert infrastructure failures to a generic retryable `503` response; do not return connection strings, claims, or stack traces. Log server-side error details without sensitive identity values.
- **Error Handling**: `400` invalid request; `401` missing/invalid authenticated principal; `405` unsupported method if routed to handler; `503` missing Table configuration or transient storage failure; `500` only unexpected errors with a generic body. No production in-memory fallback.

### I02. Azure Table and local memory repositories
- Related Files:
  - `api/src/leaderboard/table-repository.js` :: Azure Table Storage implementation; new
  - `api/src/leaderboard/memory-repository.js` :: explicit local/test implementation; new
  - `api/src/leaderboard/repository-factory.js` :: select only configured Table or gated local memory; new
  - `tests/api/leaderboard-repository.test.cjs` :: repository contract, concurrency and fail-closed tests; new

#### Details
- **Signatures & Types**:
  ```js
  // Both implementations expose the same async contract.
  repository.get(ownerKey) // -> LeaderboardEntity | null
  repository.listAll() // -> LeaderboardEntity[]
  repository.insert(entity) // -> entity; duplicate key reports conflict
  repository.replace(entity, etag) // -> entity; stale ETag reports conflict
  createRepository({ env = process.env, tableClientFactory, memoryStore })
  ```
- **Data & Schema Fields**:
  - Read `LEADERBOARD_STORAGE_CONNECTION_STRING` and optional `LEADERBOARD_TABLE_NAME` (default `LeaderboardRecords`). Never log either setting.
  - Use `@azure/data-tables` `TableClient.fromConnectionString(connectionString, tableName)`, create the table idempotently, `listEntities` with all pages, `getEntity`, `createEntity`, and `updateEntity(entity,'Replace',{etag,matchConditions:'IfNotModified'})`.
  - The local memory repository is process-scoped and keyed by the same `GLOBAL`/hashed-owner pair; it is not browser localStorage and is never persistent.
- **Execution Flow / Logic**:
  1. Repository factory uses Table Storage whenever the connection string exists.
  2. If absent, permit memory storage only when all local fake-identity gates in I01 pass and no Azure Functions/SWA production marker is present. Otherwise throw a typed configuration error translated to `503`.
  3. Create the table idempotently at API startup/first use. Preserve all entity fields on `Replace` and use ETag matching to avoid concurrent best-record downgrades.
  4. Root unit tests inject an in-memory repository and stub `TableClient`; they do not require Azure credentials or network access.
- **Error Handling**: Normalize Table 404/409/412 and service-unavailable errors into repository-level absent/conflict/transient errors. Re-throw unknown failures for the generic API handler. Validate table name against Azure Table naming constraints before client construction.

## Acceptance Criteria
- [ ] GET and POST require an authenticated Entra/SWA principal and ignore client-provided identity/name.
- [ ] The Table entity contains only the specified server-owned fields and stores a hashed owner key, never email or raw user ID.
- [ ] Lower/equal submissions preserve the existing record; a strictly better submission replaces it under concurrent writes without downgrade.
- [ ] Ranking, deterministic exact-tie order, top 10, and outside-top-10 personal rank match the confirmed rules; response has no tie-break or identity key fields.
- [ ] Missing production storage configuration returns a retryable error and never selects memory storage.
- [ ] Local fake account and memory store require explicit development-only environment values.

## Validation
- `npm test` -> all existing tests plus API principal, validation, table/memory repository, ranking, ETag conflict and fail-closed tests pass.
- `npm run build` -> succeeds without Azure credentials; no server-only dependency or local identity is bundled into `dist/`.
- API tests use stub TableClient and must not require a live Azure Storage account.

## Commit Message
```text
feat(api): 회사 리더보드 인증과 최고 기록 저장

Plan: 2026-10-22-company-leaderboard
Phase: P01-company-board
Task: T01-leaderboard-api

- SWA 인증 사용자 기반 순위 API와 Azure Table 저장소를 추가한다.
- 최고 기록 비교, 입력 검증, 개발용 메모리 저장소를 구현한다.
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm ci --prefix api`; `npm test` 92/92; `npm run build`)
- commit: pending
