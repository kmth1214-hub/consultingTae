# Player and Preview UI Separation — Validation

Date: 2026-10-20. Verified in actual Chrome over local HTTP.

## Results
- Normal URL and `?preview=0`: root `data-preview-mode=false`. `.mockup-controls`, `.viz-menu`, `.mockup-caption` all compute to `display:none` with zero layout bounds. Accessibility tree omits them. App and sidebar remain available.
- Normal player flow: login → board → character selection → battle works with the preview groups hidden at each step. Battle scene and aiming/item UI render normally. No empty prototype header gap remains.
- `?preview=1`: root mode true; controls display flex, tool menu display block, caption display block. Preview screen tabs open battle; tool menu opens and theme control switches theme. Mode survives `applyTheme()` replacing the root class.
- After preview mode, returning to the normal URL gives mode false and hides the three groups. Saved light theme was restored after testing.
- Browser console error log was empty.
- Fullscreen request was denied in the current browser and showed the app's existing window-mode fallback. Leaving actual fullscreen therefore could not be exercised; the preview gate is independent of fullscreen state and CSS remains mode-based.
- Desktop rendering visually checked. Mobile viewport was not available in this browser session; responsive game CSS was untouched and the preview selectors apply at all sizes.

## Evidence
- [Player battle, no developer controls](./player-battle.png)
- [Preview mode with developer controls](./preview-ui.png)

## Reproduce
1. Start `node .memory/validation/2026-10-12-forest-layered-background/serve-parallax.cjs`.
2. Open `/cookie-roguelike-mockup.html`, then `/cookie-roguelike-mockup.html?preview=0`, then `/cookie-roguelike-mockup.html?preview=1`.
3. Inspect root `data-preview-mode`, computed display of the three preview groups, accessibility tree and screen/theme controls.
4. Run the inline script syntax command from T01 and `git diff --check`.

No other player behavior was changed. Sidebar management links and inline prototype wording remain existing, out-of-scope UI.
