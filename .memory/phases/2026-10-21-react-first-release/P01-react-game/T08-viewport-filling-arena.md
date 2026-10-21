# T08 Viewport-filling Arena

## Status
done

## Decisions
- User's desktop screenshot shows large beige side gutters; fill the window's available battle area.
- Remove the height-derived width cap and 1500px max width. Use a viewport-height grid for header, expanding arena, instructions and status. Keep small outer gutters.
- Preserve the existing 1200×800 game coordinate space and 3:2 art ratio. A full-width, bottom-anchored 3:2 world sits inside the wider clipped arena; excess sky/foreground is cropped rather than stretching art or SVGs. All layers, actors and trajectory share that same world.
- Portrait layouts retain a natural 3:2 arena to keep both distant sides playable; don't stretch tall phones or crop an enemy off the side. Short landscape screens may compact HUD typography/spacing if necessary.
- Keep aim, camera, collisions, enemy response, numeric hiding and balance unchanged. Fullscreen uses the same expanded layout. No deployment work.

## Targets / model
- `src/styles/arena.css`: battle-screen grid, full-width header/arena/footer, uniform-ratio arena-world and portrait/fullscreen/short-screen rules.
- `src/components/{BattleArena,EnemyResponse}.jsx`: keep enemy warning text in viewport coordinates outside the cropped world, while attack SVGs remain world-aligned. Required so ultra-wide cropping never hides the warning.
- `tests/e2e/accessibility.spec.cjs` (or focused arena spec using existing support): verify wide bounds, no viewport overflow, aligned art/SVG, visible launcher/enemies, real shot/hit and resize/fullscreen recovery.
- No engine/session/schema changes. Existing inverse screen-matrix hit sampling and world bounding-box input mapping must stay valid.

## Validation
```powershell
npm.cmd run test:e2e -- accessibility.spec.cjs slingshot.spec.cjs
npm.cmd run test:e2e -- enemy-response.spec.cjs
npm.cmd run build
git diff --check
```
Inspect 2007×1037 (user's screenshot size), 1920×1080 or wider, 1440×900, narrow portrait and short landscape. Assert wide arena fills at least viewport width minus small outer padding; launcher/enemies remain on screen; real fire still hits correctly under zoom.

## Commit
```text
feat(game): fill the viewport with the battle arena

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T08-viewport-filling-arena

Use the available window width and height while keeping art and combat in one proportional world.
Verify wide-screen aiming, hit alignment, HUD reachability and fullscreen behavior.
```

## Next
Commit after validation, synchronize P01/current and return to P02-T01 without starting Azure work.

## Completion and learning notes
- `arena.css` replaces the height-derived width cap with `grid-template-rows: auto minmax(0, 1fr) auto auto` and a full-width arena. At the user's 2007×1037 viewport, the arena is 1983×899 with 12px side gutters; header and footer remain visible without scrolling. Fullscreen uses the same layout.
- `.arena-world` stays 3:2, spans the arena width and anchors to its bottom. The wider viewport crops surplus sky instead of stretching the art, actors or SVG. The existing zoom transform and inverse screen-matrix collision/input mapping remain unchanged. Portrait/square layouts at aspect ratios <=4:3 retain natural 3:2 height so both distant sides remain visible.
- `BattleArena.jsx` renders `EnemyResponseNotice` outside the cropped/zoomed world. Attack SVGs remain inside the world. This prevents warning text disappearing above ultra-wide screens. The short-landscape HUD is a compact 2×2 key/item table with reduced header/footer spacing; the same inventory actions and labels remain available.
- Added three behavioral browser regressions: 2007×1037 and 2560×1080 width/height coverage, layer/SVG proportions, no overflow, visible actors, on-screen enemy notice and real hit; and 844×390 HUD reachability, launcher separation and real hit. Existing desktop/portrait, fullscreen, reduced-motion and input tests were reused.
- Validation across the affected suites: 31 distinct browser cases pass (12 slingshot, 8 accessibility/layout, 11 enemy-response). Initial slingshot/accessibility build passed 19/19. After moving the enemy notice, accessibility/enemy-response passed 18 cases with one short-height overlap failure; reducing only the short-screen table's padding/gaps made that case pass on a fresh build (1/1). All new wide notice/real-hit cases passed. Standalone production build and diff checks pass. No engine/session/physics changes required Node-test reruns.
- Inspected `tmp/react-t08-layout-{2007,1440,844,390}.jpg`, wide test captures and final `tmp/react-t08-short-landscape.jpg` (untracked). Dev URL returns HTTP 200 at `http://127.0.0.1:5173/`. Temporary visual probe is isolated under `tmp/`; no debug mode shipped.
- Important: keep world layers and all actor/trajectory SVGs in the same proportional world; applying independent `object-fit` or SVG stretching would break alignment. HUD and notices use viewport coordinates. Full-width art uses existing source assets, so their original resolution still limits large-screen detail. Portrait intentionally keeps a natural-height map rather than cropping enemies out horizontally.
- Adjacent fixes required by the new layout: move enemy warning into viewport space, brighten fullscreen instructions, and prevent low-height inventory overlap. Other out-of-scope findings: none. Combat balance, weapon polish, legacy HTML and Azure are unchanged.
