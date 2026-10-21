# Plan: React First Release

## Goal
Turn the current browser prototype into a complete, testable Vite + React single-page game, preserving confirmed game rules and arena controls, then deploy the static build to Azure Static Web Apps behind single-company-tenant Microsoft Entra sign-in. The first release omits in-app login/profile screens, leaderboard, administration, QR presentation, and bonus rewards. The optional three-round bonus combat remains playable with its established maps, monsters, and scoring. Snow-area character unlock is saved in the current browser.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Create and verify the React game, including T06 enemy feedback and T07 slingshot visual polish. | [P01](../phases/2026-10-21-react-first-release/P01-react-game/phase.md) |
| P02 | `in_progress` | Package and deploy the Vite build to Azure Static Web Apps with tenant-restricted Entra access and GitHub Actions. | [P02](../phases/2026-10-21-react-first-release/P02-azure-release/phase.md) |

## Release boundaries
- The deployed app opens at a game landing screen. It does not include the prototype's fake login, leaderboard, admin panel, or top-level stage tabs.
- Preserve Forest, Snow, and City progression, weapon/item rewards, boss attacks, result screens, regional scenery, and optional Chaos bonus combat.
- Bonus rounds use the established mixed monster/map and damage-score rules. Do not show a QR code or grant any extra bonus reward.
- Persist only the Snow-clear unlock flag in browser local storage; keep the active run in memory.
- Azure tenant ID, Entra application client ID/secret, Static Web App deployment token, and Azure subscription access are external inputs for P02. Never commit credentials.

## Dependencies and current gaps
- The implementation gaps below describe the planning baseline and were resolved by P01 (62 Node and 41 production-preview Chromium tests pass). P02's owner-supplied Azure inputs remain outstanding.
- There is no root `package.json`, Vite configuration, React source tree, Playwright setup, Azure workflow, or Static Web Apps config.
- `cookie-roguelike-mockup.html` is the current UI reference; `assets/js/battle-ui.js` performs imperative DOM rendering, while `assets/js/battle-engine.js` is a UMD engine used by 19 Node tests.
- Before the UI migration, add engine regression coverage and complete confirmed rules missing in the engine: one random starting consumable, character-specific weapon effects, prompted weapon fusion, complete Chaos rounds/bosses, and separate bonus score.
- Azure's default Microsoft Entra provider accepts users from any tenant. P02 must configure a tenant-specific issuer and authenticated route policy. See [Microsoft Entra authentication for Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization), [custom authentication configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom), and [Static Web Apps configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration).
