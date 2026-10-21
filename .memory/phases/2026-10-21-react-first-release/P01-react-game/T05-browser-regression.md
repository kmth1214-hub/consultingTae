# Task: T05 Browser Regression

## Status: done

## Goal
Add a fast, deterministic browser feedback loop that exercises the actual built React app and catches the previous UI-state disconnect, fire-shot, item, reward, and navigation failures before deployment.

## Decision Summary
- Use Playwright Chromium because the browser action requires held pointer plus Space keyboard phases that the prior manual automation could not reproduce.
- Test user-visible effects through the app and live BattleEngine state; do not test only component existence or duplicate game logic.
- Use fixed randomness only in Playwright's test page initialization, never a production debug mode.
- User-authorized update at T05 start: any non-HUD point in the arena starts the held-mouse slingshot interaction. Moving the mouse reveals a live preview in angle/power/direction phases. Retain the 30% limit and hidden numeric values; improve contrast with a dark outline and non-scaling bright dashed stroke. HUD controls keep their own actions.
- Extend the existing `playwright.config.cjs` and `.spec.cjs` convention from T04; do not add a second config. Use production preview on port 4180 because 4173 is already occupied by the user's existing preview.

## Implementation

### I01. Configure Playwright and app smoke tests
- Related Files:
  - `package.json` :: `test:e2e` and Playwright scripts; modify
  - `playwright.config.cjs` :: Chromium project and production preview; modify T04 config
  - `tests/e2e/support.cjs` :: test-only engine seam, action helpers, runtime/asset diagnostics; new
  - `tests/e2e/game-launch.spec.cjs` :: launch path; new
  - `tests/e2e/game-flow.spec.cjs` :: item/reward/round flow; new
  - `tests/e2e/accessibility.spec.cjs` :: keyboard/layout/semantic checks; new
  - `tests/e2e/slingshot.spec.cjs` :: preserve T04 coverage with the user's map-wide aim update; modify
- **Data & Schema Fields**: Playwright `baseURL` is `http://127.0.0.1:4180`; webServer runs `npm run preview:e2e`, which builds and serves with Vite preview on 4180 with strictPort. Keep existing preview processes running. Use `page.addInitScript(() => { Math.random = () => 0.5; })` for deterministic test rolls. Test state is normal app state; no query-string test hooks.
- **Execution Flow / Logic**:
  1. Build before Playwright or configure its webServer to run `npm run build && npm run preview`.
  2. Assert the landing screen has no fake login/leaderboard; selecting the default unlocked Cookie starts combat with 100 HP, 9 ammo, and one initial item.
  3. Drive the real aim sequence: pointer-down anywhere in the non-HUD map (or slingshot), pointer move vertically with a visible partial trajectory, hold/release Space, move horizontally to select, release pointer; assert the HUD changes and shot animation returns to idle.
  4. Fire one projectile with deterministic RNG; assert ammo decreases exactly once, enemy HP or miss feedback is rendered, and a living enemy response updates HP. Assert a miss still spends ammo.
  5. Use a consumable by button and number key; assert count decreases, HP/effect changes and enemy response matches the engine event. Confirm item action is rejected during aiming and when empty/blocked.
  6. Exercise reward choice gating and fusion confirm/decline, Camp transition, main clear to bonus entry, bonus completion state, and separate score display using test fixtures at the engine seam where a full run would be unnecessarily long.
  7. Collect browser console errors, failed local asset responses, and screenshots on test failure.
- **Error Handling**: one failed browser action reports the current screen, aim phase, run values, and browser console. Test retries are disabled for deterministic failures; no hidden sleeps replace condition-based `expect` waits.

### I02. Verify accessibility and layout at supported sizes
- Related Files:
  - `tests/e2e/accessibility.spec.cjs` :: layout and keyboard cases; modify
  - `src/components/*.jsx` and `src/styles/*.css` :: only fixes discovered by assertions; modify if needed
  - `src/game/useAimController.js`, `src/components/BattleArena.jsx`, `src/components/TrajectoryPreview.jsx`, `src/styles/arena.css` :: user-approved map-wide aim and earlier/clearer preview; modify
  - `index.html`, `src/favicon.svg` :: missing browser icon discovered by production resource checks; fix
