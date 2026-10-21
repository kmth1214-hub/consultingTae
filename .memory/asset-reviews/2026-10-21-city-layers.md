# City Dedicated Layer Artwork — Acceptance and Provenance

- Date: 2026-10-21
- Task: Regional Layered World and Map Studio / P01 / T02
- Status: accepted for asset delivery; live integration remains T04
- Generator: built-in `image_gen.imagegen` through imagegen skill, with local references inspected first. No API/CLI image service, new dependency, raster postprocessing, programmatic background extraction or flat-map slicing.
- Final directory: `assets/maps/city-layers/`. Eight native1536×1024 PNGs, total12547815 bytes (about11.97MiB), plus version1 `layers.json`.
- Original City/Forest maps, accepted Snow assets, verifier and all live src files remain unchanged. Runtime must use project copies, not generated_images paths. The studio/admin route is not implemented by this asset task.

## Native registration and actual pixel gates
- Metadata area city, version1, baselineRatio0.75. West x−600/east x1500, each worldwidth2700, native3:2 worldheight1800/top−450, shared contact source row768. No resizing/upscaling.
- Reused scripts/verify-region-art.cjs unchanged. It decodes real RGBA in installed Chrome: alpha<=8 transparent, alpha>=247 opaque, not merely PNG channel metadata.
- Required: distant>=99% opaque; midground>=35% transparent; path>=65% transparent and>=95% opaque across central96% of row768; foreground>=72% transparent and>=99% clear in top80% rows. All final files pass without threshold changes.

| File | Native size | Bytes | Transparent | Opaque | Row768 opaque | Top80% clear |
| :--- | :--- | ---: | ---: | ---: | ---: | ---: |
| distant-west.png | 1536×1024 | 2129785 | 0.00% | 100.00% | 100.00% | 0.00% |
| distant-east.png | 1536×1024 | 2210606 | 0.00% | 100.00% | 100.00% | 0.00% |
| midground-west.png | 1536×1024 | 1847020 | 72.40% | 25.36% | 4.14% | 65.49% |
| midground-east.png | 1536×1024 | 2142008 | 65.57% | 31.35% | 59.02% | 56.96% |
| path-west.png | 1536×1024 | 1102749 | 84.38% | 14.96% | 100.00% | 87.19% |
| path-east.png | 1536×1024 | 1100297 | 84.20% | 15.12% | 100.00% | 87.09% |
| foreground-west.png | 1536×1024 | 1006837 | 90.54% | 7.46% | 0.00% | 100.00% |
| foreground-east.png | 1536×1024 | 1008513 | 90.76% | 7.46% | 0.00% | 100.00% |

- Final path opaque bounds: west top716/bottom871; east top715/bottom872. Full-width >=95%-opaque bands718..869/718..870 align within one pixel. Row768 is on the flat paving top and100% opaque in both, not the masonry face.
- Both foreground top80% are100% transparent. Some decorative midground foundations extend below the target700px: runtime's planned fixed world820 clip and painted road cover those lower foundations. The assembled review used that exact contract; no live renderer/physics was changed to accommodate art.

## Visual inspection and corrections
- Forest references establish a detailed playful painted style, warm highlights and isolated near scenery; original City supplies lavender roofs, golden windows, arched bridges and stone motifs only. The original overhead board perspective is not retained.
- Distant west/east share lavender-to-peach dusk light, layered hills/roofs and distinct skyline arrangements. Only west carries the sun; east features distant oven chimneys. Upper sky remains spacious; no labels, HUD, frame or characters.
- Midground west is a small bakery entrance; east a distinct tall oven workshop/stone bridge. Transparent sky/gaps permit real depth. Garden stone/rail details are background scenery, not extra solid flight-lane obstacles.
- Initial road candidates put row768 on the vertical front face instead of the walkable top despite an opacity pass. Pure text-position edits retained the wrong location. Generated a temporary SVG registration diagram, then used that guide plus City building material as references for imagegen; no final bitmap was translated/resized with code. Selected west-v4 and east keep the same registered top/curb/short masonry face and differ in local paving/inlay/ivy details. Guide text/green line are absent from the final asset.
- Light/dark/checker isolated sheets show real alpha around roofs/flowers/stone and no fake checkerboard/matte. Foreground planter/short railing fringe is low, preserving the future actor/weapon space above world1010; no tall new obstacle.
- Registered1800×600 panorama and1440 near west/join/east/road views were inspected using proportional panel mapping, alpha overlap and fixed midground/foreground clips. Flat level road joins without a step and cross-section remains visible; bakery/oven identities do not repeat. No hard poster boundary or overhead-map panel remains.
- Fine stone/flower details in the overlap show the expected soft blend; T04 still must tune blend/underpaint and atmospheric contrast in actual moving camera views. This temporary static review is not a gameplay acceptance or final viewport/performance claim.
- Limits: finite native1536×1024 art can soften in large close-ups; no claimed4K detail. City set is12.55MB before transport compression. Actual loading/runtime memory review belongs to T04/T06; assets are intentionally not imported into the live game in T02.
- Adjacent code findings: none. No unrelated project changes.

