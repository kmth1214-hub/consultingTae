# Task: T01 계정별 플레이어 프로필 API

## Status: done

## Goal
회사 로그인 사용자가 `PlayerProfiles` Azure Table에서 눈 지역 해금을 조회하고 한 방향으로 저장할 수 있다. 기존 리더보드 저장소·순위는 변경하지 않는다.

## Decision Summary
- 프로덕션은 `x-ms-client-principal`의 검증된 `aad` 계정만 허용한다. 기존 `resolvePrincipal`과 `stableOwnerKey`를 재사용한다.
- 사용자가 이미 만든 `PlayerProfiles` Table과 기존 Storage Account 연결 문자열을 쓴다. 저장하지 못하면 503, 인증이 없으면 401이다.

## Implementation

### I01. Table 저장과 서비스
- Related Files:
  - `api/src/leaderboard/principal.js` :: `resolvePrincipal`, `stableOwnerKey` — 인증·해시 재사용; read-only
  - `api/src/profile/repository.js` :: `createPlayerProfileRepository`, `createMemoryPlayerProfileRepository` — new
  - `api/src/profile/service.js` :: `createPlayerProfileService` — new
- **Signatures & Types**:
  ```js
  createPlayerProfileRepository({ env = process.env, tableClientFactory } = {})
    // -> { get(ownerKey): Promise<Profile|null>, unlockSnow(ownerKey): Promise<Profile> }
  createPlayerProfileService({ repository })
    // -> { get(principal): Promise<PublicProfile>, unlockSnow(principal): Promise<PublicProfile> }
  ```
- **Data & Schema Fields**: Table `PlayerProfiles`, `partitionKey: 'PLAYER'`, `rowKey: stableOwnerKey(principal.userId)` (SHA-256 hex), `version: 1`, `snowAreaCleared: boolean` (`false` when row missing), `updatedAt: ISO8601 string` on first unlock. Public DTO contains only `{version:1,snowAreaCleared:boolean}`; never expose `userId`, row key, connection string, or ETag.
- **Execution Flow / Logic**: Validate connection string from `LEADERBOARD_STORAGE_CONNECTION_STRING` and optional `PLAYER_PROFILE_TABLE_NAME` (default `PlayerProfiles`); production never uses an in-memory fallback. `get` maps 404 to locked profile. `unlockSnow` upserts only `true`, retries or safely treats 409 as success after re-read; concurrent requests cannot write `false`. Local memory repository is permitted only with existing `LEADERBOARD_LOCAL_MODE` and local principal flags. Do not mutate the `LeaderboardRecords` table.

### I02. Authenticated Azure Functions routes
- Related Files:
  - `api/src/profile/handlers.js` :: `createPlayerProfileHandlers` — new
  - `api/src/functions/profile.js` :: `profileGet`, `profileSnowClear` — new
  - `tests/api/player-profile-api.test.cjs` :: route/service tests — new
  - `tests/api/player-profile-repository.test.cjs` :: repository tests — new
- **Signatures & Types**:
  ```js
  createPlayerProfileHandlers({ env = process.env, repositoryFactory, logger = console } = {})
    // -> { get(request): Promise<Response>, unlockSnow(request): Promise<Response> }
  // GET /api/profile; POST /api/profile/snow-clear with no client-owned account ID
  ```
- **Execution Flow / Logic**: Resolve the principal from the Static Web Apps header for each request. Return 401 without it, 200 public DTO on success, 503 for missing storage/transport failures; log only safe error code/status. POST needs no writable boolean field and cannot reset progress. Tests cover malformed principal, foreign/anonymous request, missing storage, absent row, unlock, repeat unlock, concurrent unlock, and profile isolation by hashed account ID. Reuse `@azure/data-tables` from `api/package.json`; add no new dependency.

## Acceptance Criteria
- [ ] 두 회사 계정의 해금이 서로 분리되고 반복 요청에도 `true`가 유지된다.
- [ ] 프로덕션에서 Table 연결 또는 인증이 없을 때 해금 기록을 브라우저/메모리로 대신 저장하지 않는다.
- [ ] 기존 리더보드 GET/POST API가 그대로 통과한다.

## Validation
- `node --test tests/api/player-profile-api.test.cjs tests/api/player-profile-repository.test.cjs tests/api/leaderboard-api.test.cjs` — 인증·Table·기존 리더보드 통과
- `npm run build:azure` — API 외 프론트 빌드 및 SWA 구성 손상 없음 (`ENTRA_TENANT_ID`가 없는 로컬에선 `npm run build`로 대체)

## Commit Message
```text
feat(profile): 회사 계정별 눈 지역 해금 API 추가

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P01-account-progression
Task: T01-player-profile-api

- Azure Table에서 계정별 해금 조회와 단방향 저장
- 인증 실패·저장소 장애를 명확히 처리
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
