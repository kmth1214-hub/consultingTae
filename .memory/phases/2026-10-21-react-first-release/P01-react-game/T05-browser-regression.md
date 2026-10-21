# Task: T05 Browser Regression

## Status: pending

## Goal
Add a fast, deterministic browser feedback loop that exercises the actual built React app and catches the previous UI-state disconnect, fire-shot, item, reward, and navigation failures before deployment.

## Decision Summary
- Use Playwright Chromium because the browser action requires held pointer plus Space keyboard phases that the prior manual automation could not reproduce.
- Test user-visible effects through the app and live BattleEngine state; do not test only component existence or duplicate game logic.
- Use fixed randomness only in Playwright's test page initialization, never a production debug mode.

## Implementation

### I01. Configure Playwright and app smoke tests
- Related Files:
  - `package.json` :: `test:e2e` and Playwright scripts; modify
  - `playwright.config.js` :: Chromium project and local Vite server; new
  - `tests/e2e/game-launch.spec.js` :: launch path; new
  - `tests/e2e/game-flow.spec.js` :: item/reward/round flow; new
  - `tests/e2e/accessibility.spec.js` :: keyboard/layout/semantic checks; new
- **Data & Schema Fields**: Playwright `baseURL` is `http://127.0.0.1:4173`; webServer runs `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`; use `page.addInitScript(() => { Math.random = () => 0.5; })` for deterministic test rolls. Test state is normal app state; no query-string test hooks.
- **Execution Flow / Logic**:
  1. Build before Playwright or configure its webServer to run `npm run build && npm run preview`.
  2. Assert the landing screen has no fake login/leaderboard; selecting the default unlocked Cookie starts combat with 100 HP, 9 ammo, and one initial item.
  3. Drive the real aim sequence: pointer-down on slingshot, pointer move vertically, hold/release Space, move horizontally to select, release pointer; assert the HUD changes and shot animation returns to idle.
  4. Fire one projectile with deterministic RNG; assert ammo decreases exactly once, enemy HP or miss feedback is rendered, and a living enemy response updates HP. Assert a miss still spends ammo.
  5. Use a consumable by button and number key; assert count decreases, HP/effect changes and enemy response matches the engine event. Confirm item action is rejected during aiming and when empty/blocked.
  6. Exercise reward choice gating and fusion confirm/decline, Camp transition, main clear to bonus entry, bonus completion state, and separate score display using test fixtures at the engine seam where a full run would be unnecessarily long.
  7. Collect browser console errors, failed local asset responses, and screenshots on test failure.
- **Error Handling**: one failed browser action reports the current screen, aim phase, run values, and browser console. Test retries are disabled for deterministic failures; no hidden sleeps replace condition-based `expect` waits.

### I02. Verify accessibility and layout at supported sizes
- Related Files:
  - `tests/e2e/accessibility.spec.js` :: layout and keyboard cases; modify
  - `src/components/*.jsx` and `src/styles/*.css` :: only fixes discovered by assertions; modify if needed
- **Execution Flow / Logic**:
  1. Verify 1440×900 desktop and 390×844 narrow viewport have no horizontal overflow and all in-arena controls remain reachable.
  2. Verify visible buttons have accessible names, decorative images are hidden from assistive technology, disabled cookie cards expose disabled semantics, and toast content is announced using a live region.
  3. Verify `prefers-reduced-motion: reduce` stops non-essential camera and ambient motion while preserving shot-state feedback.
  4. Verify entering/exiting browser fullscreen never reveals prototype stage tabs and does not leave aiming active.
- **Error Handling**: capture failing viewport dimensions and element bounds; only change styles/semantics needed to meet the confirmed behavior.

## Acceptance Criteria
- [ ] `npm test` and `npm run test:e2e` pass deterministically on the same commit.
- [ ] Browser tests reproduce and guard against the former cosmetic Heal toast with unchanged inventory/HP.
- [ ] Browser tests exercise the actual pointer + Space + launch flow, ammo consumption on hit/miss, and projectile/card completion timing.
- [ ] No browser console errors or failed local asset requests; no horizontal overflow at target sizes.

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
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
