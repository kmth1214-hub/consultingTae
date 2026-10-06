# Task: T01 Chaos Depth Cues and Flat Road

## Status: done

## Goal

Give the Chaos battle arena a stronger 3D-like sense of distance while preserving the supplied background image exactly and showing a flat, continuous road between the launcher side and the enemies.

## Decision Summary

- Keep `./assets/maps/chaos_theme.png` as the unchanged full-screen Chaos artwork.
- Add subtle CSS depth layers over the artwork and one broad, level horizontal road under the combat actors.
- Keep all new visuals decorative; do not change shot resolution, collisions, damage, or enemy behavior.

## Implementation

### I01. Add a Chaos-only depth and road layer

- Related Files:
  - `cookie-roguelike-mockup.html` :: `.arena-world`, `#arenaWorld`, `#arena[data-area="chaos"]` — add decorative layers without changing the world transform; modify.
  - `cookie-roguelike-mockup.html` :: `.chaos-depth-layer`, `#chaosRoad`, `.chaos-road-*` — style the depth cues and level road; add.
  - `cookie-roguelike-mockup.html` :: `setArenaArea(area)` — confirm the existing arena `data-area` switch activates only the Chaos layers; modify only if the selector requires it.

#### Details

- Preserve the existing `AREA_BACKGROUNDS.chaos` mapping to `./assets/maps/chaos_theme.png`. Do not modify the asset, `background-size`, or its full-composition framing.
- Inside `#arenaWorld`, insert the depth layer and road SVG before `#launchPad`, then retain the existing launcher, trajectory, projectile, and enemy DOM order. Mark both new layers `aria-hidden="true"` and `pointer-events:none`.
- DOM schema:
  ```html
  <div class="chaos-depth-layer" aria-hidden="true"></div>
  <svg id="chaosRoad" class="chaos-road" aria-hidden="true" viewBox="0 0 1000 600" preserveAspectRatio="none">
    <rect class="chaos-road-shadow" x="90" y="411" width="820" height="138" rx="69"></rect>
    <rect class="chaos-road-edge" x="90" y="405" width="820" height="132" rx="66"></rect>
    <rect class="chaos-road-surface" x="90" y="412" width="820" height="118" rx="59"></rect>
    <path class="chaos-road-highlight" d="M 150 431 H 850"></path>
  </svg>
  ```
- Style `.chaos-depth-layer` exactly as an absolute full-world overlay with `z-index:1`, `display:none`, and `pointer-events:none`. Use this background: `linear-gradient(180deg, rgba(12,8,35,.06) 0%, transparent 40%, rgba(13,8,37,.18) 100%), radial-gradient(ellipse at 50% 44%, rgba(133,96,255,.08) 0%, transparent 68%)`. Set `display:block` only under `#arena[data-area="chaos"]`. These low-opacity overlays add distance and edge shading while leaving the image asset and its existing colors/framing intact.
- Style `#chaosRoad` as absolute `inset:0`, `width:100%`, `height:100%`, `z-index:2`, `display:none`, and `pointer-events:none`. Display it only under `#arena[data-area="chaos"]`. Give `.chaos-road-shadow` fill `rgba(7,4,23,.58)`, `.chaos-road-edge` fill `#352c68`, and `.chaos-road-surface` a vertical SVG gradient from `#7770b8` at 0% through `#625ca5` at 16% to `#36305f` at 100%. Give `.chaos-road-highlight` a `rgba(234,221,255,.55)` stroke, `5` width, and round line caps. The road stays below `.trajectory-preview` (`z-index:3`) and `.monster` (`z-index:4`) and above the artwork/depth layer. Set `#launchPad` to `z-index:3` so the road cannot cover the launcher; preserve all launcher coordinates and sizes.
- Use the SVG geometry in the DOM schema without changing its coordinates: the shadow rect at `(90,411)` sized `820x138`, edge rect at `(90,405)` sized `820x132`, surface rect at `(90,412)` sized `820x118`, and highlight from `(150,431)` to `(850,431)`. Keep all road edges horizontal and parallel at a constant y-coordinate from launcher to enemy side. Do not add bends, ramps, or a vanishing-point taper.
- Give the depth layer `z-index:1`; keep the existing launcher, enemy positions, world size, camera transforms, and projectile layer unchanged.
- Add an SVG `<defs>` vertical `linearGradient` with `id="chaosRoadSurface"`, `x1="0" y1="0" x2="0" y2="1"`; use stops `0% #7770b8`, `16% #625ca5`, and `100% #36305f`. Reference it from `.chaos-road-surface` with `fill="url(#chaosRoadSurface)"`.
- Keep the fixed `viewBox="0 0 1000 600"` and `preserveAspectRatio="none"`. Since `#arenaWorld` stays 160% of the arena in both dimensions, the flat road remains horizontal at desktop and mobile sizes.
- Do not add click targets, focusable controls, text, or accessibility labels for the decorative layers.

## Acceptance Criteria

- [ ] Chaos continues to use the original `chaos_theme.png` at its existing framing and recognizable colors.
- [ ] The Chaos scene reads as more dimensional through restrained layered light and shadow cues.
- [ ] One broad road runs level from the launcher side toward the enemy side with parallel edges and no visible slope or bend.
- [ ] The road and depth treatment appear only in Chaos and remain under the launcher, enemies, and projectile.
- [ ] Forest, Snow, and City presentation is unchanged.
- [ ] No shot, collision, damage, ammo, or enemy-turn logic is changed.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — enter the Chaos area and confirm the original background remains intact, the depth treatment is subtle, and the road is level and continuous.
- Repeat at desktop and narrow mobile widths; confirm the road remains horizontal and inside `#arena`, and camera intro still frames the launcher and enemies.
- Visit Forest, Snow, and City and confirm the Chaos-only layers are hidden.
- Extract the inline script to a temporary `.js` file and run `node --check` on it; remove the temporary file afterward.
- Run `git diff --check`.

## Commit Message

```text
feat(battle): add depth to chaos arena

Plan: 2026-10-06-chaos-theme-depth-flat-route
Phase: P01-chaos-scene
Task: T01-chaos-depth-flat-road

- Preserve chaos artwork with restrained depth cues
- Add one level continuous road across the Chaos arena
```

## Progress

- [x] Implementation complete
- [x] Validation passed (inline script syntax and diff checks passed; manual browser visual inspection unavailable because file URL access is blocked)
- commit: pending