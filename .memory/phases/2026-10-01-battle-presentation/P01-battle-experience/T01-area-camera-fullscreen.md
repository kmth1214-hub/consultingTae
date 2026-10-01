# Task: T01 Area Maps, Camera Intro, and Full-Screen Battle

## Status: in_progress

## Goal

Make the battle scene use the approved Forest, Snow, City, and Chaos map images, introduce every battle-screen entry with the approved enemy-to-catapult camera move, and show the running game screens in a full-screen `.app-window`.

## Decision Summary

- Use only the four selected images from `Cookie Run_ OvenBreak Fan Kit/4_theme_maps/`; put tracked copies under `assets/maps/`.
- Area mapping: `forest` → forest image, `snow` → snow image, `city` → city image, `chaos` → chaos image.
- On each `showScreen('battle')`, focus enemies, pan to the catapult, then settle on the complete battle layout. Skip animation when reduced motion is requested.
- Keep the full-screen session for battle and run-result/reward screens; leave it when returning to login, board, or character selection.
- This task changes the visual mockup only; it does not create campaign state or combat rules.

## Implementation

### I01. Add only the approved map files

- Related Files:
  - `Cookie Run_ OvenBreak Fan Kit/4_theme_maps/forest_theme.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/4_theme_maps/snow_theme.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/4_theme_maps/city_theme.png` — source; read-only.
  - `Cookie Run_ OvenBreak Fan Kit/4_theme_maps/chaos_theme.png` — source; read-only.
  - `assets/maps/forest_theme.png` — new tracked project copy.
  - `assets/maps/snow_theme.png` — new tracked project copy.
  - `assets/maps/city_theme.png` — new tracked project copy.
  - `assets/maps/chaos_theme.png` — new tracked project copy.

#### Details

- Copy each source byte-for-byte; do not alter the source Fan Kit folder or add the rest of the Fan Kit.
- Preserve the source filenames in `assets/maps/` so relative references are unambiguous.
- Do not change `.gitignore`: it currently ignores the Fan Kit and does not ignore `assets/`.

### I02. Add area background selection and round camera intro

- Related Files:
  - `cookie-roguelike-mockup.html` :: `.arena`, `.arena-world`, `#arenaWorld`, `#enemyGroup`, `#launchPad`, `.trajectory`, `.arena-caption` — adapt the battle scene; modify.
  - `cookie-roguelike-mockup.html` :: `AREA_BACKGROUNDS`, `setArenaArea`, `focusCameraOn`, `playRoundIntro`, `showScreen` — add or modify plain JavaScript functions and area configuration.

#### Details

- **Types and state**:
  ```javascript
  /** @typedef {'forest'|'snow'|'city'|'chaos'} AreaId */
  /** @type {Readonly<Record<AreaId, string>>} */
  const AREA_BACKGROUNDS;
  /** @type {AreaId} */
  let currentArea;
  function setArenaArea(area: AreaId): boolean;
  function focusCameraOn(target: HTMLElement, scale: number, durationMs: number): Promise<void>;
  function playRoundIntro(): Promise<void>;
  ```
- **DOM schema**:
  - `.arena` remains the clipped viewport, receives `id="arena"` and `data-area="forest"` initially.
  - Add `#arenaWorld` as a positioned child containing the decorative world, `#enemyGroup`, `#launchPad`, and trajectory overlay. Keep combat HUD/stat elements outside the transformed world so camera movement does not move them.
  - Group the existing `.monster` elements under `#enemyGroup`; retain their individual classes and accessible labels.
  - Keep `#arenaWorld` large enough to place the launch pad and enemies visibly far apart in the final view.
- **Area background mapping**:
  - `forest`: `./assets/maps/forest_theme.png`
  - `snow`: `./assets/maps/snow_theme.png`
  - `city`: `./assets/maps/city_theme.png`
  - `chaos`: `./assets/maps/chaos_theme.png`
- **Caption values**:
  - `forest` → `숲 지역 · 🌲`
  - `snow` → `눈길 지역 · ❄️`
  - `city` → `도시 지역 · 🏙️`
  - `chaos` → `혼돈 지역 · 🌀`
