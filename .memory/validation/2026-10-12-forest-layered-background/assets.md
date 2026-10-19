# T01 Asset and Static Scene Validation

- Date: 2026-10-12
- Tool: built-in image_gen (three separate calls, no CLI fallback).
- Target: cookie-roguelike-mockup.html

## Assets
| File | Size | PNG color type | Alpha |
| --- | --- | --- | --- |
| assets/maps/forest-layers/distant.png | 1536×1024 | 2 (RGB) | Opaque |
| assets/maps/forest-layers/midground.png | 1536×1024 | 6 (RGBA) | Center (768,512), bottom center (768,950), corner (0,0): alpha0; waterfall/tree sample (1200,450): alpha251 |
| assets/maps/forest-layers/foreground.png | 1536×1024 | 6 (RGBA) | Center (768,512), (768,900), (400,300): alpha0; edge (50,500): alpha250 |

Original forest_theme.png and other area images remain unchanged. Generated originals remain in the default Codex generated_images location; production uses only the copies above. Forest motif images are independent layers, not slices of the old flattened backdrop.

## Verified Results
- PNG signatures, identical canvas sizes and JavaScript syntax: passed with `node .memory/validation/2026-10-12-forest-layered-background/check-static.cjs`.
- `git diff --check`: passed (Git emits an existing LF→CRLF notice for current.md, not a whitespace error).
- Camera/aim/area-selection function bodies compared to HEAD with newline normalization: unchanged.
- Real Chrome using `http://127.0.0.1:4173/cookie-roguelike-mockup.html`: forestReady=true; scenery=block; forest-road=inline; old road=none.
- Full scene, enemy focus at scale1.35, launcher focus at scale1.35: visually inspected and saved. Decorative margins do not cover gameplay because actors retain their higher stacking levels. No uncovered dark band after allowing forest scenery overscan to extend outside world bounds; arena still clips the whole scene.
- Snow/City/Chaos each use original matching theme PNG; forest scenery and road hidden, original road shown. Each screenshot inspected.
- Missing foreground URL: temporarily held the file under a separate name, reloaded actual page, obtained 404 and forestReady=false, scenery/new road hidden and original forest/road visible. Restored the file immediately; original page reloaded and ready=true confirmed afterward.
- Browser screenshots and DOM reads are separate observations after rendering to avoid capturing a prepaint state immediately after a button click.
- The temporary iframe harness called the actual app's existing area/camera functions through visible buttons. It was used for validation only and removed after capture.

## Scope and Limitations
- This is T01: parallax and ambient animations are not implemented yet.
- Chrome automation's click could not grant fullscreen activation; existing toast reported window-mode fallback. Fullscreen and responsive/motion tests remain assigned to T02/T03.
- Existing battle title/round/enemy roster do not change when setArenaArea changes map; that function currently updates map/caption/ARIA only. Unchanged, outside T01.
- Existing `.projectile-sprite { display:block }` overrides the browser's hidden-element display rule, so the idle projectile can appear at world origin despite the DOM `hidden` attribute. Visible in other original scenes as well. Recorded as adjacent existing defect; not changed in T01. Recommended follow-up: an explicit `.projectile-sprite[hidden] { display:none }` rule.

## Necessary Layout Clarifications
1. Enlarging transparent edge frames to fill the -40% overscan box would crop away the foreground and waterfall in the full view. Keep the opaque distant artwork at 100% of the expanded box, but transparent midground/foreground at 55.555556% (1/1.8) centered so their artwork fills the world itself.
2. The ready-forest world uses overflow:visible while arena retains overflow:hidden. This lets the overscanned distant art cover space exposed by the existing launcher/enemy camera, without changing world dimensions or any camera transform.
3. Apply a feathered alpha mask at transparent artwork bounds, preventing hard canvas edges when a camera focus exposes the side of the world.
4. T02 must preserve these size/mask distinctions when moving artwork to ::before. Transparent artwork coordinates are world-normalized, not overscan-normalized. T03 waterfall overlay should therefore use the actual artwork/world coordinates directly. Actual waterfall begins near x85%,y40% and extends to y72%; multiple cascades are part of the generated scenery. Do not add a second waterfall or move gameplay actors to align it.

## Evidence
- [Forest full scene](./forest-full-scene.png)
- [Enemy focus](./forest-enemy-focus.png)
- [Launcher focus](./forest-launcher-focus.png)
- [Snow regression](./snow-regression.png)
- [City regression](./city-regression.png)
- [Chaos regression](./chaos-regression.png)
- [Image failure fallback](./forest-fallback.png)

## T03 waterfall overlay anchor (2026-10-20)
The actual midground transparent image occupies the world-normalized canvas. The upper cascade overlay uses left84.1%, top40%, width3.4%, height13.5%; it follows the upper cascade, not the lower pool. No overscan-coordinate conversion applies to this child. Visually checked in enemy focus and full-scene views; original PNG files unchanged.

## Exact Prompts
+### distant.png
```text
Use case: stylized-concept. Asset type: distant layer of a side-view 2D forest combat game, landscape 1536x1024 3:2. Input image is STYLE REFERENCE only, not edit target. Create a NEW side-on storybook forest landscape, not isometric. Soft pale mint and turquoise sky fills upper half, multiple gently receding low forested mountains and distant evergreen treelines fill bottom half, warm sunlight upper left, layered soft atmospheric greens with delicate painterly game-illustration edges matching the supplied playful forest reference. Entire canvas filled, opaque. Distant scenery only, LOW contrast, no foreground trees, no houses, no waterfalls, no road, no characters, no text, no UI or badges. Horizon around y=48%. Keep the central area quiet for gameplay. Deliver only one landscape image.
```

### midground.png
```text
Use case: stylized-concept. Asset type: MIDGROUND transparent scenery layer for a side-view 2D forest combat game. Canvas landscape 1536x1024, 3:2. Image 1 forest style reference only; image 2 distant scenery palette/light reference only. Generate only midground objects on REAL transparent background; no sky, no mountains, no backdrop. Match playful hand-painted evergreen greens, turquoise waterfall, warm sunlight from upper left. Side-on view, NOT isometric. Loose small groups of fir trees frame left x=5%-24% and right x=74%-96%. Two tiny whimsical biscuit cottages with cream icing roofs nestled among trees on side margins. Narrow waterfall at x=78%-84%, y=26%-52%, descending a small mossy cliff. Keep central x=25%-73% largely transparent, ALL lower y=70%-100% transparent, and upper central sky transparent. Objects must be separate decorative silhouettes with transparent space around them, not a full opaque forest scene. No floor/road, no characters, no text/badges/UI, no checkerboard painted into image. Compatible with a separate distant landscape behind it.
```

### foreground.png
```text
Use case: stylized-concept. Asset type: FOREGROUND transparent framing layer for a side-view 2D forest combat game, landscape 1536x1024 3:2. Input image is style reference ONLY. Make dark rich emerald fir branches, a few broad forest leaves, small grasses and fern silhouettes ONLY at extreme left/right canvas edges x=0%-10% and x=90%-100%, and a thin grass border ONLY in bottom 6%. REAL TRANSPARENT empty background. Central rectangle x=12%-88%, y=0%-92% must be completely empty transparent, with no haze or gradient or painted fill. Storybook hand-painted illustration, playful forest game aesthetic, warm sunlight upper left, higher contrast than distant trees. Do not draw full trees extending across the scene. No ground plane, no houses, no waterfall, no sky, no mountains, no characters, no text/UI/badges, no checkerboard texture. This must be a sparse foreground frame that can overlay scenery without hiding gameplay.
```
