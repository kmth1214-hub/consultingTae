# Current Context

## Active Plan
[React First Release](./plans/2026-10-21-react-first-release.md)

## Active Phase
[P01 React Game](./phases/2026-10-21-react-first-release/P01-react-game/phase.md)

## Active Task
[T04 Slingshot Arena Controls](./phases/2026-10-21-react-first-release/P01-react-game/T04-slingshot-arena-controls.md)

## Status
- T01 completed as `804586e` (`feat(react): bootstrap Vite game application`).
- T02 completed as `59cf5bc` (`feat(game): complete first-release combat rules`): character effects, random starter item, explicit matching-grade fusion, Chaos combat and separate score, and browser Snow unlock profile.
- T03 completed as `ba09a9d` (`feat(react): build playable game screens`): all seven React screens, single cloned-draft session controller, reward/camp fusion, Snow unlock persistence, main and optional bonus result routing.
- T03 validation: 54 Node tests and production build pass. Chrome exercised real shot damage/ammo/HP updates, Defense keyboard use, reward fusion to B, consumable reward, next round and refresh. Desktop and 390px HUD inspected (no horizontal overflow); viewport restored.
- Visual clarity approved by the user and implemented with T03: identical 3:2 forest layer bounds, no oversized world/added blur or fog, HUD outside the world, smaller decorative props, stable enemy slots. Regional 764×508 source images still limit large-display detail; no new art generated.
- T03 has baseline angle/power range controls and synchronous sampled-trajectory resolution. T04 must replace these with the confirmed captured-pointer/Space interaction and delayed flight completion, while retaining the new single-coordinate world and sibling HUD.
- T02 validation: 48 deterministic Node tests passed, including main 15-round plus bonus 3-round progression, and Vite production build passed. UI integration is still T03; old HTML callers do not present the new fusion prompt.
- Added npm lockfile, Vite/React entry, landing shell, asset catalog, and UMD engine adapter. Existing engine/legacy mockup were not modified.
- Validation passed: clean cached npm ci, 19 Node engine tests, production build with 19 catalog PNGs, Chrome dev/production smoke checks with no errors or missing visible images.
- React 19.3.1 and Vite 8.3.4 run on the installed Node v24.18.0. Use `npm.cmd` because PowerShell blocks `npm.ps1`.
- Development server: http://127.0.0.1:5173/ (React game screens). Legacy HTML remains on its existing separate preview. Browser regression harness and Azure configuration remain future tasks.
- `sites/` and `tmp/` preview outputs remain outside this implementation plan.
- P02 requires owner-provided Azure subscription/resource, Entra tenant ID and app-registration credentials, and SWA deployment token.

## Next Step
Read T04 and implement the captured slingshot pointer/Space sequence, grab close-up, gradual zoom-out during power charge, locked camera and direction, pouch/band deformation, 30% trajectory, animated projectile and impact-time `fireShot` call. Keep `arena-world` at source aspect ratio and transform only that world; the HUD remains its sibling. T03's `gameSession.js` is the single rule/routing entry; components must not mutate run state or pass fixed damage. Replace `arenaLayout.js` baseline sampleShot/shotHitIds with T04 geometry as appropriate, keeping stable monster slots. Item and flight completion must still route engine results and persist Snow unlock. Full browser regression harness remains T05.
