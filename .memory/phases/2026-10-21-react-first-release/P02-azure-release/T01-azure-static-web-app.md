# Task: T01 Azure Static Web App

## Status: pending

## Goal
Deploy the tested Vite static build from GitHub `main` to Azure Static Web Apps and enforce Microsoft Entra sign-in from the user's single company tenant before any game route or static asset is served.

## Decision Summary
- Use Azure Static Web Apps, not an app-specific login UI or an application API.
- Use the custom Microsoft Entra registration with a tenant-specific v2 issuer and an authenticated-only route; the default Entra provider accepts users from any tenant.
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
- **Data & Schema Fields**: `navigationFallback.rewrite='/index.html'`, exclude `'/assets/*'` and `'/.auth/*'`; route `/*` has `allowedRoles:['authenticated']`; 401 redirects to `/.auth/login/aad`; `auth.identityProviders.azureActiveDirectory.registration.openIdIssuer='https://login.microsoftonline.com/__ENTRA_TENANT_ID__/v2.0'`; use setting names `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET` for `clientIdSettingName` and `clientSecretSettingName`.
- **Execution Flow / Logic**:
  1. The ordinary local `npm run build` must remain usable without Entra values; only `npm run build:azure` requires `ENTRA_TENANT_ID`.
  2. Fail the Azure build before deployment if tenant ID is missing/invalid or a placeholder remains in the output.
  3. Ensure only the generated `dist/staticwebapp.config.json` is deployed; never commit `dist/` or the client secret.
  4. Follow Microsoft's single-tenant app registration steps and register callback `https://<SWA_HOST>/.auth/login/aad/callback` for the deployed host.
- **Error Handling**: generator prints a clear message naming the missing `ENTRA_TENANT_ID`; invalid template JSON or unresolved placeholder exits nonzero. Do not fall back to a multi-tenant issuer.

### I02. Add GitHub Actions deployment and owner setup instructions
- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: test/build/deploy workflow; new
  - `docs/azure-static-web-apps.md` :: Azure and GitHub setup runbook; new
  - `.gitignore` :: ensure `dist/` and Playwright output are ignored; modify if absent
- **Data & Schema Fields**: GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`; GitHub variable `ENTRA_TENANT_ID`; Azure Static Web App application settings `ENTRA_CLIENT_ID` and `ENTRA_CLIENT_SECRET`. Entra app registration uses single-tenant audience (`AzureADMyOrg`) and redirect URI `https://<SWA_HOST>/.auth/login/aad/callback`. Workflow runs Node 22, `npm ci`, `npx playwright install --with-deps chromium`, `npm test`, `npm run test:e2e`, `npm run build:azure`, then deploys `dist/` with `Azure/static-web-apps-deploy@v1` and `skip_app_build:true`.
- **Execution Flow / Logic**:
  1. Trigger on pushes to `main` and manual `workflow_dispatch`; gate deployment on successful engine, browser, and Azure-config build checks.
  2. Configure the SWA deploy action to upload the already-tested `dist` output; do not let Oryx rebuild a different artifact.
  3. Document creation of the Static Web App, creation/configuration of a single-tenant Entra app registration, the redirect URI, Azure auth settings, GitHub secret/variable setup, push-to-deploy behavior, and rollback through a previous GitHub deployment.
  4. Do not add application account/profile APIs or leaderboard storage. User must configure the Azure tenant values; the workflow must not print them or the client secret.
- **Error Handling**: fail the workflow if any test/build/config generation fails; fail deployment clearly if the SWA deployment token is missing. Do not echo secret values to logs.

## Acceptance Criteria
- [ ] `npm run build:azure` emits a valid `dist/staticwebapp.config.json` with the supplied tenant issuer and no placeholders.
- [ ] Static config protects `/*`, redirects unauthenticated access to Entra, and does not expose `.auth` routes to SPA fallback.
- [ ] GitHub Actions tests and builds the exact artifact it deploys on `main`.
- [ ] Deployment runbook identifies every owner-supplied Azure/GitHub value and never asks to commit a secret.
- [ ] After owner supplies tenant/app/resource/token inputs, company-tenant sign-in succeeds and an account from another tenant is rejected.

## Validation
- PowerShell: `$env:ENTRA_TENANT_ID='11111111-1111-4111-8111-111111111111'; npm run build:azure` — generated config validates and contains the tenant issuer.
- PowerShell: `Remove-Item Env:ENTRA_TENANT_ID -ErrorAction SilentlyContinue; npm run build:azure` — exits nonzero before output is considered deployable.
- `npm test && npm run test:e2e && npm run build:azure` — complete release gate.
- Azure staging smoke test after owner configuration — authenticated tenant account can enter; anonymous and non-tenant account cannot load app or assets.

## Commit Message
```text
ci(azure): deploy React game with tenant-restricted access

Plan: 2026-10-21-react-first-release
Phase: P02-azure-release
Task: T01-azure-static-web-app

- Generate authenticated single-tenant Static Web Apps config.
- Test and deploy the Vite artifact through GitHub Actions.
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
