# Task: T01 Vite React Foundation

## Status: done

## Goal
Create a reproducible React/Vite app shell and build pipeline in the repository root so the game can be implemented as JSX modules and emitted as a static `dist/` directory, without yet changing gameplay behavior.

## Decision Summary
- Use JavaScript/JSX and npm because the existing game engine and tests are plain JavaScript.
- Keep `assets/js/battle-engine.js` as the tested UMD module for Node and the legacy mockup; add a small ES module adapter for Vite instead of duplicating the engine.
- Import image files from their existing paths so Vite fingerprints them into the build; do not add generated `sites/` or `tmp/` files.

## Implementation

### I01. Bootstrap Vite and React
- Related Files:
  - `package.json` :: scripts and dependencies; new
  - `package-lock.json` :: reproducible npm dependency lock; new
  - `index.html` :: Vite document entry with `#root`; new
  - `vite.config.js` :: root build configuration; new
  - `src/main.jsx` :: React DOM entry point; new
  - `src/App.jsx` :: initial game landing shell; new
  - `src/styles/global.css` :: font, color variables, page reset, viewport layout; new
- **Signatures & Types**: use JavaScript/JSX (no TypeScript conversion); `main.jsx` calls `createRoot(document.getElementById('root')).render(<App />)`; `App()` returns an accessible single-page game shell.
- **Data & Schema Fields**: `package.json` must define `dev: vite`, `build: vite build`, `preview: vite preview`, and `test: node --test`; dependencies `react`, `react-dom`; dev dependency `vite`. T05 adds `test:e2e`. Set Vite output directory to `dist/` and build target to modern evergreen browsers.
- **Execution Flow / Logic**:
  1. Install dependencies with npm and retain the generated lockfile.
  2. `index.html` loads `/src/main.jsx`; do not load the legacy full-page script bundle.
  3. Render a placeholder game landing page only; later Tasks replace it with the complete screen flow.
  4. Keep browser history on one SPA path; the game flow is internal state, not URL stage tabs.
- **Error Handling**: fail the Vite build on unresolved imports or missing React root; show no fake login or leaderboard data.

### I02. Create static asset and engine adapters
- Related Files:
  - `src/game/battleEngine.js` :: named engine access; new
  - `src/game/assetCatalog.js` :: static asset imports; new
  - `assets/js/battle-engine.js` :: read-only UMD engine source
  - `assets/maps/*.png`, `assets/maps/forest-layers/*.png`, `assets/monsters/*.png`, `assets/items/*.png`, `Cookie Run_ OvenBreak Fan Kit/01. Cookies/*.png` :: read-only assets
- **Signatures & Types**: export `const BattleEngine` from `battleEngine.js` after importing the UMD file as a side effect; export a frozen `ASSETS` object from `assetCatalog.js` with `characters`, `maps`, `forestLayers`, `monsters`, and `items` groups whose values are Vite-imported URL strings.
- **Data & Schema Fields**: `ASSETS.characters` keys: `adventurer`, `alchemist`, `wizard`, `milk`, `wind`; `maps`: `forest`, `snow`, `city`, `chaos`; `forestLayers`: `distant`, `midground`, `path`, `foreground`; `monsters`: `jellySnake`, `chocolateBoar`; `items`: `fireball`, `spear`, `defense`, `heal`. Map them respectively to the existing character PNGs; `assets/maps/{forest_theme,snow_theme,city_theme,chaos_theme}.png`; `assets/maps/forest-layers/{distant,midground,path,foreground}.png`; `assets/monsters/{jelly-snake,chocolate-boar}.png`; and matching `assets/items/*.png` files.
- **Execution Flow / Logic**: Vite must bundle the imported UMD engine so `globalThis.BattleEngine` exists before the adapter exports it. Do not copy assets or modify the original mockup in this task.
- **Error Handling**: missing image import or engine global is a build/test failure; no runtime fallback to emoji for character/monster art except the existing fallback behavior for species without supplied art.

## Acceptance Criteria
- [x] `npm ci` succeeds from the committed lockfile.
- [x] `npm run dev` displays the React landing shell and Vite does not load `cookie-roguelike-mockup.html`.
- [x] `npm run build` emits `dist/index.html` and all imported static assets.
- [x] Existing `node --test tests/battle-engine.test.cjs` still passes (19 existing tests).

## Validation
- `npm ci` — clean dependency install.
- `npm test` — 19 existing engine tests pass.
- `npm run build` — Vite production build succeeds and asset URLs resolve.

## Commit Message
```text
feat(react): bootstrap Vite game application

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T01-vite-react-foundation

- Add the React entry point and reproducible npm/Vite build.
- Add asset catalog and battle engine adapter for the React app.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `804586e`

## Validation Results — 2026-10-21
- Node v24.18.0, npm 11.16.0, React/React DOM 19.3.1, Vite 8.3.4.
- `npm.cmd ci --no-audit --no-fund --offline`: passed using the generated lockfile and existing package cache.
- `npm.cmd test`: all 19 existing engine tests passed; original engine and legacy mockup were unchanged.
- `npm.cmd run build`: passed; emitted `dist/index.html`, JavaScript/CSS, and all 19 catalog PNGs.
- Chrome smoke check of both dev (5173) and production preview (5174): React landing rendered with three region cards; visible images loaded, no horizontal overflow at the normal desktop viewport, no console errors/warnings.
- Added `node_modules/` and `dist/` to `.gitignore` to keep installed/generated files out of task commits.
- PowerShell blocks `npm.ps1`; use `npm.cmd` in this environment. This does not affect npm scripts or GitHub Actions.
