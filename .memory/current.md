# Current Context

## Active Plan
[React First Release](./plans/2026-10-21-react-first-release.md)

## Active Phase
[P02 Azure Release](./phases/2026-10-21-react-first-release/P02-azure-release/phase.md)

## Active Task
[T01 Azure Static Web App](./phases/2026-10-21-react-first-release/P02-azure-release/T01-azure-static-web-app.md)

## Status
in_progress

- Azure build configuration, tenant-bound auth policy, GitHub Actions release workflow, and setup runbook are prepared locally.
- Cloud rollout is gated until the owner configures the Azure Standard resource, Entra registration, Table Storage, GitHub tenant variable, deployment token, and explicit `AZURE_DEPLOY_ENABLED=true` variable.
- Never commit or print the Entra client secret, SWA deployment token, or Table Storage connection string.
- Local validation: 105 Node tests passed; all 94 production browser test cases and 8 studio test cases reported success; Azure config generation passed with a dummy tenant and correctly failed without one.

## Next Step
Owner completes the Azure/GitHub settings in `docs/azure-static-web-apps.md`; then trigger the main-branch workflow and verify company-tenant allow/deny plus leaderboard storage.
