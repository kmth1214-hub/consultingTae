# Snow Dedicated Layer Artwork — Acceptance and Provenance

- Date: 2026-10-21
- Task: Regional Layered World and Map Studio / P01 / T01
- Status: accepted for asset delivery; live scene integration remains T04
- Generator: built-in `image_gen.imagegen`, using the imagegen skill. No API key/CLI, raster postprocessing, programmatic background removal or source-map slicing.
- Final directory: `assets/maps/snow-layers/`. Eight native1536×1024 PNGs; total12212323 bytes (about11.65MiB), plus `layers.json`.
- Original snow map/Forest assets and all live src code remain unchanged. Generated outputs were copied from the built-in default generated_images directory; selected originals left intact. The workspace files are the project deliverables.

## Native registration and alpha acceptance
- Metadata version1, area snow, baselineRatio0.75. West x−600/east x1500, each worldwidth2700, native3:2 worldheight1800/top−450. Every candidate was generated at its native dimensions; none resized/upscaled.
- Browser inspection uses actual decoded RGBA: alpha<=8 counts transparent; alpha>=247 opaque. PNG channel type or black preview background is never taken as proof of transparency.
- Gates: distant>=99% opaque; midground>=35% transparent; path>=65% transparent and>=95% opaque on central96% of row768; foreground>=72% transparent and>=99% transparency in top80% rows. Every final image passes.

| File | Native size | Bytes | Transparent | Opaque | Row768 opaque | Top80% clear |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| distant-west.png | 1536×1024 | 2260376 | 0.00% | 100.00% | 100.00% | 0.00% |
| distant-east.png | 1536×1024 | 2347983 | 0.00% | 100.00% | 100.00% | 0.00% |
| midground-west.png | 1536×1024 | 1693135 | 76.77% | 21.15% | 0.00% | 70.95% |
| midground-east.png | 1536×1024 | 1808367 | 70.51% | 27.80% | 0.00% | 63.13% |
| path-west.png | 1536×1024 | 1124449 | 83.74% | 15.41% | 100.00% | 84.16% |
| path-east.png | 1536×1024 | 1133952 | 83.55% | 15.46% | 100.00% | 84.07% |
| foreground-west.png | 1536×1024 | 941260 | 91.72% | 6.50% | 0.00% | 100.00% |
| foreground-east.png | 1536×1024 | 902801 | 91.19% | 6.88% | 0.00% | 100.00% |

- Road diagnostics: path-west.png: full-width >=95%-opaque row range705..841, registration row768100% opaque; path-east.png: full-width >=95%-opaque row range705..843, registration row768100% opaque. Paint boundaries vary naturally by a few pixels; the shared contact row stays on continuous opaque snow. Native registration is not a claim of actual runtime collision testing in this art-only task.

## Visual observations and corrections
- Inspected all original references first. Forest's painterly blue-green distance, warm highlights and isolated near scenery were carried into sunny blue/ivory winter paint. The old isometric Snow map provided motifs only, not the final camera.
- West midground: sheltered snow chalet and conifers. East: distinct terraced ice cascade/cliffs and conifers, no duplicated chalet. Opaque distant west/east have coherent daylight and different mountains; only west has a sun/village. No baked theme text, UI or new freestanding candy-lane obstacles.
- Light/dark/checker isolated sheets confirm real alpha around trees, snow edges and leaves, with no painted checkerboard/matte. Soft painterly edge pixels are present; there is no full opaque haze layer.
- First path-west candidate was too tall/high despite passing baseline opacity. It was regenerated as a thinner/lower strip. Early east path variants did not match west's lip height; the selected east was derived from the accepted west with geometry locked and locally different frost/icicle details.
- First foregrounds passed the numeric alpha gate but a few taller edge plants were visibly cut by the fixed world1010 clip in the assembled preview. Both were regenerated as low bottom fringes. Final top80% transparency is100% and the hard clipped plant edge is removed. The numeric thresholds were not relaxed.
- Assembled proportional west/east panels with the planned alpha overlap and fixed mid/foreground clips; inspected overview, entrance, central join, far east and road near view. The snow surface now connects without a vertical step; ice/earth cross-section remains visible, large landmarks are distinct, and no poster boundary remains. Forest-style side-view depth reads coherently.
- The temporary assembly uses matching flat underpaint and no actors/camera/parallax. It is an asset review, not the completed game. T04 must still tune underpaint/overlap against the actual viewport/camera and verify reserved player x40..450/y720..940, props and preview. Do not report T04/T05 implemented from these captures.
- A temporary probe initially reused a gradient and mask id; those IDs were separated and captures rerendered before final inspection. This defect affected only the untracked probe, not the PNGs/game. Future runtime IDs must remain unique.
- Residual limits: finite1536×1024 paint can soften under very large close-up scaling; no invented4K detail. Region set is12.21MB before transport compression; actual runtime loading/performance belongs to T04/T06. No unrelated defect was identified.

