# Task: T03 Dedicated Chaos Layer Artwork

## Status: done

## Goal
Produce an independently painted side-view Chaos scene matching Forest's art quality, delivered as eight proportional PNG layers with real transparency and reviewed seams. Do not switch the live renderer during this asset task.

## Decision Summary
- New dedicated artwork is required by the confirmed regional-scene decision; cropped flat-map posters and geometry-only substitutes do not qualify. Original maps/Forest assets remain unchanged.
- Native3:2 west/east panels, four roles each; shared source baseline at75% height. Execution uses the imagegen skill/tool, not hand-painted geometric substitutes or programmatic background removal. No new dependency or combat change.
- Prerequisite: T01's reusable browser asset verifier exists; earlier regional assets must remain unchanged. This file contains the full art/metadata contract without requiring another Task to be read.

## Implementation

### I01. Reference inspection and dedicated painted panels
- Related Files:
  - `assets/maps/chaos_theme.png`; read-only regional reference
  - `assets/maps/forest-layers/{distant,midground,path,foreground}.png`; read-only style/depth references
  - `assets/maps/chaos-layers/{distant,midground,path,foreground}-{west,east}.png`; eight new files
  - `assets/maps/chaos-layers/layers.json`; new native metadata
  - `.memory/asset-reviews/2026-10-21-chaos-layers.md`; new provenance/visual review

#### Details
- **Signatures & Types / Data**:
```typescript
type LayerRole='distant'|'midground'|'path'|'foreground';
type Side='west'|'east';
type ArtEntry={layer:LayerRole;side:Side;file:string;width:number;height:number;
  alphaMode:'opaque'|'cutout'};
type LayerManifest={version:1;area:'chaos';baselineRatio:0.75;
  panels:{west:{x:-600;worldWidth:2700};east:{x:1500;worldWidth:2700}};
  assets:ArtEntry[]}; // exactly the eight role+side pairs; no URLs/credentials
```
- Each relative `file` is exactly `{layer}-{side}.png`. Width/height record decoded native positive integer dimensions; aim1536×1024, permit larger3:2 native output (ratio tolerance .01), never upscale a small generation and claim detail. Every entry is opaque for distant, cutout for other roles. No engine/profile/schema changes.
- **Precondition**: Read the installed imagegen SKILL.md and inspect all reference images with view_image before generating. Use the tool's referenced-image mechanism correctly, preserve transparency on edits, and copy final outputs into the eight exact paths. Do not overwrite originals or draw a flattened collage and label its rectangles independent layers.
- **Core Processing / Prompt contract**:
  1. Region direction: Violet twilight, distant floating silhouettes, and a coherent fantastical blend of forest, ice and cookie-city fragments. West has a wooded crystal ridge; east has a distinct fractured ice/oven skyline. Keep silhouettes behind the route so floating shapes cannot be mistaken for solid flight-lane props. The route is a horizontal cracked mosaic path with a visible earth/crystal section; foreground has sparse crystals, roots and debris below the lane.
  2. Every panel: playful high-detail hand-painted landscape matching the supplied Forest references, orthographic side-on game-stage view; no HUD, words, theme label, characters, monsters, weapons, freestanding logs/ice/crates or new gameplay obstacles. Consistent lighting and scale; no blur/fog baked over the interactive road.
  3. Native3:2 landscape canvas. The horizontal gameplay contact line is y=.75*imageHeight. World mapping later is width2700, height2700*H/W, top900−.75*worldHeight, west x−600/east x1500. Keep major landmarks outside the last22.23% of west/first22.23% of east, reserving this shared600-unit overlap for compatible low-detail continuation.
  4. Distant: full painted sky/mountains/skyline, low contrast, no near road/solid props; opaque background, generated with transparent_background:false. Produce west then generate a distinct complementary east using west plus original references for style. Preserve a compatible horizon across overlap; no identical large repeated buildings/peaks.
  5. Midground: trees/cliffs/buildings as isolated landscape clusters with genuine transparent sky and transparent lower lane; transparent_background:true. Keep bottom of landmarks above approximately y=.70H (runtime fixed clip ends world820). Give breathing room along the horizon; do not put a wall across the candy lane.
  6. Path: transparent canvas outside the road strip; a broad continuous level surface centered on .75H, with top edge near .719H, bottom surface edge near .781H and painted cross-section ending by .84H. At the contact row .75H the road is opaque across almost the full width. No perspective vanishing point, stairs, holes, slopes or solid-looking obstacles. Edge texture continues through west/east overlap.
  7. Foreground: transparent upper81% of canvas, sparse leafy/snowy/stone/crystal depth below .81H; do not bake a whole sky or ground backdrop into this layer. Runtime clips it below world1010 so no plant can cover the reserved player/weapon area x40..450/y720..940.
  8. Generate each role separately; use prior accepted panels as references for palette and registration. If native output is different but valid3:2 >=1536 wide, keep it and record actual dimensions. If composition, alpha or perspective is wrong, edit/regenerate with imagegen; do not squeeze/stretch, remove a fake checkerboard with code or use masks to disguise a flat map as separated artwork.
