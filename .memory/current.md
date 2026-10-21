# Current Context

## Active Plan
[React First Release](./plans/2026-10-21-react-first-release.md)

## Active Phase
[P01 React Game](./phases/2026-10-21-react-first-release/P01-react-game/phase.md)

## Active Task
[T05 Browser Regression](./phases/2026-10-21-react-first-release/P01-react-game/T05-browser-regression.md)

## Status
- T01 completed as `804586e` (`feat(react): bootstrap Vite game application`).
- T02 completed as `59cf5bc` (`feat(game): complete first-release combat rules`): character effects, random starter item, explicit matching-grade fusion, Chaos combat and separate score, and browser Snow unlock profile.
- T03 completed as `ba09a9d` (`feat(react): build playable game screens`): all seven React screens, single cloned-draft session controller, reward/camp fusion, Snow unlock persistence, main and optional bonus result routing.
- T03 validation: 54 Node tests and production build pass. Chrome exercised real shot damage/ammo/HP updates, Defense keyboard use, reward fusion to B, consumable reward, next round and refresh. Desktop and 390px HUD inspected (no horizontal overflow); viewport restored.
- Visual clarity approved by the user and implemented with T03: identical 3:2 forest layer bounds, no oversized world/added blur or fog, HUD outside the world, smaller decorative props, stable enemy slots. Regional 764×508 source images still limit large-display detail; no new art generated.
- T04 completed as `94a3bfc` (`feat(react): add slingshot aim and launch feedback`). Replaced T03's temporary controls with captured primary-mouse angle → Space power → horizontal target → release/flight. Grab zooms to 1.5, charge eases toward 1 over 1400ms and freezes on Space release. Pouch/bands and a qualitative vertical meter convey angle/power; exact numeric values and sliders are hidden per the user's update.
- T04 validation: 60 Node tests, 12 actual Chrome/Chromium input regressions, and production build pass. Covers hit/miss, card visibility, item lockout, camera/meter lock, 30% arc-length preview above foreground, all cancel/blur/lost-capture cleanup, reduced motion, reload, killing-shot unmount, Wind once-per-round flight and missing-matrix recovery. Captures: `tmp/react-t04-direction.jpg` and `tmp/react-t04-flight.jpg` (untracked).
- T04 uses one sampled quadratic for preview/flight/collision; inverse SVG screen matrices compensate for zoom. Normal shot power changes range; existing Wind homing gets a matching endpoint. Combat calls the engine once at physical impact through the session; engine rules and legacy HTML remain unchanged. Touch remains intentionally ignored (mouse + Space scope).
- Focused Playwright 1.64.1 harness is now installed at `tests/e2e/slingshot.spec.cjs` and `playwright.config.cjs`, using a separate Vite port 5180 and the installed Chrome channel. `npm.cmd test` uses explicit Node-test globs so it does not execute Playwright specs. T05 extends this harness for full release flow, built-app and responsive validation.
- T02 validation: 48 deterministic Node tests passed, including main 15-round plus bonus 3-round progression, and Vite production build passed. React UI integration was completed in T03; old HTML callers do not present the new fusion prompt.
- Added npm lockfile, Vite/React entry, landing shell, asset catalog, and UMD engine adapter. Existing engine/legacy mockup were not modified.
- Validation passed: clean cached npm ci, 19 Node engine tests, production build with 19 catalog PNGs, Chrome dev/production smoke checks with no errors or missing visible images.
- React 19.3.1 and Vite 8.3.4 run on the installed Node v24.18.0. Use `npm.cmd` because PowerShell blocks `npm.ps1`.
- Development server: http://127.0.0.1:5173/ (React game screens). Legacy HTML remains on its existing separate preview. Full-release browser regression and Azure configuration remain future tasks.
- `sites/` and `tmp/` preview outputs remain outside this implementation plan.
- P02 requires owner-provided Azure subscription/resource, Entra tenant ID and app-registration credentials, and SWA deployment token.

## Next Step
Read T05 and extend the focused T04 browser harness with the blueprint's full first-release gameplay, rewards/camps/results/unlock/bonus, production-build and responsive checks. Preserve the now-tested primary mouse + Space control, qualitative aim HUD, impact-time `fireShot`, stable source-ratio world and sibling HUD. Keep the engine/session as the single rule/routing source and deterministic RNG/state instrumentation confined to tests. Do not reintroduce numeric angle/power controls or production debug shortcuts. Azure configuration remains P02.
