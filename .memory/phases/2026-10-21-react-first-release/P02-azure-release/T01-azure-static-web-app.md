# Task: T01 Azure Static Web App

## Status: in_progress

## Goal
Deploy the tested Vite static build and the Node.js 22 managed leaderboard API from GitHub `main` to Azure Static Web Apps, configure Azure Table Storage, and enforce Microsoft Entra sign-in from the user's single company tenant before any game route, static asset, or leaderboard API route is served.

## Decision Summary
- Use Azure Static Web Apps for hosting and its managed Azure Functions API for the company leaderboard; do not add an app-specific login UI.
- Use the custom Microsoft Entra registration with a tenant-specific v1 issuer, `userDetailsClaim` set to `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`, and authenticated-only routes. This provides the API with a display name while the API rejects email-shaped values; verify the selected claim is populated in the tenant before go-live.
- Keep client secrets only in Azure app settings/GitHub secrets. The tenant ID and client ID are deployment configuration, not credentials.
- Entra tenant/app registration, Azure subscription/resource, and SWA deployment token must be supplied/configured by the owner before the final cloud authentication check.

## Implementation

### I01. Generate Static Web Apps auth config during production build
- Related Files:
  - `config/staticwebapp.config.template.json` :: SWA route/auth template; new
  - `scripts/write-swa-config.mjs` :: tenant validation and output generator; new
  - `package.json` :: `build:azure` script; modify
  - `dist/staticwebapp.config.json` :: generated deploy artifact; generated, not tracked
- **Signatures & Types**: `write-swa-config.mjs` reads `process.env.ENTRA_TENANT_ID`, validates it as a UUID, replaces exactly `__ENTRA_TENANT_ID__` in the JSON template, parses the result to validate JSON, and writes it to `dist/staticwebapp.config.json`. `build:azure` runs `vite build` followed by this generator.
- **Data & Schema Fields**: `navigationFallback.rewrite='/index.html'`, exclude `'/assets/*'` and `'/.auth/*'`; routes `/api/*` and `/*` have `allowedRoles:['authenticated']`; 401 redirects to `/.auth/login/aad`; `auth.identityProviders.azureActiveDirectory.userDetailsClaim='http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'`; `registration.openIdIssuer='https://login.microsoftonline.com/__ENTRA_TENANT_ID__'` (Entra v1, without `/v2.0`); use setting names `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` for `clientIdSettingName` and `clientSecretSettingName`.
- **Execution Flow / Logic**:
  1. The ordinary local `npm run build` must remain usable without Entra values; only `npm run build:azure` requires `ENTRA_TENANT_ID`.
  2. Fail the Azure build before deployment if tenant ID is missing/invalid or a placeholder remains in the output.
  3. Ensure only the generated `dist/staticwebapp.config.json` is deployed; never commit `dist/` or the client secret.
  4. Follow Microsoft's single-tenant app registration steps and register callback `https://<SWA_HOST>/.auth/login/aad/callback` for the deployed host.
- **Error Handling**: generator prints a clear message naming the missing `ENTRA_TENANT_ID`; invalid template JSON or unresolved placeholder exits nonzero. Do not fall back to a multi-tenant issuer.

### I02. Add GitHub Actions deployment and owner setup instructions
- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: test/build/deploy workflow with `dist/` and managed `api/`; new
  - `docs/azure-static-web-apps.md` :: Azure, Table Storage and GitHub setup runbook; new
  - `.gitignore` :: ensure `dist/` and Playwright output are ignored; modify if absent