## Reviewed evidence (untracked, not included in source commit)
- `tmp/region-art-snow-{distant,midground,path,foreground}-alpha.jpg`: west/east on light/dark/checker backgrounds.
- `tmp/region-art-snow-overview.jpg`:1800×600 proportional panorama.
- `tmp/region-art-snow-{west,join,east}.jpg`:1440×1008 near views.
- `tmp/region-art-snow-near-road.jpg`:1440×576 connection/cross-section.
- `tmp/region-art-snow-metrics.json`, `tmp/review-snow-art.cjs`: temporary browser evidence/probe, not project runtime.
- Rejected candidate copies remain in tmp or default generated_images only. Only eight final PNGs and native metadata are staged as assets.

## Validation performed
- `node scripts/verify-region-art.cjs snow`:8/8 final files pass in installed headless Chrome; browser closed in finally, no server used.
- `node scripts/verify-region-art.cjs invalid-area`: expected exit1/usage; no files touched.
- Negative probes:8/8 malformed manifest/unknown-area cases rejected (missing pair, duplicate pair, path traversal filename, small native size, wrong alpha mode, wrong baseline, wrong panel x, unknown area); fully opaque cutout and missing contact-row opacity also rejected (2/2).
- `npm.cmd run build`: passes; unchanged live game output. New images are intentionally not imported/emitted until T04.
- `git diff --check`: checked before commit; no gameplay browser suite claimed or required for this asset-only change.
- No existing4173/5173 service started/stopped; no combat/profile/input/RNG change.

## Selected final prompt set
The following are the actual prompts for selected outputs, including explicit alpha requests. All non-distant calls used transparent_background:true; distant used false. References were inspected before editing; files were saved non-destructively to the project after generation.

### distant-west.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-45d1465a-d1bd-41bf-ad1b-36575b984ae5.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `forest-layers/distant.png`, `snow_theme.png`.
```text
Use case: stylized-concept. Produce ONE final game asset: SNOW DISTANT WEST panel, native landscape 1536x1024 (3:2). Transform the supplied Forest distant layer's painterly illustrated style into the supplied snow region's palette/motifs. Image1 is style/composition reference only, image2 is snow theme reference only, NOT an overhead camera to copy. Orthographic side-on horizontal side-scrolling landscape, blue/ivory snowy mountain ridges, distant snow-covered pines and spacious bright pale-blue sky, soft warm daylight from upper left, playful premium hand-painted game artwork, rich painterly texture and atmospheric distance matching the forest reference. Horizon approximately 55% canvas height; lower portion has only distant soft snow ridges, no foreground ground strip. Opaque full-canvas sky/background. West identity: a broad rounded snowy ridge and a small distant sheltered village silhouette around left-middle, low contrast. Rightmost 22% must be low-detail snowy-pine continuation, with no major landmark, to overlap a distinct east panel later. No road, no foreground barrier, no ice block props, no characters, no monsters, no weapon, no UI, no text, no labels, no borders, no watermark, no isometric/top-down perspective. Keep source reference files unchanged; output a separate new PNG asset.
```

### distant-east.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-995b2cbb-3975-4a90-8610-fad9c8f0fa23.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/distant-west.png`, `snow_theme.png`.
```text
Use case: stylized-concept. Create ONE separate final game PNG asset: SNOW DISTANT EAST, native 1536x1024 landscape (3:2), opaque. Image1 supplied snow distant WEST is the accepted style/light/sky-color reference, NOT a layout to duplicate; image2 is snowy motif reference, never use its isometric view. Continue a wide horizontal orthographic side-view illustrated landscape in the same premium painterly forest-game style. Spacious pale blue sunny sky with ivory cloud wisps, distant blue snowy mountains and pine ridges, same horizon around 55% height and warm upper-left light. EAST identity: a distinct tall glacial mountain pass toward right-middle, softly layered ice-cliff ridges, no village, no duplicated western peaks, no sun disk (sun belongs to west). Leftmost22% is low-detail snowy-pine continuation compatible with the west panel's right edge, no landmark. Keep lower canvas distant snowy slopes only; no close road or foreground barrier. Preserve calm low-contrast distance yet crisp painted detail, no blur filter. No words, UI, labels, border, characters, monsters, weapons, logs/crate/ice-block props. Do not copy the source map board; output the independent distant layer only.
```

