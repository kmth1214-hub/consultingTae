# Local leaderboard development

This workflow runs the React game, the managed Functions API, and the Static Web Apps authentication emulator together. It uses the API's in-memory repository and never needs Azure credentials or a cloud resource.

## Prerequisites

- Node.js 22 LTS and npm.
- Azure Static Web Apps CLI (`swa`) available in `PATH`.
- Azure Functions Core Tools v4 (`func`) available in `PATH` if the SWA CLI does not install or locate it automatically.

From the repository root, install the project and API dependencies:

```powershell
npm ci
npm ci --prefix api
```

Install the SWA CLI and Functions Core Tools using Microsoft's current Windows instructions. Do not add either tool's credentials to this repository.

## Start the local app

In terminal 1, start Vite:

```powershell
npm run dev
```

In terminal 2, enable the development-only in-memory identity fallback and start the SWA emulator, which also starts the Functions API:

```powershell
$env:NODE_ENV = 'development'
$env:LEADERBOARD_LOCAL_MODE = 'true'
$env:LEADERBOARD_LOCAL_USER_ID = 'local-player-1'
$env:LEADERBOARD_LOCAL_DISPLAY_NAME = 'Local Player'
npm run dev:leaderboard
```

Open `http://localhost:4280`. The SWA CLI proxies the Vite server on `127.0.0.1:5173`, the API in `api/`, and its local authentication emulator. To create a fake authenticated principal, visit `http://localhost:4280/.auth/login/aad`, choose a non-email username, provide a user ID, and include the `authenticated` role. The API requires an `aad` principal with that role and a non-email `userDetails`; the server ignores all identity fields submitted by the browser.

Use the game's leaderboard button to submit a main-run result and read it back. To test another account while retaining the same in-memory board, visit `/.auth/logout`, sign in again through `/.auth/login/aad` with a different user ID, and reload the leaderboard. The two accounts have separate personal records. Restarting the API process clears the in-memory data.

For a quick API-only local fallback without the SWA principal, keep the four environment values above set while running the Functions host. This fallback is accepted only outside production and never ships in the browser build. Production rejects missing/invalid SWA identity and missing Table Storage configuration instead of falling back to memory.

## Checks

```powershell
npm test
npm run test:e2e
npm run test:studio
npm run build
```

The browser suite uses deterministic same-origin API fixtures. It does not call Azure, persist leaderboard data in browser storage, or require a fake principal. The local SWA smoke above is a manual integration check; skip only that smoke when the SWA CLI or Functions Core Tools is unavailable.

## Microsoft references

- [Set up local development for Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/local-development)
- [Custom authentication in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom)
- [API support in Azure Static Web Apps with Azure Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions)