- **Data & Schema Fields**: GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`; GitHub variable `ENTRA_TENANT_ID`; Azure Static Web App application settings `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `LEADERBOARD_STORAGE_CONNECTION_STRING`, and optional `LEADERBOARD_TABLE_NAME` (default `LeaderboardRecords`). Never put the Table connection string in GitHub variables or tracked files. Entra app registration uses single-tenant audience (`AzureADMyOrg`) and redirect URI `https://<SWA_HOST>/.auth/login/aad/callback`. Workflow runs Node 22, `npm ci`, `npx playwright install --with-deps chrome`, `npm test`, `npm run test:e2e`, and `npm run test:studio`; builds `dist/` with `npm run build:azure`, then deploys the tested output and managed function source `api/` with `Azure/static-web-apps-deploy@v1`. The prebuilt Vite artifact uses `app_location: dist`, `skip_app_build: true`, and empty `output_location`; `api_location: api` keeps the managed API build enabled.
- **Execution Flow / Logic**:
  1. Trigger on pushes to `main` and manual `workflow_dispatch`; gate deployment on successful engine, browser, and Azure-config build checks.
  2. Configure the SWA deploy action to upload the already-tested `dist` output and package `api/` with its Node 22 runtime/dependencies; do not let Oryx rebuild a different frontend artifact or skip the API build.
  3. Set `platform.apiRuntime` to `node:22` in the generated SWA config and require authenticated access for `/api/*` before the general `/*` rule; the API also validates the SWA principal itself.
  4. Document creation of the Static Web App and Table Storage table, a single-tenant Entra app registration, the redirect URI, Azure auth settings, all Azure/GitHub settings, push-to-deploy behavior, and rollback through a previous GitHub deployment.
  5. Do not add account/profile APIs beyond the leaderboard endpoints. User must configure the Azure tenant/resource values; the workflow must not print them, the client secret, or storage connection string.
- **Error Handling**: fail the workflow if any test/build/config generation fails; fail deployment clearly if the SWA deployment token is missing. Do not echo secret values to logs.

## Acceptance Criteria
- [x] `npm run build:azure` emits a valid `dist/staticwebapp.config.json` with the supplied tenant v1 issuer, name `userDetailsClaim`, `platform.apiRuntime:'node:22'`, authenticated `/api/*`, and no placeholders.
- [x] Static config protects `/*`, redirects unauthenticated access to Entra, and does not expose `.auth` routes to SPA fallback.
- [ ] GitHub Actions tests and deploys the built Vite output plus managed API from `api/` on `main`.
- [x] Deployment runbook identifies every owner-supplied Azure/GitHub value, including Table Storage configuration, and never asks to commit a secret.
- [ ] After owner supplies tenant/app/resource/token inputs, company-tenant sign-in succeeds and an account from another tenant is rejected.

## Validation
- PowerShell: `$env:ENTRA_TENANT_ID='11111111-1111-4111-8111-111111111111'; npm run build:azure` — generated config validates and contains the tenant issuer.
- PowerShell: `Remove-Item Env:ENTRA_TENANT_ID -ErrorAction SilentlyContinue; npm run build:azure` — exits nonzero before output is considered deployable.
- `npm test && npm run test:e2e && npm run build:azure` — complete release gate.
- Azure staging smoke test after owner configuration — authenticated tenant account can enter; anonymous and non-tenant account cannot load app or assets.

## Commit Message
```text
배포준비(azure): 회사 계정 전용 앱 구성

Plan: 2026-10-21-react-first-release
Phase: P02-azure-release
Task: T01-azure-static-web-app

- 빌드 시 테넌트 전용 Static Web Apps 인증 설정을 생성한다.
- 검증된 Vite 산출물과 관리형 API 배포 workflow를 구성한다.
```

## Progress
- [x] Local implementation complete: build-time auth config, gated GitHub Actions workflow, and owner setup runbook.
- [x] Local validation passed: 105 Node tests; 94 production browser assertions and 8 studio browser assertions all reported `ok`; Azure config positive/negative tenant checks and production build.
- [ ] GitHub Actions execution, Azure deployment, and tenant-isolation smoke test remain pending owner cloud configuration.
- Required before deployment: Standard SWA resource; Entra tenant/app and Azure settings; Table Storage; repository variable `ENTRA_TENANT_ID`; secret `AZURE_STATIC_WEB_APPS_API_TOKEN`; set `AZURE_DEPLOY_ENABLED=true` only after the Azure resource settings are complete.
- commit: implementation checkpoint recorded in Git history