- **Execution Flow / Logic**:
  1. Verify 1440×900 desktop and 390×844 narrow viewport have no horizontal overflow and all in-arena controls remain reachable.
  2. Verify visible buttons have accessible names, decorative images are hidden from assistive technology, disabled cookie cards expose disabled semantics, and toast content is announced using a live region.
  3. Verify `prefers-reduced-motion: reduce` stops non-essential camera and ambient motion while preserving shot-state feedback.
  4. Verify entering/exiting browser fullscreen never reveals prototype stage tabs and does not leave aiming active.
- **Error Handling**: capture failing viewport dimensions and element bounds; only change styles/semantics needed to meet the confirmed behavior.

## Acceptance Criteria
- [x] `npm test` and `npm run test:e2e` pass deterministically on the same commit.
- [x] Browser tests reproduce and guard against the former cosmetic Heal toast with unchanged inventory/HP.
- [x] Browser tests exercise the actual pointer + Space + launch flow, ammo consumption on hit/miss, and projectile/card completion timing.
- [x] No browser console errors or failed local asset requests; no horizontal overflow at target sizes.

## Validation
- `npm test` — Node engine and profile suites pass.
- `npm run test:e2e` — all Playwright Chromium flows pass against production preview.
- `npm run build` — production bundle emits without warnings about missing local images or duplicate IDs.

## Commit Message
```text
test(react): cover gameplay in Chromium

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T05-browser-regression

- Add deterministic browser checks for real shot and item flows.
- Verify reward progression, accessibility, and responsive layouts.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

### Implementation / Validation Notes
- User interaction update is implemented before regression: primary mouse-down at any non-HUD map point captures the pointer and starts the existing mouse/Space flow. HUD buttons/cards retain their own interactions. Mouse movement exposes the live 30% preview during angle, power and direction phases; a bright non-scaling dash plus dark outline stays readable at desktop/narrow sizes. Angle/power numbers remain hidden.
- The narrow in-arena consumable table compacts only while aiming (items are already disabled then), leaving more preview visible; it restores its use buttons after cancellation/impact. Browser assertions sample the actual SVG arc's exposed screen positions so a path hidden behind the HUD cannot pass merely by existing in the DOM.
- Extended the existing `.cjs` harness rather than creating a duplicate config. `preview:e2e` builds first, then serves `dist` at 4180 with `reuseExistingServer:false`, no retries. 4173 was in use and was left running. Tests assert the loaded page has no Vite dev client.
- `support.cjs` observes engine results and cloned run snapshots through an init-script-only wrapper around the existing global UMD engine assignment. Normal input/item cases use the unchanged real engine. Reward/Camp/Snow/City/Chaos branch cases use initial engine fixtures and explicit high-damage/all-target shot options to shorten setup; no production debug mode, fixture module import, test query parameter or extra UI was added. A served-bundle assertion checks the test-only global is absent.
- Runtime/page errors and failed built assets fail every browser test. Failures attach screen, phase, live run/event history, viewport/body, console/resource details, screenshots and traces. Fixed randomness stays in `page.addInitScript`; charge tests wait for the live gauge condition rather than setting aim state.
- Production checks found and fixed two adjacent issues: default favicon requests returned 404; exiting fullscreen could leave captured aiming active when no window resize fired. Added a bundled SVG icon and explicit fullscreen-change cancellation/cleanup. Combat rules/engine and legacy HTML remain unchanged.
- `npm.cmd test`: 60 Node tests passed. `npm.cmd run test:e2e`: all 30 Chromium/installed-Chrome tests passed against a fresh production build (no retries, 1.3m). `npm.cmd run build` and `git diff --check`: pass.
- Browser coverage: home/character/start values; map-wide and launcher aim; pre-Space moving preview, zoom/camera lock, hit/miss/one-ammo, flight/card timing, cancellation and unmount, Wind homing, missing geometry; real Heal button+key inventory/HP/enemy-turn updates and empty rejection; Defense/Fireball/Spear/Alchemist effects, frozen/aim lockout; fusion confirmation/decline, reward gating, both Camp reward flows, immediate Snow unlock/reload, City result and all three optional Chaos rounds with frozen main/separate bonus score; defeat/restart; named controls/disabled semantics/Tab+Enter/live regions, duplicate IDs, image loading, 1440×900 and 390×844 overflow/control reachability/visible arc samples, actual fullscreen entry/exit, reduced motion.
- Desktop mouse + Space remains the supported aiming input; touch is intentionally ignored. Browser branch fixtures verify UI routing/rules, not balance or an unassisted natural-RNG full-run playthrough. Node suites retain full 15+3 engine/session progression coverage. Azure deployment remains P02.