## Evidence and validation
- `node scripts/verify-region-art.cjs city`:8/8 final PNGs pass in actual headless Chrome.
- `node scripts/verify-region-art.cjs snow`:8/8 previously accepted PNGs still pass unchanged.
- `npm.cmd run build`: passes with unchanged live game bundle. New City/Snow layers intentionally await T04 imports.
- `git diff --check` / staged check: checked before commit. No gameplay browser suite was needed/run or claimed for this art-only task.
- Temporary `tmp/review-city-art.cjs` renders review UI only, no final raster edits or game calls. Generated `tmp/region-art-city-{distant,midground,path,foreground}-alpha.jpg`, `{overview,west,join,east,near-road}.jpg` and metrics.json were inspected; all remain untracked.
- Temporary `tmp/region-art-city-road-registration-guide.png` is a simple SVG diagram for generation positioning only, never a game asset. Replaced path candidates stay in tmp/default generated_images and are not staged.
- No4173/5173 service was started/stopped. Chrome probes needed no server and closed browsers in finally. No game/profile/input/RNG/obstacle geometry change.

## Selected final prompt set
The following are actual built-in prompts and references for the eight selected native outputs. Where a local candidate was replaced, its earlier prompt appears below; original source files were never overwritten.

### distant-west
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-2d22f5bc-717c-4d39-8724-b56b5231b294.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/forest-layers/distant.png`, `C:/vibe/consultingTae/assets/maps/city_theme.png`.
- transparent_background: false
```text
Use case: stylized-concept. Create ONE new CITY DISTANT WEST game layer PNG, native1536x1024 landscape3:2, opaque full canvas. Image1 Forest distant is the premium playful painterly style/atmospheric-depth reference. Image2 City is the region's lavender roofs, golden lights, bridges and cookie-town motifs ONLY; replace its overhead/isometric camera with a SIDE-ON horizontal game-stage landscape. Warm dusk sky fading from muted lavender overhead to peach/ivory near horizon; softly layered distant hills and low ornate cookie-town rooftops, arched bridges and tiny glowing golden windows, painted depth matching Forest. Horizon around55% image height; broad open sky, low-contrast skyline in lower half. WEST identity: a sheltered low bakery district and small bridge left-of-center, no giant oven or tower. Keep rightmost22% a simple low ridge/rooftop continuation with no distinct landmark for overlap. Same warm upper-left light across scene. No close road, foreground wall, freestanding obstacles, characters, monsters, weapons, HUD, text, labels, logo, border or watermark. Painted side elevation, not isometric board, not geometric vector placeholder. Output a separate independent distant panorama, leave references unchanged.
```

### distant-east
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-a5dc9db2-7abb-429c-9027-132be5035af5.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/city-layers/distant-west.png`.
- transparent_background: false
```text
Create ONE CITY DISTANT EAST PNG, native1536x1024 landscape3:2, opaque. Supplied accepted CITY DISTANT WEST is the exact painterly-style, lavender/peach dusk sky, golden-window light and horizon reference. Make a DIFFERENT complementary skyline, not a copy or mirror. Side-on horizontal game-stage landscape, no overhead/isometric board. EAST identity is a distant tall ornate oven district at x850..1250, with slim chimneys/towers and softly layered cookie-town rooftops and small arched bridges. Keep major oven towers distant low-contrast, below mid-height; foreground will be a separate layer. Leftmost22% is simple low rooftops/greenery and sky consistent with west's right edge, no giant tower there. Same soft warm upper-left illumination and skyline height around55% down; no second sun disk. Spacious upper sky, distant hills and subdued warm architecture lower half. No close road, front wall/obstacles, characters, monsters, weapon, UI/words/theme labels/borders/watermark. Output the independent distant EAST asset only.
```

