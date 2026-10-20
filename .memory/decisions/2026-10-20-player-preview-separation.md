# Decisions: Player and Preview UI Separation

- Date: 2026-10-20
- Status: Confirmed
- Target: `cookie-roguelike-mockup.html`

## D01. Hide prototype tabs throughout player mode
- **Chosen**: User option 1. Hide the entire `.mockup-controls` header, including its title and screen navigation tabs, on every screen by default.
- **Rationale**: Players should not see prototype navigation when leaving fullscreen. Visibility must depend on the page mode, not the current screen or fullscreen state.

## D02. Explicit URL preview mode
- **Chosen**: User option 1. Show developer UI only when the URL query parameter `preview` has the exact value `1`, e.g. `cookie-roguelike-mockup.html?preview=1`.
- **Rationale**: Developers retain direct access without exposing a preview toggle in the player interface. Missing or other parameter values use player mode. The mode is derived from the current URL on load and is not persisted in local storage.

## D03. Preview-only tools and caption
- **Chosen**: User option 1. Also restrict `.viz-menu` (theme, PNG export, print/PDF) and `.mockup-caption` to preview mode.
- **Rationale**: These surrounding prototype tools and instructions distract from the player interface. Keep their existing behavior available for preview.

## D04. Existing application integration
- **Chosen**: Determined from code inspection. Keep existing game screen navigation, sidebar, automatic gameplay fullscreen requests, fullscreen fallback, camera cleanup and combat behavior. Keep the saved theme applied in player mode. No replacement player settings menu is included.
- **Rationale**: Prototype controls are outside `#appWindow`; requesting fullscreen currently hides them incidentally, and leaving fullscreen exposes them again. A page-level mode gate resolves the cause without changing fullscreen routing. Existing `applyTheme()` assigns the root element's entire className, so mode state must survive theme changes (e.g. use a separate data attribute).
- **Implementation constraints**: Hide preview-only elements before the first paint to avoid flashing and remove them from keyboard navigation while hidden. Do not leave an empty header/caption layout gap. Retain their DOM for existing event handlers and export helpers. Reuse existing responsive game layout.

## Validation Expectations
- Normal URL: login, board, character selection and gameplay/result screens show none of the three preview-only UI groups.
- `?preview=1`: all three groups remain available; screen tabs and tools still work.
- Leaving fullscreen, fullscreen denial/fallback, screen changes and theme changes never expose preview UI in player mode.
- Preview mode survives theme switching; normal mode stays normal after previously opening preview mode.
- Check desktop/mobile layout, keyboard focus, initial rendering and JavaScript syntax. Record any browser fullscreen limitation honestly.

## Adjacent Findings — Not Added to Scope
- Sidebar includes a game-management mockup action; several screens also contain inline prototype wording. These are not part of the three confirmed UI groups and remain unchanged.
- Hiding prototype tabs does not implement missing gameplay progression, authentication, persistence or QR validation.
- Existing idle projectile hidden/display conflict remains outside scope.

## Next Step
Run `/memory-plan player-preview-separation` to create task blueprints. This interview changes no implementation code or active execution pointer.
