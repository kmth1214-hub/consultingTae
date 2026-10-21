# Task: T01 Dedicated Snow Layer Artwork

## Status: pending

## Goal
Produce an independently painted side-view Snow scene matching Forest's art quality, delivered as eight proportional PNG layers with real transparency and reviewed seams. Do not switch the live renderer during this asset task.

## Decision Summary
- New dedicated artwork is required by the confirmed regional-scene decision; cropped flat-map posters and geometry-only substitutes do not qualify. Original maps/Forest assets remain unchanged.
- Native3:2 west/east panels, four roles each; shared source baseline at75% height. Execution uses the imagegen skill/tool, not hand-painted geometric substitutes or programmatic background removal. No new dependency or combat change.
- First task of the inserted visual plan; old Wide Combat T04/T05 are queued and untouched.

## Implementation

### I01. Reference inspection and dedicated painted panels
- Related Files:
  - `assets/maps/snow_theme.png`; read-only regional reference
  - `assets/maps/forest-layers/{distant,midground,path,foreground}.png`; read-only style/depth references
  - `assets/maps/snow-layers/{distant,midground,path,foreground}-{west,east}.png`; eight new files
  - `assets/maps/snow-layers/layers.json`; new native metadata
  - `.memory/asset-reviews/2026-10-21-snow-layers.md`; new provenance/visual review

#### Details
- **Signatures & Types / Data**:
```typescript
type LayerRole='distant'|'midground'|'path'|'foreground';
type Side='west'|'east';
type ArtEntry={layer:LayerRole;side:Side;file:string;width:number;height:number;
  alphaMode:'opaque'|'cutout'};
type LayerManifest={version:1;area:'snow';baselineRatio:0.75;
  panels:{west:{x:-600;worldWidth:2700};east:{x:1500;worldWidth:2700}};
  assets:ArtEntry[]}; // exactly the eight role+side pairs; no URLs/credentials
```
- Each relative `file` is exactly `{layer}-{side}.png`. Width/height record decoded native positive integer dimensions; aim1536×1024, permit larger3:2 native output (ratio tolerance .01), never upscale a small generation and claim detail. Every entry is opaque for distant, cutout for other roles. No engine/profile/schema changes.
- **Precondition**: Read the installed imagegen SKILL.md and inspect all reference images with view_image before generating. Use the tool's referenced-image mechanism correctly, preserve transparency on edits, and copy final outputs into the eight exact paths. Do not overwrite originals or draw a flattened collage and label its rectangles independent layers.
- **Core Processing / Prompt contract**:
  1. Region direction: Cool blue/ivory snow mountains, distant snowy pines, ice cliffs, small playful cookie chalets and frozen cascades. West has a sheltered chalet ridge; east has a distinct ice-cliff pass. Keep sunny readable snow rather than a monochrome white wash. The path is packed snow with a frosted edge and a visible ice/earth cross-section; foreground is sparse snow-covered brush and icicles.
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
  - `scripts/verify-region-art.cjs` :: CLI `verifyRegionArt(area)`; new
  - installed `@playwright/test` / Chrome; existing dependency, no new package
  - `.memory/asset-reviews/2026-10-21-snow-layers.md`; record actual results
  - `tmp/region-art-snow-*.jpg`; untracked temporary previews only

#### Details
- Create a CommonJS CLI runnable as `node scripts/verify-region-art.cjs snow` (also accepts city/chaos/all). Require filesystem/path plus installed Playwright chromium, launch installed Chrome headlessly, use an in-memory page/canvas, and close browser in finally. It must not start/stop4173/5173, require a server or import the game.
- Resolve only the known area directories below assets/maps; reject unknown args and path traversal. Parse version1 manifest, validate eight unique exact role+side/file pairs, actual integer native dimensions and3:2 ratio. Read each PNG, verify signature, encode as data URL, decode with browser Image.decode(), and inspect canvas RGBA. Do not infer real transparency solely from PNG color type.
- Return exit0 only after every requested area's checks succeed; nonzero with file-specific diagnostics on metadata/decode/alpha failure. Print actual dimensions, bytes, transparency coverage and road registration-row opacity. For all, require all three finished manifests (do not count absent regions as success). No raster mutation in this tool.
- Alpha acceptance: distant >=99% pixels alpha>=247; midground >=35% pixels alpha<=8; path >=65% transparent plus >=95% opaque at row round(.75*H) over central96% width; foreground >=72% transparent plus >=99% transparency in top80% rows. A decoded checkerboard is not transparency. Report exact thresholds/results in the review.
- Render isolated cutouts on dark/light/checker backgrounds and assemble two panels with the native baseline mapping above, a matching thematic underpaint and soft overlap. A temporary probe in tmp may render canvas/HTML, but no preview/debug implementation is added to production here. Image editing remains imagegen-owned.
- Inspect at overview and100% near view: painted quality vs Forest, side perspective, consistent lighting, distinct landmarks, feathered edges without card frames, horizontal road alignment and visible cross-section. Verify foreground/player reservation and that each asset actually serves its own depth role.
- Review notes include tool used, generation/edit prompts, references, filenames, native dimensions, alpha metrics, accepted/rejected issue resolutions, overall byte total, screenshot paths and remaining limitations. Never include secrets or raw base64. Only accepted final PNGs/manifest/review and the verifier (T01) are staged.

## Acceptance Criteria
- [ ] Eight dedicated painted Snow layers and complete native metadata exist; originals unchanged.
- [ ] Opaque/cutout roles, road registration and source proportions pass browser pixel validation.
- [ ] Side-view style matches Forest; west/east have coherent edges without duplicated major landmarks.
- [ ] Real isolated/assembled images inspected and findings recorded; no live renderer or gameplay changed.

## Validation
- `node scripts/verify-region-art.cjs snow` — all eight images decode and pass dimensions/alpha/road checks.
- `node scripts/verify-region-art.cjs invalid-area` — expected nonzero with clear usage, no file mutation.
- `npm.cmd run build` and `git diff --check` — unchanged live game still builds; only planned assets/docs/tool changed.
- Manual isolated/assembled comparisons at native/overview resolution — record real outcomes, not merely image presence. Execution may need Chrome sandbox escalation; do not label missing verification a pass.

## Commit Message
```text
feat(art): add dedicated snow side-view scene layers

Plan: 2026-10-21-regional-layered-world-and-map-studio
Phase: P01-regional-scenes
Task: T01-snow-layer-art

- Produce distinct proportional snow panels with independent depth and transparency.
- Record native registration, asset checks and visual review.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After the prescribed art/task commit and phase/plan/current synchronization, advance to `T02-city-layer-art.md`. Do not implement the runtime, studio, existing cookie task or Azure early.