### midground-west
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-564edaab-06fc-4bd3-a067-9e1974ec485d.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/forest-layers/midground.png`, `C:/vibe/consultingTae/assets/maps/city-layers/distant-west.png`.
- transparent_background: true
```text
Create ONE CITY MIDGROUND WEST independent PNG game layer, native1536x1024 landscape3:2, genuine TRANSPARENT RGBA background. Image1 Forest midground is the premium painterly style and isolated depth-object reference, image2 City distant-west supplies warm dusk palette. Transform tree/cottage scenery into a side-elevation cookie-town bakery entrance: small ornate bakery with lavender tiled roof, rounded golden window frames, tiny unlettered awning, low masonry terrace and a few clipped green shrubs. Put the main bakery around x430..880,y240..650 so it is visible after the world panel's left overscan; stone base finishes at y690. A few low rooftop/planter silhouettes can continue to the right, but last22% only low sparse greenery/stone continuation, no building landmark. All art must end ABOVEy710; lower314pixels fully transparent, upper sky and large gaps fully transparent too. Orthographic side-on elevation for horizontal combat, NOT overhead/isometric streets, no ground plane or road. Warm upper-left peach light and golden windows, detailed playful painterly surface texture matching Forest. No text on the bakery/signs, no labels/UI/characters/monsters/weapons/crates/logs/ice-block obstacles. No sky, opaque glow/haze/matte or fake checkerboard in empty areas. At least45% of canvas alpha0. Output only the isolated midground layer, not a full scene.
```

### midground-east
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-2d142998-a693-445c-97a6-ba56b2ece4f3.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/city-layers/midground-west.png`, `C:/vibe/consultingTae/assets/maps/city-layers/distant-east.png`.
- transparent_background: true
```text
Create ONE CITY MIDGROUND EAST independent PNG, native1536x1024 landscape3:2, REAL transparent RGBA. Reference1 city-midground-west supplies exact painterly cookie-town style, gold/lavender materials and upper-left dusk light; reference2 distant-east gives palette. Make distinctly DIFFERENT east scenery: an ornate tall oven workshop with slim chimney stacks and glowing amber round oven windows, lavender roofs, an adjoining small arched stone bridge/low garden terrace, main workshop x800..1280. Not a duplicated bakery/copy/mirror. Side-elevation scene for horizontal stage, never top-down/isometric streets. Leftmost22% only sparse low greenery and small stone garden edge compatible with west-right, no tall landmark. All foundations and greenery END by y700 on1024-high canvas, entirely transparent belowy720; sky and gaps truly transparent, at least45% transparent overall. No foreground road, receding floor, heavy opaque fog/glow/matte/checkerboard. No text/sign lettering, characters, monsters, weapons, freestanding crates/logs/ice props or UI. Rich hand-painted detail matching Forest quality. Isolated midground objects only, not an opaque panorama.
```

