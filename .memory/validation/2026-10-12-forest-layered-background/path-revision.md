# T01R01 Forest Path Revision

- Date: 2026-10-12
- User request: put launcher route between scenery layers2/3; recreate route from original image; broaden map and increase launcher-enemy distance.
- Generated asset: `assets/maps/forest-layers/path.png`,1536×1024 RGBA, built-in image_gen; original reference preserved. Upper center alpha0, path center alpha252, lower center alpha0. No CLI fallback.

## Implementation
- `#forestScenery` z0 now contains distant and midground only. New `#forestPath` z2 is a natural pink illustrated route. Launcher z3 and enemies z4 occupy the path. Separate foreground world child z5 is in front. Trajectory z6 and projectile z7 remain readable above decoration.
- Replaced forest-only SVG brown platform with path bitmap; unchanged original road for other areas/fallback.
- Ready forest world is240% wide and200% tall (was160%/160%). Fit scale recalculates from current dimensions, leaving wider scenery and smaller actors in the full-scene view. Launcher left14%, enemies left73%/right16%, shared feet at74% world height. Mobile≤520px enemies left68%/right14%,40×46px, so they do not overlap at fit.
- `fitArenaWorld` refreshes idle framing after asset readiness, area changes and resize/fullscreen. Existing pointer inverse matrix and trajectory/projectile functions are unchanged. Intro return recomputes fit scale so a late asset readiness change does not return to the old scale.

## Validation
- `node .memory/validation/2026-10-12-forest-layered-background/check-path-revision.cjs`: PNG and vm.Script syntax passed.
- Compare six aim/trajectory/projectile function bodies against prior HEAD after newline normalization: unchanged.
- `git diff --check`: passed.
- Real Chrome, same arena790px wide: old default world1264px, world gap408px, screen gap255.369px; new world1896px, world gap999px, screen gap416.156px. World width1.5×; actual gap2.45×, on-screen gap1.63×. Measurements use launcher right edge to nearest snake left edge.
- Launcher and nearest enemy bounding-rectangle bottom values agree to subpixel rounding: both on same route plane.
- Test harness buttons dispatch PointerEvents and Space KeyboardEvents into the real page's existing handlers. Early release: ammo5→5, phase idle. Completed shot: ammo5→4, phase idle. Actual projectile animation runs in the loaded page. This is a synthetic-event integration check, not a claim of physical native mouse/keyboard input.
- Snow/City/Chaos: original world1264px, path/foreground hidden, original road visible. Snow launcherleft38px/enemyleft543px, preserving default layout.
- Missing path file (temporary held filename): reload produced ready=false, original world1264px, path/foreground hidden, old road block. File restored immediately and reload ready=true.
- Desktop and760px composition inspected. At390px initial enemy overlap was discovered; mobile sizes/spacing corrected. Because browser viewport override became unstable, final mobile validation used a fixed390px iframe containing the actual page: arena332px, world797px; monster bounding rectangles x255.827~272.489,278.544~295.206,298.869~315.532. Positive gaps6.055px and3.663px confirm no overlap. Temporary viewport override reset. A full-page mobile screenshot timed out, so no successful full-page390px capture is claimed.
- Browser's existing fullscreen request falls back to window mode under automation. No fullscreen success claimed.
- Temporary iframe review harness removed after inspection; no product test buttons added.

## Adjacent Existing Issue
Idle projectile hidden/display override remains previously reported, outside this revision. No unrelated projectile styling fix included.

## Screenshot
- [760px composition](./path-revision-760.png) — actual page in the review iframe, before mobile-only rules were added; those rules affect≤520px and do not change this view.

## Continuation Notes
- T02 must query `[data-forest-layer]` under `#arenaWorld`, not only forestScenery: foreground is now a separate z5 world child. Leave path and actors on the actual world camera; only decorative scenery receives parallax.
- Keep transparent artwork at world-normalized size and its feathering when moving background to ::before. Do not apply the old overscan-normalized waterfall coordinates in T03.
- New fitArenaWorld should be reused by T02/T03 rather than adding competing fit/resize code.

## Exact Image Prompt
```text
Use case: stylized-concept. Asset type: transparent gameplay PATH layer for a side-view panoramic forest game, 1536x1024 landscape 3:2. Reference image is STYLE AND MATERIAL REFERENCE ONLY: use its dusty rose-pink earthy walking routes, tiny tan pebbles, grass borders, flowers and storybook painterly forest detail. Generate ONLY a broad naturally illustrated horizontal forest dirt route on REAL TRANSPARENT BACKGROUND. No sky, no trees, no houses, no mountains, no waterfall, no characters, no text/UI. Route spans all the way from left canvas edge to right canvas edge, stays level horizontally, upper edge around y=65%, walkable pale muted dusty pink surface at y=68%-82%, lower irregular earth/grass edge at y=88%-92%. Entire y=0%-60% must be transparent. Upper and lower grass fringes have slight natural variation but path remains continuous and straight. A shallow visible earth edge, never a thick raised platform or rectangular brown slab. Subtle pale pink paving-like earth patches and scattered tiny stones echo the reference. Small low plants and flowers ONLY along the borders, leave the broad center unobstructed for a launcher and small enemies. Side-view stage with some visible ground surface, no isometric island perspective, no checkerboard painted into the image. Warm upper-left sunlight; game-illustration quality matched to the reference.
```
