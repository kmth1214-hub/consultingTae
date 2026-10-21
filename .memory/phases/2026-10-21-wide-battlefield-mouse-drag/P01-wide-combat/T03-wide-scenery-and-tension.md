# Task: T03 Wide Scenery and Elastic Feedback

## Status: pending

## Goal
Make T02's functional wide battlefield read as a continuous illustrated region, with near/far depth, clearly solid obstacles and a visibly strong elastic pull in every direction. Finish visual quality without changing proven shot/collision rules.

## Decision Summary
- Prerequisites: T01 math and T02 full playable migration are done. World3600×1200, ground900, launcher(220,758,124,142), ordinary blockers and camera overview/aim/follow already work.
- Retain the polished wood/brass/leather weapon and existing regional art. Extend the actual landscape rather than enlarging/stressing a compact picture. No new physics, moving props, damage tuning, raster generation or package dependency.

## Implementation

### I01. Continuous regional backdrop and route
- Related Files:
  - `src/components/BattlefieldBackdrop.jsx` :: `BattlefieldBackdrop({area,layout})`; enrich T02 component
  - `src/components/ArenaScenery.jsx` :: exact solid-prop painting; modify
  - `src/game/assetCatalog.js` :: existing ASSETS references; read-only unless a named composition export is needed
  - `src/styles/arena.css`; modify
  - `assets/maps/forest-layers/{distant,midground,path,foreground}.png`, `assets/maps/{snow_theme,city_theme,chaos_theme}.png`; read-only assets

#### Details
- **Signatures & Types**: backdrop/scenery receive `layout:{width:3600,height:1200,groundY:900,obstacles:Obstacle[],...}` where `Obstacle={id,kind:'log'|'ice'|'crate',x,y,width:72,height:number,polygon:Array<{x,y}>}`. No new persistent fields. Each gradient/mask/clip id uses React `useId`; multiple regions/overlays cannot share an incorrect fragment URL.
- **Execution Flow / Logic**:
  1. Paint independent distant sky/mountains, midground landmarks, continuous route and near foliage layers at world coordinates. Use the same uniform camera transform as actors. Keep source-art pixels proportional with SVG image preserveAspectRatio/individual viewBoxes. Never apply object-fit:cover to one image across the entire3600×1200 world.
  2. Theme palette, initial values: Forest sky#95ded1/cream#e6ecc0, far#77a6ad, banks#478459, lane#d9a078/highlight#f2c49a; Snow sky#b6d8ed/#edf6ff, far#83a3ca, banks#b8dce5, lane#c3dce7/#f4fbff; City sky#d9c3bd/#f8d8af, far#867a91, banks#887776, lane#b69380/#dbb8a0; Chaos sky#c4b4df, far#8f8aaf, banks#7b7393, lane#b89baf/#dec3d4. Match edge blends to the reused art during visual QA; these are visual tuning values, not game rules.
  3. Sky extends to y−5000 and ground to y5000, including beyond world edges needed by camera framing. Layer low-contrast mountain/tree silhouettes across the full3600 width. Use varied deterministic shapes/spacing (no Math.random that would disturb combat fixtures or shimmer on render). Route is one broad connected band centered at900 with >=110 thickness; decorative bank curves may vary within the band without changing the flat physical ground plane.
  4. Forest: reuse transparent midground at its correct3:2 source ratio, e.g. image1200×800 at y100. Paint only its left half in a600×800 clip at worldx0, and only the original right half from another image at x2400 in a clip x3000..3600. This separates the cottage/forest and waterfall ends instead of repeating a full forest/cottage every screen. Add native SVG wooded banks/flowers through the middle. A distant1200×800 image may sit at x1200,y100 with soft horizontal **alpha** edge masks over the painted sky/mountains. Do not stretch the path PNG to make a new lane; use the continuous world route.
  5. Snow/City/Chaos: use uniformly scaled landmark panels from the existing764×508 source maps. Crop original top60px to omit the baked-in “테마” label. Display original-content viewBox `0 60 764 448`, panel width<=1000 with proportional height; put panels near the entrance and far end, above the route (clip/mask to y<=820). Feather panel edges through alpha gradients into themed native SVG continuation; no blur filter, rectangular photo seams or identical repeated landmarks. Add snow banks/ice pillars, city silhouettes/bridges, or mixed Chaos forms in the gaps. Source art remains unchanged; use existing imports.
  6. Foreground decoration stays mostly below y980 or at world edges. It cannot cover the launcher/pouch, solid obstacle tops or early trajectory. Preserve layer ordering: distant0, midground1, route2, scenery/solids3, light foreground5, player path6, monsters7, launcher8, attack effects9; HUD/viewport notice10+ as appropriate. Scenery is pointer-events:none; HUD is pointer-events:auto.
  7. Solid props paint the **same base polygon** registered by layout (log72 high, ice84, crate80; width72). Add facets, grain, rims, snow highlights and shadows within that silhouette/clip, with no invisible AABB corners or solid-looking extensions outside the collider. Keep `data-obstacle-id` on its group. Ground rocks/flowers are clearly small nonsolid decoration away from the playable lane. Do not add extra unregistered logs/crates.
  8. Do not add parallax/camera transforms to solids/path independent of the canonical world. Painting adjustments must not move enemy/obstacle geometry, relayout dead slots or change the normal/Wind trajectory.