### path-west-v4
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-cf71ffa8-9eb0-4667-9fc0-a2f8d69ee7b9.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/tmp/region-art-city-road-registration-guide.png`, `C:/vibe/consultingTae/assets/maps/city-layers/midground-west.png`.
- transparent_background: true
```text
Use Image1 as the EXACT silhouette/location template and replace ONLY its two flat horizontal bands with a painted stone pavement. Canvas MUST remain1536x1024. The upper pale band begins at720px down and ends800px down; make that the top walking surface of a cookie-town promenade. The lower dark band800..865 is its visible masonry cross-section. Green guide at768 is NOT to be drawn; it must lie within flat paving. Erase all guide lettering and green line. Keep every other pixel transparent. Image2 is architectural brushwork/palette reference ONLY: warm lavender-grey slabs, cream stone edging, muted gold diamond inlays and warm upper-left dusk illumination, premium hand-painted detail matching that building. DO NOT copy any building or its composition. NO other road reference is supplied: use the template's LOW placement exactly, do not center or elevate the path. Empty top70% and bottom15% are intentional. Full-width flat edge-to-edge pavement, shallow top surface, NO stairs/hills/raised props/vanishing perspective. No glow/haze outside the strip, background, words, UI, characters or checkerboard. Output one independent RGBA CITY PATH WEST, not a diagram or a full scene.
```

### path-east
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-6842878f-678f-4941-9cf5-36254b49a848.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/city-layers/path-west.png`.
- transparent_background: true
```text
Precisely edit this accepted CITY PATH WEST into a matching EAST variation. LOCK exact1536x1024 RGBA canvas, horizontal silhouette, ALL surface/curb/underside boundary y positions and huge transparent upper/lower areas. Keep paving topy720..780, front creamy curb approximately780..815, short masonry face endingy873; exact row768 remains on opaque walkable PAVING TOP, not the wall. Do not shift, scale, reframe, center or change road thickness. Only vary small paving joints, a few golden diamond inlays and tiny ivy tufts on the underside; distinct local texture, not mirrored/pasted duplicate. Preserve dusk lavender/cream stones, warm upper-left illumination and painterly detail. Both ends maintain IDENTICAL surface height and color for horizontal joining, first22% low-detail continuation. No raised obstacles/railing/sky/objects/words/UI/fake checkerboard/matte or glow filling empty alpha. One independent EAST PNG only.
```

### foreground-west
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-abd3e2bf-988e-4fe3-b7e3-cab6719cca39.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/snow-layers/foreground-west.png`, `C:/vibe/consultingTae/assets/maps/city-layers/midground-west.png`.
- transparent_background: true
```text
Create ONE CITY FOREGROUND WEST independent transparent RGBA game PNG, native1536x1024 landscape3:2. Image1 Snow foreground is ONLY an exact LOW-FRINGE/empty-canvas registration reference; replace all snow/ice with city vegetation and masonry. Image2 City midground is the painterly lavender/cream stone, green ivy and warm gold dusk style reference. Draw only a VERY LOW sparse foreground fringe within BOTTOM120pixels (y904..1023): tiny ivy leaves over short pale stone planter lips, a few white/orange flowers, occasional miniature bronze railing fragments under80px high. Entire TOP850pixels completely transparent, no tall bushes or side branches, no halo/matte/haze there. Aim >85% canvas truly transparent and top80%100% alpha0. Low open gaps along upper edge, no full road/ground slab. Side-on horizontal stage detail, subtle warm upper-left light, rich hand-painted texture matching Forest. No snow, tall tree, large crate/rock/obstacle, character, monster, weapon, UI/words/logo, checkerboard or opaque backdrop. Do not center or enlarge the fringe; huge empty alpha canvas intentional. One foreground WEST layer only.
```

### foreground-east
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-4df3a255-e9b5-4df8-8ea0-116f8137d4fc.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/city-layers/foreground-west.png`.
- transparent_background: true
```text
Edit this accepted CITY FOREGROUND WEST into a distinct matching EAST PNG. Keep exact1536x1024 transparent RGBA canvas and very LOW placement: all visible paint within bottom170px, mostlyy900..1023, NOTHING abovey840. Top80% must be100% alpha0. Change only local arrangements of small ivy leaves/white-orange flowers, low cream-stone planter lips and short bronze railing fragments; a little more sparse ivy toward east-right. No copied/mirrored repeated ornamental landmark. Preserve painterly quality, warm upper-left dusk light, lavender/cream stone and muted gold metal. Don't grow tall posts/shrubs or move/recenter the fringe. Low open gaps above, no ground/road slab, trees, crates, snow, new gameplay obstacle, characters, monsters, words/UI/border/checkerboard or opaque backdrop/haze. Independent foreground EAST only; big empty transparent canvas is intentional.
```

