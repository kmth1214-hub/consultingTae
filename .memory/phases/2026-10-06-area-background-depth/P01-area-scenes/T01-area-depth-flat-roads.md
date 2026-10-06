# Task: T01 Shared Area Depth and Flat Roads

## Status: done

## Goal

Show the existing full-area background for Forest, Snow, City, and Chaos with the same subtle depth cue and level, continuous road, using an area-specific palette while leaving all source images and combat actors intact.

## Decision Summary

- Preserve the four existing theme assets and current image framing.
- Generalize the Chaos-specific depth and road DOM/CSS into one shared layer activated by `#arena[data-area]`.
- Keep Chaos colors unchanged; add distinct earth, ice, and city palettes for Forest, Snow, and City.
- Do not change gameplay or add obstacles.

## Implementation

### I01. Generalize the shared area depth and road layers

- Related Files:
  - `cookie-roguelike-mockup.html` :: `.chaos-depth-layer`, `.chaos-road*`, `#arena[data-area="chaos"]`, `#launchPad` — replace Chaos-only styling with area-generic layered scene styles and explicit per-area palettes; modify.
  - `cookie-roguelike-mockup.html` :: `#arenaWorld`, `#chaosRoad`, `AREA_BACKGROUNDS`, `setArenaArea(area)` — reuse one decorative road SVG and rely on the existing area data attribute; modify DOM; read-only mapping/function unless required.

#### Details

- Keep `AREA_BACKGROUNDS` values exactly:
  - `forest`: `./assets/maps/forest_theme.png`
  - `snow`: `./assets/maps/snow_theme.png`
  - `city`: `./assets/maps/city_theme.png`
  - `chaos`: `./assets/maps/chaos_theme.png`
- Do not alter the asset files, `#arenaWorld` `background-size:cover`, `background-position:center`, world width/height, or any camera transform.
- Rename the existing `<div class="chaos-depth-layer">` to `<div class="area-depth-layer" aria-hidden="true"></div>`.
- Rename `#chaosRoad.chaos-road` to `<svg id="areaRoad" class="area-road" aria-hidden="true" viewBox="0 0 1000 600" preserveAspectRatio="none">` and rename its child classes to `.area-road-shadow`, `.area-road-edge`, `.area-road-surface`, and `.area-road-highlight`.
- Use one shared road SVG with this fixed shape and coordinates:
  ```html
  <div class="area-depth-layer" aria-hidden="true"></div>
  <svg id="areaRoad" class="area-road" aria-hidden="true" viewBox="0 0 1000 600" preserveAspectRatio="none">
    <defs>
      <linearGradient id="areaRoadSurface" x1="0" y1="0" x2="0" y2="1">
        <stop class="area-road-stop-top" offset="0%"></stop>
        <stop class="area-road-stop-middle" offset="16%"></stop>
        <stop class="area-road-stop-bottom" offset="100%"></stop>
      </linearGradient>
    </defs>
    <rect class="area-road-shadow" x="90" y="411" width="820" height="138" rx="69"></rect>
    <rect class="area-road-edge" x="90" y="405" width="820" height="132" rx="66"></rect>
    <rect class="area-road-surface" x="90" y="412" width="820" height="118" rx="59"></rect>
    <path class="area-road-highlight" d="M 150 431 H 850"></path>
  </svg>
  ```
- Keep both layers directly inside `#arenaWorld`, before `#launchPad`. Keep the existing launcher, trajectory SVG, projectile sprite, and enemy group in their current order after those layers.
- Add per-area custom properties to `#arena[data-area="..."]` selectors:
  - `forest`: `--area-road-shadow:rgba(12,29,16,.58)`; edge `#596541`; gradient stops top `#d8a77d`, middle `#a66f58`, bottom `#62494a`; highlight `rgba(255,237,200,.62)`; depth gradient `linear-gradient(180deg,rgba(17,34,22,.06) 0%,transparent 40%,rgba(17,33,25,.16) 100%),radial-gradient(ellipse at 50% 44%,rgba(111,194,122,.08) 0%,transparent 68%)`.
  - `snow`: `--area-road-shadow:rgba(14,28,48,.56)`; edge `#45617f`; gradient stops top `#b8d9ed`, middle `#779dbb`, bottom `#475f83`; highlight `rgba(235,248,255,.66)`; depth gradient `linear-gradient(180deg,rgba(10,22,46,.04) 0%,transparent 40%,rgba(12,28,52,.14) 100%),radial-gradient(ellipse at 50% 44%,rgba(180,220,255,.10) 0%,transparent 68%)`.
  - `city`: `--area-road-shadow:rgba(34,17,37,.60)`; edge `#57445c`; gradient stops top `#d8ac83`, middle `#a87780`, bottom `#4b3d5c`; highlight `rgba(255,225,176,.64)`; depth gradient `linear-gradient(180deg,rgba(38,15,31,.05) 0%,transparent 40%,rgba(24,14,37,.16) 100%),radial-gradient(ellipse at 50% 44%,rgba(255,183,105,.08) 0%,transparent 68%)`.
  - `chaos`: retain the implemented values exactly: shadow `rgba(7,4,23,.58)`; edge `#352c68`; gradient stops top `#7770b8`, middle `#625ca5`, bottom `#36305f`; highlight `rgba(234,221,255,.55)`; depth gradient `linear-gradient(180deg,rgba(12,8,35,.06) 0%,transparent 40%,rgba(13,8,37,.18) 100%),radial-gradient(ellipse at 50% 44%,rgba(133,96,255,.08) 0%,transparent 68%)`.
