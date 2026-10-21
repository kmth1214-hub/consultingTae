# Current Context

## Active Plan
[React First Release](./plans/2026-10-21-react-first-release.md)

## Active Phase
[P01 React Game](./phases/2026-10-21-react-first-release/P01-react-game/phase.md)

## Active Task
[T03 React Game Screens](./phases/2026-10-21-react-first-release/P01-react-game/T03-react-game-screens.md)

## Status
- T01 completed as `804586e` (`feat(react): bootstrap Vite game application`).
- T02 completed as `59cf5bc` (`feat(game): complete first-release combat rules`): character effects, random starter item, explicit matching-grade fusion, Chaos combat and separate score, and browser Snow unlock profile.
- T02 validation: 48 deterministic Node tests passed, including main 15-round plus bonus 3-round progression, and Vite production build passed. UI integration is still T03; old HTML callers do not present the new fusion prompt.
- Added npm lockfile, Vite/React entry, landing shell, asset catalog, and UMD engine adapter. Existing engine/legacy mockup were not modified.
- Validation passed: clean cached npm ci, 19 Node engine tests, production build with 19 catalog PNGs, Chrome dev/production smoke checks with no errors or missing visible images.
- React 19.3.1 and Vite 8.3.4 run on the installed Node v24.18.0. Use `npm.cmd` because PowerShell blocks `npm.ps1`.
- Development server: http://127.0.0.1:5173/ (landing shell only). Browser regression harness and Azure configuration remain future tasks.
- `sites/` and `tmp/` preview outputs remain outside this implementation plan.
- P02 requires owner-provided Azure subscription/resource, Entra tenant ID and app-registration credentials, and SWA deployment token.

## Next Step
Read T03 and implement React game screens with a single game-session controller. Connect engine results, fusion prompts (including pending camp decisions), profile unlock, normal rewards/camps, and the optional bonus route. Use T02's integration notes for the new event fields and score snapshot; T04 supplies the full pointer/Space aiming controller afterward.
