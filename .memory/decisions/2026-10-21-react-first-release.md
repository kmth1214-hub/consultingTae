# Decisions: React First Release

- Date: 2026-10-21
- Status: Confirmed
- Supersedes the implementation-platform constraint in `.memory/decisions/2026-10-20-combat-state-repair.md`; its combat rules and validation expectations remain applicable.

## D01. First-release scope
- **Chosen**: Migrate the existing playable game and its confirmed gameplay/UI requirements into React. Exclude in-app accounts, leaderboard, and administration from the first release.
- **Rationale**: Deliver a complete playable first version before expanding into company features.

## D02. App and deployment architecture
- **Chosen**: Vite + React single-page app deployed as static files to Azure Static Web Apps.
- **Rationale**: The game is a browser-only experience with no required application server in the first release, and the existing battle engine is plain JavaScript with deterministic Node tests.

## D03. UI migration baseline
- **Chosen**: Preserve the current mockup's screen flow and controls while implementing the previously confirmed slingshot, aim/zoom, item HUD, and magic-candy visibility behavior.
- **Rationale**: This release is a platform migration and playable completion, not an unrelated visual redesign.

## D04. Deployment access
- **Chosen**: Require Azure sign-in and restrict access to the user's company tenant.
- **Rationale**: Preserve the stated goal that colleagues using the same company account can access the deployment, while leaving game-specific identity and persistence out of scope.

## D05. Existing gameplay decisions
- **Chosen**: Keep existing combat, item, reward, boss cadence, scoring, area, and obstacle decisions as the gameplay source of truth; run state remains in memory for the session.
- **Rationale**: React migration should retain the confirmed game rules rather than introduce a second rule set.

## D06. Bonus area
- **Chosen**: Include the three-round bonus combat route with its established monsters, maps, and scoring rules. Exclude QR presentation and all additional bonus rewards from the first release.
- **Rationale**: Keep the optional gameplay challenge while avoiding reward delivery and global first-clear tracking that need external assets and shared persistence.

## D07. Character unlock persistence
- **Chosen**: Save the Snow-area clear unlock in browser local storage so 우유맛 쿠키 and 바람궁수 쿠키 stay available in that browser on future visits.
- **Rationale**: Preserve the unlock progression without adding game accounts or a profile backend.

## Deferred deployment inputs
- Company Microsoft Entra tenant configuration is required before access restriction can be verified in Azure.