### midground-west.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-8eebe3a0-eaa5-4174-8242-752f36611813.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `forest-layers/midground.png`, `snow-layers/distant-west.png`.
```text
Use case: stylized-concept. Create ONE final separate SNOW MIDGROUND WEST layer PNG, 1536x1024 native landscape3:2, REAL TRANSPARENT BACKGROUND (RGBA), not an opaque scene. Image1 Forest midground is only the painterly style/depth-cutout reference; image2 snowy distant west is the palette/lighting reference. Orthographic side-on side-scrolling game scenery with warm upper-left winter daylight and detailed playful painted snow/blue ice. ONLY draw a small sheltered cookie chalet on a snow-capped rocky ridge left-of-center with a few snowy conifers, plus sparse low pines along the ridge continuing horizontally. Entire objects and their soft natural base end ABOVE y=700 on a1024-high canvas (upper68%); leave bottom324 pixels FULLY TRANSPARENT. No ground or road below. Keep upper sky and big central/right gaps genuinely transparent. The chalet ridge occupies x70..680,y320..680; some low distant pines x760..1150,y570..680; rightmost22% only very sparse short pines/transparent gaps, no landmark. Side-elevation view, no top-down/isometric floor. No continuous opaque backdrop, no sky, no white matte, no checkerboard painted into PNG, no ambient haze baked into empty areas. At least40% of all pixels transparent. No standalone ice-block/log/crate obstacles, no characters/monsters, no weapon, words, UI, labels or border. This must composite over a separate distant panorama, with independent alpha around every tree and roof. Output this new asset only.
```

### midground-east.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-3efc516d-5886-45d4-8fdc-b46358d5ac8d.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/midground-west.png`, `snow-layers/distant-east.png`.
```text
Use case: stylized-concept. Create ONE separate SNOW MIDGROUND EAST game layer, native1536x1024 landscape3:2, genuine RGBA TRANSPARENT surroundings. Reference1 accepted snowy MIDGROUND WEST supplies exact painterly style, scale and winter lighting; reference2 distant EAST supplies palette. EAST must be DIFFERENT scenery, not a copy or mirror of the cottage: a sweeping frozen cascade and sculpted blue ice-cliff ledges around right-middle x750..1300, with snowy pine trees and small snow-capped stone ridges. Leftmost22% only sparse low pine continuation matching the WEST right edge, no chalet or large structure. Orthographic side elevation for a horizontal game stage, never overhead/isometric board. All solid art ends by y=690 on1024-high canvas, transparent lower334px; cliff base is suspended background landscape and will be clipped behind a separate fixed gameplay lane. Sky and large gaps truly transparent. NO opaque haze, glow matte, sky, ground strip or fake checkerboard, at least45% transparent pixels. Crisp alpha around trees and frozen cascades with painterly shading on the objects themselves. Consistent warm upper-left sunlight, icy blue/ivory snow. No characters/monsters/weapons/words/labels/UI/borders, no freestanding ice-block/log/crate obstacles. Do not output a complete scene, only this isolated depth layer.
```

### path-west.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-143a1f70-2634-4cbd-be04-79edd56674f4.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/path-west.png candidate v1`.
```text
Precise-object-edit of the supplied SNOW PATH WEST game layer. Keep native1536x1024 canvas, transparent RGBA, horizontal snow/ice painterly materials and warm-left light. IMPORTANT REGISTRATION CORRECTION: the current road begins around y650 and is too tall. REMOVE all current artwork from y0 through y727; those rows must be FULLY TRANSPARENT. Redraw a MUCH NARROWER snowy road strip in the LOWER QUARTER: top edge y737, level opaque packed-snow walkable surface y742..795, snow lip y795..810, ice/earth cross-section y810..855. Canvas belowy875 empty transparent. At exact y768 snow surface must be fully opaque left-to-right. Small tufts may reach y728 but nothing higher. This is a technical texture registration edit; keep the strip thin (about120pixels tall), full width, flat horizontal, NO receding perspective, no cliff towering upward. Do not enlarge/recenter to fill canvas. Preserve the unpainted transparent negative space, no sky or background haze or fake checkerboard, no text/UI/characters/obstacles. Output only corrected layer, do not change canvas size or alpha intent.
```

