# Chaos side-view layer artwork review

- Date: 2026-10-21
- Task: P01-T03, Chaos dedicated layer artwork
- Tool: built-in imagegen; 14 image generations, 8 final panels selected. Temporary generated files remain under the default imagegen output folder; only accepted files were copied into the project.
- References inspected before generation: `assets/maps/chaos_theme.png` for motifs, all four `assets/maps/forest-layers/*.png` for the established hand-painted depth style, and accepted Snow/City path layers for road registration.
- Final assets: `assets/maps/chaos-layers/{distant,midground,path,foreground}-{west,east}.png` and `layers.json`.
- Dimensions: all eight are native 1536x1024 3:2 PNGs. Total asset bytes: 11,255,361.

## Accepted prompt set

All prompts used the `illustration-story` image-generation use case and requested polished, hand-painted side-view game scenery at native 3:2. The original Chaos map was treated only as a palette/motif reference; Forest art established painterly quality and layer placement.

1. **Distant west:** opaque violet-indigo twilight, layered far mountains and small floating-island silhouettes; low-contrast gameplay horizon; keep the rightmost 22.23% quiet for the join; no foreground or actors.
2. **Distant east:** complementary fractured-ice and tiny oven-city skyline; match the west panel's twilight palette while keeping the leftmost 22.23% quiet; do not repeat the west landmarks.
3. **Midground west:** isolated transparent crystal-ridge clusters and small oven-city fragments; preserve an open center and lane; landmarks above y=716; no glow sheet or backdrop.
4. **Midground east:** distinct transparent ice shelf and small oven-city tower with crystal clusters; clear left overlap, center and lower gameplay lane; no opaque atmospheric backdrop.
5. **Path west:** transparent canvas with a flat cracked amethyst mosaic route; top y≈736, surface to y=800, faceted underside to y=860; row y=768 opaque across the central 96%; no slope, gap or obstacle.
6. **Path east:** complementary continuation with the same level registration and visible crystal-earth cross-section; transparent above/below the road; no gameplay props.
7. **Foreground west:** transparent bottom-edge roots, small crystals and flowers, mostly open center and player space; scenery restricted to the lower canvas; no ambient backdrop.
8. **Foreground east:** sparser asymmetric companion framing with open overlap/center; transparent above the lower edge; no glow or backdrop.

## Rejected iterations and corrections

- An initial distant-west attempt was discarded before selection.
- The first path-west generation put the road well above the gameplay baseline. A temporary PNG guide, rendered from SVG in the browser (not used as game art), marked y=736, 768, 800 and 880. A new imagegen generation followed that registration and was accepted.
- Early foreground generations contained too much diffuse light near the upper transparency boundary. West and east were regenerated with artwork constrained to the bottom edge. The final files pass the top-80% alpha threshold.
- The remaining unused generations were discarded; no generated raster was modified or background-removed in code.

## Browser-decoded validation

Command: `node scripts/verify-region-art.cjs chaos`

| Layer | West | East |
| --- | ---: | ---: |
| Distant opaque pixels | 100.00% | 100.00% |
| Midground transparent pixels | 78.72% | 85.15% |
| Path transparent pixels | 83.84% | 78.36% |
| Path baseline opacity at y=768, central 96% | 100.00% | 100.00% |
| Foreground transparent pixels | 91.86% | 93.70% |
| Foreground transparent pixels in top 80% | 99.87% | 99.16% |

The final Chaos check passed all eight native dimensions, role/alpha checks and road registration. `node scripts/verify-region-art.cjs all` passed all 24 Snow/City/Chaos images (36,015,499 bytes total). `npm.cmd run build` and `git diff --check` passed. The production renderer and game source were not changed in this artwork task.

## Visual review and limits

- Inspected each final layer on a checkerboard, plus a registered full-width panorama and the west/east join. PNG cutouts show genuine transparency; the contact row crosses the paving surface, and the path has a visible crystal-rock cross-section.
- The east and west compositions are distinct and the floating scenery remains behind the route. The art uses brighter violet/pink contrast than Forest to retain Chaos identity.
- The raw panorama shows a visible color/texture transition where the 600-world-unit panels overlap, especially in the opaque distant sky and road material. The shared runtime task T04 must feather the overlap against a matching underpaint; this asset task does not implement or claim a runtime seam fix. Gameplay coordinates and the live renderer remain unchanged.
- Image previews: `tmp/region-art-chaos-overview.jpg`, `tmp/region-art-chaos-join.jpg`, and `tmp/region-art-chaos-{distant,midground,path,foreground}-{west,east}-checker.jpg` (untracked temporary review files).

## Generated-image prompt details

The concise accepted prompt set above records the distinct per-image directions and hard composition constraints. The relevant prompt specifics were: native 1536x1024, no text/UI/characters/weapons, correct opacity mode, fixed 75% baseline, quiet panel overlap, and no false checkerboard transparency. Temporary review imagery is not shipped.
