# Task: T01 전체 회귀 검증과 Azure 배포

## Status: pending

## Goal
계정 프로필, 슬롯 보상, 바람·날씨, 네 쿠키 능력의 실제 게임 흐름을 검증하고 검증된 `main`을 Azure Static Web Apps에 배포한다.

## Decision Summary
- 사용자는 `PlayerProfiles` Table을 기존 Storage Account에 만들었다. API는 기존 연결 문자열을 사용하고 Azure 앱 설정에 비밀값을 다시 노출하지 않는다.
- Azure는 `VITE_REQUIRE_ACCOUNT_PROFILE=true`, 로컬 브라우저 테스트는 `false`; 기존 회사 로그인 제한, BGM, 리더보드가 유지돼야 한다.

## Implementation

### I01. 배포 전 흐름 정리
- Related Files:
  - `docs/azure-static-web-apps.md` :: 프로필 Table/API/배포 절차 — modify
  - `.github/workflows/azure-static-web-apps.yml` :: 검증/빌드/배포 설정 — modify only if needed
  - `config/staticwebapp.config.template.json`, `scripts/write-swa-config.mjs` — authenticated `/api/*` rule verification; read-only unless broken
  - `tests/e2e/candy-unlock.spec.cjs`, `tests/e2e/slot-machine.spec.cjs`, `tests/e2e/shot-integrity.spec.cjs`, `tests/e2e/region-layers.spec.cjs` — update only uncovered integration gaps
- **Signatures & Types**: No new production DTO; `GET /api/profile` and `POST /api/profile/snow-clear` use `{version:1,snowAreaCleared:boolean}`. `VITE_REQUIRE_ACCOUNT_PROFILE` is build-time only and never contains a secret.
- **Execution Flow / Logic**: Run all unit/API tests, normal-game Playwright tests, studio Playwright tests, and Azure build with a valid test tenant ID or use the CI tenant secret for the actual Azure artifact. Check that normal local preview does not try production profile API. Confirm static site auth still restricts anonymous access and leaderboard route remains functional. Update player-facing control text for Space/Q, grade blast odds, Milk next-turn shield, borrowed Wind rules, and weather. Previously existing stale home copy says 9 starting shots despite current 3; correct it under the already approved three-stone rule. Do not change unrelated score formulas, asset copyrights, or `cookie-roguelike-mockup.html`.

### I02. Push and verify Azure
- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: automated deploy — read-only except fix required failure
  - `docs/azure-static-web-apps.md` :: final deployed site/checks — modify
- **Execution Flow / Logic**: Commit this Task with the exact message below after local checks. Push the verified `main` using the configured remote; monitor GitHub Actions until both `verify` and `deploy` jobs show success. Fix concrete CI failures and create additional Korean commits linked to this Plan before retrying. Confirm `https://calm-flower-0764f6d00.3.azurestaticapps.net/` responds with company login redirect, and profile endpoint requires auth. If a company-authenticated browser session is available, verify account profile load and Snow unlock across refresh; never claim that authenticated check if it was not performed. Do not use or print `out.json` credentials. Existing old `GLOBAL` leaderboard record reset is unrelated and remains separately tracked.

## Acceptance Criteria
- [ ] Local unit/API tests, game E2E, studio E2E, and Azure artifact build pass.
- [ ] GitHub Actions `verify` and `deploy` jobs succeed on the release commit.
- [ ] Live site responds through company authentication and no new secret is committed.

## Validation
- `npm test` — all unit/API tests pass
- `npm run test:e2e` — normal game flows pass with local profile mode
- `npm run test:studio` — map studio paths pass
- `npm run build` — local artifact passes
- `npm run build:azure` with `ENTRA_TENANT_ID` and `VITE_REQUIRE_ACCOUNT_PROFILE=true` supplied through the approved CI/build environment — account-enforced artifact passes
- GitHub Actions `azure-static-web-apps.yml` — both jobs success and live auth redirect

## Commit Message
```text
chore(release): 계정 해금과 전용 스톤 능력 배포 검증

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P03-release
Task: T01-validate-deploy

- 계정·슬롯·전투 시나리오 전체 검증
- Azure 정적 앱과 관리형 API 배포 확인
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