### path-east.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-6c1f94e1-2aad-4aa7-8b55-797486cde206.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/path-west.png final`.
```text
Precise-object-edit. Derive a SNOW PATH EAST variation from THIS supplied accepted PATH WEST only. LOCK exact canvas1536x1024, alpha background, ALL road geometry and vertical placement: same back edge, same white walkable surface, same front lip and underside positions, same horizontal thickness left-to-right. Do NOT shift, resize, recenter or recompose the strip. Only locally vary small snow tuft shapes and a few underside icicle/grain textures, keeping warm-left ivory and blue materials. The surface contact row y768 remains white opaque snow across full width. The output must join the supplied west horizontally with no vertical step: align every surface boundary with the input's existing y positions. Both ends have same level and color; no major objects. Upper canvas remains empty alpha. No text, UI, sky, haze matte, painted checkerboard, characters or obstacles. Distinct painterly texture detail, not a copy/mirror, but identical registered road layout. Output only new EAST PNG.
```

### foreground-west.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-03a4cdd5-666f-46b4-b786-3feac0cd07ab.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/foreground-west.png candidate v1`.
```text
Edit this SNOW FOREGROUND WEST for technical registration, keep1536x1024 transparent RGBA canvas and matching brushwork. All current tall plants reaching up the sides must be removed. Replace the painted fringe with a VERY THIN LOW decorative fringe confined to the BOTTOM100 PIXELS ONLY: y924..1023. Tiny snowy grass and low evergreen leaves, maximum height90pixels, no tall tips. All pixels y0..900 MUST BE COMPLETELY TRANSPARENT, including left/right sides and any haze. This is intentionally 90% empty transparent canvas, don't enlarge or re-center. Preserve warm-left ivory/blue snow palette and painterly intricate material detail but scaled down as low ground cover. No solid ground slab, tree, large shrub, sky, road, character, text or checkerboard. Most important: no art above900 so fixed clipping at y831 cannot cut a leaf. Output only corrected transparent foreground-west.
```