## Replaced path candidates / iteration history
These were rejected on visual contact registration, not silently accepted because alpha passed.

### path-west
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-df2c55e2-2b51-43b8-b7cf-3cf5286e8030.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/snow-layers/path-west.png`, `C:/vibe/consultingTae/assets/maps/city-layers/midground-west.png`.
- transparent_background: true
```text
Precise-object-edit / material transformation. Create CITY PATH WEST from reference1 accepted Snow path, preserving its1536x1024 RGBA canvas, exact thin horizontal road registration and large transparent upper/lower area. Reference2 City midground supplies lavender/cream stone and warm golden dusk light. REPLACE ALL snow/ice/tufts/icicles with an elegant cookie-town STONE/BRICK PROMENADE: warm lavender-grey paving slabs, pale cream beveled curb, occasional tiny golden geometric inlay, visible short brick-masonry cross-section underneath. Same opaque flat walkable surface height as reference1: back edge abouty715, surfacey725..795, front lipy795..810, masonry underside ends byy860. Exacty768 (75% canvas) must be opaque level paving across full1536width. All canvas above700/below900 genuinely transparent; road strip full-width, about140px high, no receding vanishing point, stairs, hills or floor filling the canvas. Keep last22% low-detail compatible paving for overlap. Side-on game-stage pavement with shallow readable top surface, hand-painted rich texture matching Forest/City. No standing props, railing across walking lane, grass/snow, UI/text/characters/matte/painted checkerboard or glowing haze in empty alpha. Do not reframe, recenter, upscale the strip or change canvas size; output only independent CITY PATH WEST.
```

### path-west-v2
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-b7fbc91b-53f4-4208-ac6e-5c203f35100c.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/assets/maps/city-layers/path-west.png`.
- transparent_background: true
```text
Precise technical registration edit of supplied CITY PATH WEST. Keep1536x1024 RGBA transparent canvas, exact painterly paving materials/colors and strip thickness. The current paving is too high: translate the ENTIRE road artwork DOWN by40pixels, without changing canvas or enlarging the strip. Final flat walkable paving should lie around y720..790 so exact rowy768 is on the TOP paving surface, not the vertical front curb. Back rim near715, front curb around790..815, masonry underside about815..875. Nothing above700 or below900 except fully transparent alpha; full-width horizontal level strip, no perspective recession. Preserve gold inlays/cream curb/lavender stones and empty transparent area. No background, no haze matte or checkerboard, no objects/text. This is a vertical registration correction, not a new composition. Output corrected WEST only.
```

### path-west-v3
- Built-in output: `C:\Users\김태화\.codex\generated_images\01a12ee2-c449-7d21-b782-c430b2080bc2\exec-31e64964-9a60-4f17-aec8-c5ff2d41fd1d.png` (copied into workspace, original retained).
- References: `C:/vibe/consultingTae/tmp/region-art-city-road-registration-guide.png`, `C:/vibe/consultingTae/assets/maps/city-layers/path-west.png`.
- transparent_background: true
```text
Create corrected CITY PATH WEST final PNG. Image1 is an EXACT CANVAS POSITION GUIDE1536x1024: light horizontal band is the paving top fromy720..800; dark bandy800..865 is masonry underside; GREEN LINEy768 marks where feet stand. Image2 is ONLY the painterly stone/gold/lavender MATERIAL reference, its vertical position is WRONG and must NOT be copied. Replace the guide bands with rich hand-painted cookie-town stone promenade matching image2, at the guide's EXACT location and thickness. Paving top must cover the GREEN LINE position; NO green line/guide text/colors may remain in output. Subtle gold diamond inlays, cream beveled curb and brick cross-section. Keep original1536x1024 canvas, entire area above y710 and belowy890 TRANSPARENT. Do not center/enlarge/reframe the strip. Full-width perfectly horizontal back/front edges, no raised objects or vanishing perspective. Warm upper-left dusk light. No HUD/text/characters/signage/checkerboard/matte/haze. Real RGBA alpha, independent path layer only. Use the guide to correct placement, not as a placeholder aesthetic.
```