- **Error & State Transition**: Missing tool/output, failed decode, small/wrong-ratio image, opaque cutout, mislabeled layer, misaligned road or visible seam keeps Task unfinished. Keep an accepted prior output until its replacement passes review. No silent fallback/placeholder completion. Return validated asset files and metadata; live game stays unchanged.

### I02. Browser-decoded asset verification and real visual review
- Related Files:
  - `scripts/verify-region-art.cjs` :: CLI `verifyRegionArt(area)`; read-only reuse unless a reproduced validator defect requires correction
  - installed `@playwright/test` / Chrome; existing dependency, no new package
  - `.memory/asset-reviews/2026-10-21-chaos-layers.md`; record actual results
  - `tmp/region-art-chaos-*.jpg`; untracked temporary previews only

#### Details
- Use existing `node scripts/verify-region-art.cjs chaos`; it validates manifests, native dimensions/ratio, actual browser RGBA and road registration-row opacity without importing/mutating the game. Do not bypass a failed check by relaxing thresholds; correct the art or reproduce/fix a real validator defect.
- Alpha acceptance: distant >=99% pixels alpha>=247; midground >=35% pixels alpha<=8; path >=65% transparent plus >=95% opaque at row round(.75*H) over central96% width; foreground >=72% transparent plus >=99% transparency in top80% rows. A decoded checkerboard is not transparency. Report exact thresholds/results in the review.
- Render isolated cutouts on dark/light/checker backgrounds and assemble two panels with the native baseline mapping above, a matching thematic underpaint and soft overlap. A temporary probe in tmp may render canvas/HTML, but no preview/debug implementation is added to production here. Image editing remains imagegen-owned.
- Inspect at overview and100% near view: painted quality vs Forest, side perspective, consistent lighting, distinct landmarks, feathered edges without card frames, horizontal road alignment and visible cross-section. Verify foreground/player reservation and that each asset actually serves its own depth role.
- Review notes include tool used, generation/edit prompts, references, filenames, native dimensions, alpha metrics, accepted/rejected issue resolutions, overall byte total, screenshot paths and remaining limitations. Never include secrets or raw base64. Only accepted final PNGs/manifest/review and the verifier (T01) are staged.

## Acceptance Criteria
- [x] Eight dedicated painted Chaos layers and complete native metadata exist; originals unchanged.
- [x] Opaque/cutout roles, road registration and source proportions pass browser pixel validation.
- [x] Side-view style matches Forest; west/east have distinct compositions; overlap transition is recorded for T04 runtime feathering.
- [x] Real isolated/assembled images inspected and findings recorded; no live renderer or gameplay changed.

## Validation
- `node scripts/verify-region-art.cjs chaos` — all eight images decode and pass dimensions/alpha/road checks.
- `node scripts/verify-region-art.cjs all` — all24 new images pass.
- `npm.cmd run build` and `git diff --check` — unchanged live game still builds; only planned assets/docs/tool changed.
- Manual isolated/assembled comparisons at native/overview resolution — record real outcomes, not merely image presence. Execution may need Chrome sandbox escalation; do not label missing verification a pass.

## Commit Message
```text
feat(art): add dedicated chaos side-view scene layers

Plan: 2026-10-21-regional-layered-world-and-map-studio
Phase: P01-regional-scenes
Task: T03-chaos-layer-art

- Produce distinct proportional chaos panels with independent depth and transparency.
- Record native registration, asset checks and visual review.
```

## Progress
- [x] Implementation complete: eight native Chaos PNGs and layers.json; original images and live scene untouched.
- [x] Validation passed: Chaos8/8 and all areas24/24 browser-decoded checks, production build, diff check and visual review.
- commit: pending

## Next pointer
After the prescribed art/task commit and phase/plan/current synchronization, advance to `T04-shared-scene-depth.md`. Do not implement the runtime, studio, existing cookie task or Azure early.