### foreground-east.png
- Selected built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-e5e1be9b-bdee-48b0-9e6f-5f83a5d2bbc0.png` (copied into workspace; runtime must use workspace copy).
- References relative to assets/maps: `snow-layers/foreground-west.png final`.
```text
Edit the supplied low SNOW FOREGROUND WEST into a distinct matching EAST variant. Keep EXACT1536x1024 canvas, transparent alpha, identical low composition height. Change ONLY small leaf/snow-tuft arrangement and a few tiny ice glints, keeping style/scale/warm-left sunlight. Entire painted fringe confined to bottom140pixels, mostly y930..1023; ABSOLUTELY no tall side plant, no artwork/haze above y850. Upper80% (0..819) must be fully transparent. Do NOT grow larger shrubs or move the fringe up. Keep sparse low continuous snow-laden greenery, very small icicles, thin open silhouette; no road/ground slab/sky/trees/crystals/props/characters/text/checkerboard/matte. Preserve the huge empty transparent area. Output one EAST PNG, not a mirrored or exact duplicated west.
```

## Replaced candidate prompts / iteration history
These candidates were not staged. The selected prompts above refer to these initial designs where noted; this records the reproducible edit chain rather than concealing a rejected output.

### Replaced candidate: snow-path-west
```text
Use case: stylized-concept. Produce ONE final isolated SNOW PATH WEST PNG game layer, native1536x1024 landscape3:2, REAL TRANSPARENT BACKGROUND. Image1 is Forest path style/structural reference; image2 Snow midground palette. Change the dirt road into a horizontally continuous packed-snow path with frosted snowy grass edges and a painted exposed blue ice/earth cross-section. Technical registration is mandatory: on a1024-high canvas, ENTIRE strip is only y=728..860; absolutely all canvas above y=700 and below y=900 must be empty transparent. Opaque WALKABLE snow surface spans full width left-to-right around y=737..805; the EXACT row y=768 (75% height) is fully opaque everywhere across entire1536width. Surface is broad and visually flat/level, never a receding path; thin rim of soft snowy tufts at y728..745, underside cross-section y805..860 with small icicles. Keep both ends at identical surface height/color for joining, and last22% low-detail seamless snow texture without stones or landmarks. Soft blue shadows and sunny ivory highlights matching reference2; detailed charming painterly quality, not vector. No sky/mountains/houses/trees above road, no opaque surrounding matte/haze, no checkerboard painted into image. No standing ice blocks, rocks on the walking surface, logs/crates, characters, tracks, weapon, text/UI or border. The actual road occupies under20% canvas; transparent negative space is intentional for compositing. Do not center/crop/enlarge the strip to fill the canvas.
```

### Replaced candidate: snow-path-east
```text
Create ONE matching SNOW PATH EAST panel from the supplied accepted corrected path-west. Keep native1536x1024 canvas and REAL RGBA transparency. Same road width, surface height and blue/ivory snow/ice materials, painterly style and upper-left warm light; make the small frost/underside texture distinct, never mirror/repeat identical snow tufts. Preserve EXACT horizontal road registration: packed-snow walkable surface approximately y737..795; y768 must be completely opaque across the full width. Thin back rim/tufts may reach y714; opaque lip around y795..810; small exposed ice/earth cross-section ends near y860. Absolutely no snow/art above y700; all remaining canvas is genuinely transparent. Road full-width left-to-right and perfectly level, no perspective vanishing or raised hills. Both ends continue same surface color/height; first22% particularly low-detail snowy texture suitable to overlap west. Do not move/recenter/enlarge the strip or crop the big transparent upper space. No new rocks/obstacles/trees/characters/sky/text/UI/checkerboard/matte. Separate PATH layer only.
```

### Replaced candidate: snow-path-east-v2
```text
Precise technical registration edit. Image1 is snow PATH EAST to correct. Image2 is snow PATH WEST whose exact road height must be matched. Keep1536x1024 RGBA canvas and painterly snow/ice detail. East's road is about25px too high. SHIFT its entire road strip DOWN about25pixels (no canvas resize, no road thickness change); align the back snow rim and front snowy lip with image2 so both connect horizontally. Final packed white walkable surface must include y768 at its CENTER, not the dark ice face. Aim back rim around y720, white surface y730..790, front snow lip y790..810, ice underside y810..875. Keep top0..700 empty transparent and bottom after890 empty transparent. Retain EAST's distinct small frost pattern, do not paste a duplicate of west. Edge-to-edge perfectly level path, genuine alpha outside strip, no sky/text/UI/props/checkerboard/matte. Do not reframe or move canvas. Output corrected EAST only.
```

### Replaced candidate: snow-foreground-west
```text
Use case: stylized-concept. ONE final SNOW FOREGROUND WEST PNG, native1536x1024 landscape3:2, genuine transparent RGBA canvas. First supplied image is Forest painterly foliage style reference only, second is accepted snow palette. Technical placement: TOP 820 ROWS (80% of1024 height) MUST BE COMPLETELY TRANSPARENT, no side branches, no glow or haze there. Draw ONLY a sparse narrow foreground fringe at the VERY BOTTOM y850..1024: small snow-laden blue-green leaves, tiny bent evergreen sprigs and snowy grass tufts, a few hanging short icicles at the bottom edge. Height about100..170px, naturally uneven, delicate warm-left sunlit ivory snow and cool-blue shadows. Side-on horizontal stage, not overhead/isometric. Low open gaps along upper edge, no full solid white ground plane, no large crystals/tree trunks, no standing obstacles. Paint can reach canvas sides only in bottom15%. Lower snow-edge/foliage will be clipped below the interactive lane, so keep all detail confined to the bottom strip. At least80% of canvas truly alpha0. No painted checkerboard, black/white matte, background/sky/road/cottage/characters/monsters/UI/text/borders. Do not scale the artwork up or center the strip; large empty alpha space is essential.
```

### Replaced candidate: snow-foreground-east
```text
Create ONE SNOW FOREGROUND EAST layer PNG, native1536x1024 landscape3:2 with REAL TRANSPARENT BACKGROUND. Use supplied foreground-west ONLY as brushwork/palette/lighting reference, create a distinct arrangement, never mirror it. This foreground must remain a very low bottom fringe: NO artwork at all above y840 (top82% entirely alpha0). Draw only y860..1024: sparse icy-blue evergreen leaves, snowy bent grass, tiny low shrubs and a few small icicles, lit warm ivory from upper-left. Most foliage height under130px, low open gaps at upper boundary. EAST character can have slightly more tiny ice-covered sprigs at right-bottom, NOT large crystal props. Keep leftmost22% sparse low snow/foliage compatible with west's right-bottom continuation. Detailed premium hand-painted side-on game-stage texture, no oversized objects. No sky, full ground/road plane, tree trunks, side framing from top, monsters/characters/UI/text, painted checkerboard, matte or haze. At least82% of all pixels fully transparent and top80% at least99% transparent. Preserve empty canvas, don't center or enlarge the fringe.
```