- Set `.area-depth-layer` to absolute `inset:0`, `z-index:1`, `display:none`, `pointer-events:none`, and `background:var(--area-depth-background)`. Display it for `forest`, `snow`, `city`, and `chaos` only.
- Set `.area-road` to absolute `inset:0`, `z-index:2`, `width:100%`, `height:100%`, `display:none`, and `pointer-events:none`. Display it for `forest`, `snow`, `city`, and `chaos` only.
- Use `fill:var(--area-road-shadow)` on `.area-road-shadow`, `fill:var(--area-road-edge)` on `.area-road-edge`, and `fill:url(#areaRoadSurface)` on `.area-road-surface`. Set each gradient stop's `stop-color` from its matching `--area-road-top`, `--area-road-middle`, or `--area-road-bottom` property. Use `stroke:var(--area-road-highlight)`, `stroke-width:5`, `stroke-linecap:round`, and `fill:none` for `.area-road-highlight`.
- Preserve layer order: depth `z-index:1`, road `z-index:2`, launcher and trajectory `z-index:3`, monsters `z-index:4`, projectile `z-index:6`. Keep launcher coordinates/sizes unchanged.
- Keep the road geometry horizontal and constant-width for every area. Do not add curves, ramps, taper, or obstacle elements.
- The existing `setArenaArea(area)` already sets `#arena.dataset.area` before selecting the image. Use that attribute for CSS selection; do not add new runtime state or alter the image mapping.
- Keep the fixed SVG viewBox and `preserveAspectRatio="none"`. `#arenaWorld` remains 160% of the arena in both dimensions, so the path remains horizontal at desktop and mobile sizes.
- Keep all new scenery `aria-hidden="true"`; add no text, controls, pointer handlers, collisions, or combat effects.

## Acceptance Criteria

- [ ] Forest, Snow, and City each show one level road and subtle depth cues in colors matching their original background.
- [ ] Chaos retains its current background, depth treatment, road geometry, and palette.
- [ ] Original image files, image mapping, framing, and visible source composition remain unchanged.
- [ ] Depth and road layers sit beneath the launcher, monsters, trajectory, and projectile.
- [ ] At narrow and desktop widths, the road remains level and inside the arena.
- [ ] All layers are decorative; no aiming, projectile, collision, damage, ammo, or enemy behavior changes.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — inspect Forest, Snow, City, and Chaos; confirm each original image is preserved and each road/depth palette matches its area.
- Repeat at desktop and narrow mobile widths; confirm each road stays horizontal within `#arena`, and the camera intro still frames the launcher and enemies.
- Fire one shot per area and confirm the existing projectile and ammo behavior is unchanged.
- Confirm only the active area's palette is used as `setArenaArea(area)` changes `#arena[data-area]`.
- Extract the inline script to a temporary `.js` file, run `node --check`, then remove the temporary file.
- Run `git diff --check`.

## Commit Message

```text
feat(battle): unify area depth and flat roads

Plan: 2026-10-06-area-background-depth
Phase: P01-area-scenes
Task: T01-area-depth-flat-roads

- Extend layered depth cues to Forest, Snow, and City
- Preserve each area palette with a level shared road
```

## Progress

- [x] Implementation complete
- [x] Validation passed (inline script syntax and diff checks passed; manual browser inspection unavailable because local file URLs are blocked)
- commit: pending