- **Precondition / error handling / return**: require T02's valid layout and existing asset catalog; missing optional landmark art falls back to the native themed backdrop without hiding gameplay, but failed built assets still fail browser validation and must be repaired before completion. Return decorative React/SVG nodes only; no run/shot mutation. Keep ids unique across StrictMode remounts and region changes.

### I02. Strong two-axis elastic draw and release
- Related Files:
  - `src/components/Slingshot.jsx` :: pull, frame curvature, localized charge and release; modify
  - `src/components/ProjectileFlight.jsx` :: existing candy/trail appearance; modify only visuals
  - `src/components/BattleArena.jsx` :: cosmetic lastImpact/release snapshot; modify only visuals
  - `src/components/EnemyResponse.jsx` :: maintain readable response cues under the wider camera; modify only visuals if needed
  - `src/styles/arena.css`; modify

#### Details
```typescript
type PullVisual={direction:{x:number;y:number};powerRatio:number;launchId:number|null;
  phase:'idle'|'dragging'|'launching'};
type CosmeticImpact={id:number;kind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout';
  point:{x:number;y:number};obstacleId:string|null};
```
- All actual pouch/anchor coordinates still come from `getDragDraw`: `(64,54)-direction*(12+60*ratio)` while active, resting otherwise. This produces full-angle pulls including reverse and almost doubles old maximum stretch. Do not add a second scale or rotate the whole SVG without moving the band anchors with it.
- Keep endpoints attached to their brass caps. Wood may visually bow through internal control points under tension while endpoints/base stay fixed; central rune follows that small visual bend. Leather pouch follows the canonical point. Keep material gradients/stitching; use brighter taut highlights and modest charge sparks proportional to ratio. Exact angle/power values and ARIA numeric values stay hidden; qualitative weak/medium/strong labels remain.
- **Clear reverse envelope**: full reverse pull reaches localx136 and pouch radius14. Move the qualitative vertical meter to localx>=174 (e.g. left140% of124px) so it cannot overlap the pulled pouch. Keep it immediately to the right of the weapon's full pull envelope and inside aim framing. Do not use the oldleft108% position unchecked.
- Release feedback starts from the frozen drawn pouch, not a newly reset point. A local recoil interpolates bands/pouch to rest in150–220ms with a brief spring overshoot, ring/rays at release origin and the existing body recoil. Any local RAF is presentation-only, keyed by launchId and canceled on cancel/unmount/new release. It cannot alter shot data/call the engine. Loaded candy is hidden throughout actual flight and returns at reload; do not draw a second ball in the launcher.
- Keep the short trail on the already-flown path via `sampleAtDistance`. Normal candy stays warm/golden, Fireball uses orange, and Wind can use a distinct mint wake while its orb retains current item color. No future full trajectory/landing marker appears.
- An obstacle-first impact creates local dust/spark/ice glint at exact solution contact for~420ms with the obstacle id; the prop stays intact. No rolling/falling/HP/score event is introduced. The engine status is the source of truth for block vs hit. Extra enemy spillover still uses existing hit bursts at their actors, not extra engine calls.
- Enemy damage/block rules do not gain terrain collision in this feature. Keep incoming attack arcs and melee readability; do not visually imply a prop grants protection while the unchanged engine still applies damage. A melee body may leap/occlude over a prop for presentation, with the original response id/timing and no physics alteration.
- Reduced motion: static readable glow/tension plus short impact indication; no animated camera, drifting particles, expanding rings, body shake or spinning candy. Keep underlying shot/input/collision identical.
- **Lifecycle error handling**: missing/invalid cosmetic point suppresses that effect, not the authoritative shot. Cancel local recoil/particle frames on remount/cancel/new release; state is presentation-only and cannot affect whether the engine accepts an action.
- Narrow/short aim HUD may retain the existing compact table (hide use buttons during drag; preserve keys/icons/counts and semantic names). Check it does not obscure the enlarged fork/pouch. All HUD stays viewport-bound and named/reachable on idle; no fake implementation/debug controls are added.
- World health labels must remain readable during follow/enemy framing: use the camera's `--camera-scale` to compensate text size, while keeping sprites/physics uniformly scaled. In the full overview, suppress crowded individual health boxes and retain enemy silhouettes/target/boss cues plus the named enemy accessible labels; do not turn 13 tiny enemies into overlapping full-size labels. The header's actual player HP and viewport warning are always readable.