- `setArenaArea` validates the requested key, updates `currentArea`, `.arena[data-area]`, the accessible arena label/caption, and the CSS background image. It returns `false` and leaves the current area intact for an unknown key.
- Use `background-size: cover` and a subtle contrast layer behind foreground objects; do not remove or obscure the map's theme illustration.
- Remove the previous CSS-only scenery layers (`.arena-sun`, `.mountains`, `.hill`, `.arena-ground`) from the arena; they cover the supplied map art and conflict with the selected area scenes. Keep the launcher, monsters, and trajectory overlay.
- **Camera sequence**:
  1. When the battle screen opens, identify `#enemyGroup` and `#launchPad` within the arena viewport.
  2. Focus `#enemyGroup` at scale `1.35` for `900 ms`.
  3. Smoothly shift the focus to `#launchPad` at the same scale over `1600 ms`.
  4. Animate back to a scale that shows the whole play field over `700 ms`; leave the arena in this final state for aiming.
  5. Use `getBoundingClientRect()` coordinates relative to `.arena` to compute camera translation, so the sequence still centers its target when the viewport changes size.
  6. If `matchMedia('(prefers-reduced-motion: reduce)').matches`, skip directly to the final view. Cancel a running animation before starting another, so re-entering the battle screen cannot stack animations.
- **Full-screen state**:
  ```javascript
  const GAMEPLAY_SCREENS = new Set(['battle', 'reward', 'transition', 'clear', 'bonus', 'qr', 'defeat']);
  async function setGameFullscreen(active: boolean): Promise<void>;
  ```
  - `setGameFullscreen(true)` calls `document.querySelector('.app-window').requestFullscreen()` from the user-initiated battle transition if no full-screen element is active. Catch rejection and show an existing toast with a concise fallback message; do not leave an unhandled promise rejection.
  - Keep full screen while `showScreen` targets a member of `GAMEPLAY_SCREENS`; exit via `document.exitFullscreen()` for `login`, `board`, or `characters`. A browser Escape exit must leave the screen usable inline.
  - Add `.app-window:fullscreen` sizing (`100vw × 100vh`, no outer border radius, viewport-height content with internal scrolling if needed) and a battle layout rule that uses the available width without clipping enemy or launcher objects. Do not call full-screen APIs on `load` or other non-user-initiated code.
- **Execution flow**:
  1. `showScreen(name)` toggles screens as it does now.
  2. For gameplay screens, request/retain full screen; for non-gameplay screens, exit it if this app owns full screen.
  3. Whenever `name === 'battle'`, apply `currentArea` and call `playRoundIntro()` once.
  4. Export `setArenaArea` on `window` for manual verification and later campaign-state integration; do not add a player-facing area selector.

### I03. Update mockup description and responsive presentation

- Related Files:
  - `cookie-roguelike-mockup.html` :: `[data-screen="board"] .game-copy` — adjust only text that claims the mockup uses angle and power sliders; modify.
  - `cookie-roguelike-mockup.html` :: `@media (max-width: 760px)`, `@media (max-width: 520px)` — ensure the battle viewport and foreground objects remain usable; modify.

#### Details

- Replace the board description's "angle and power" slider wording with mouse aiming and Spacebar power timing.
- At narrow viewports, keep the arena aspect ratio and camera focus calculations valid; let the full-screen app scroll vertically when the combat HUD cannot fit beside the map.
- Do not alter login, leaderboard, cookie roster, reward data, or story text in this task.

## Acceptance Criteria

- [ ] Four selected map files exist under `assets/maps/`; no other Fan Kit files are copied.
- [ ] `setArenaArea('forest'|'snow'|'city'|'chaos')` applies the matching image and updates the area label.
- [ ] Unknown area names do not corrupt the current area.
- [ ] Every entry to the battle screen plays enemy close-up → catapult pan → complete play view, with no repeated overlapping animation.
- [ ] Reduced-motion users see the final battle composition without the pan.
- [ ] The game view requests browser full screen on a user-initiated entry to battle, remains full screen through run screens, and returns inline when leaving gameplay screens or pressing Escape.
- [ ] The full-screen layout exposes the whole arena and combat HUD without horizontal page overflow at 1366×768 and 1920×1080.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — open the prototype in the default browser, click through to battle, and inspect the camera/full-screen sequence.
- In browser DevTools Console, run `setArenaArea('forest'); setArenaArea('snow'); setArenaArea('city'); setArenaArea('chaos');` — verify each matching background and label, then run `setArenaArea('invalid')` and verify the current scene stays unchanged.
- In browser DevTools Console, run `showScreen('battle')` after leaving full screen — verify any browser permission restriction is handled without a console error; use the actual UI click to verify full-screen entry.
- Manually repeat with reduced motion enabled in browser accessibility settings and with the viewport at 1366×768, 1920×1080, and a narrow mobile width.

## Commit Message

```text
feat(battle): add area maps and immersive round intro

Plan: 2026-10-01-battle-presentation
Phase: P01-battle-experience
Task: T01-area-camera-fullscreen

- Copy the four selected map backgrounds into project assets
- Add area switching, round camera intro, and full-screen battle layout
```

## Progress

- [x] Implementation complete
- [ ] Validation passed
- commit: pending (browser visual validation blocked)