### I03. Visual acceptance with gameplay guards
- Related Files: existing `tests/e2e/{slingshot,accessibility,enemy-response}.spec.cjs`; reuse, adding only meaningful overlap/lifecycle checks if a visual fix creates a functional risk.
- Capture each region at overview, weak/strong/vertical/reverse draw, normal flight, Wind bypass, obstacle impact and enemy shield/hit; inspect the entrance/middle/far end while following, not only a zoomed screenshot of the weapon.
- Sizes:2007×1037,2560×1080,1440×900,844×390,390×844; include reduced-motion. Check continuous art edges, undistorted proportions, ground under feet, visible blocker boundaries, connected bands, no meter collision, early preview exposure and readable warning/status.
- Tension/art changes are reversible visual work: don't add unit tests that merely count SVG paths or mirror class construction. If a real overlap/cancel defect appears, add a DOM/input regression at that seam.

## Acceptance Criteria
- [ ] All four regions read as one wide illustrated world, not a stretched/repeated compact backdrop with visible seams or labels.
- [ ] Props look solid exactly where their registered polygons block; no extra unregistered barriers.
- [ ] Full-angle strong and reverse pulls visibly stretch connected bands, and the meter stays outside the pouch envelope.
- [ ] Release/impact/Wind/Fireball effects are clear and reduced-motion remains calm/readable.
- [ ] No shot math, damage, item, camera or progression regression.

## Validation
- `npm.cmd test` — world, collision, camera and existing combat/session tests stay green.
- `npm.cmd run test:e2e -- slingshot.spec.cjs accessibility.spec.cjs enemy-response.spec.cjs` — actual input/camera/feedback regressions pass.
- `npm.cmd run build` and `git diff --check` — pass.
- Manually inspect and record untracked captures `tmp/wide-t03-{area}-{state}-{width}.jpg`; temporary visual probes, if needed, stay in tmp. No screenshot/artifacts are staged as source.

## Commit Message
```text
feat(game): extend regional scenery and strengthen slingshot tension

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T03-wide-scenery-and-tension

- Compose continuous proportional region art around the wide collision model.
- Make full-angle pull, release and obstacle impacts readable without changing combat.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After commit/state sync, advance to `T04-wide-gameplay-regression.md` for complete gameplay and visual review.
