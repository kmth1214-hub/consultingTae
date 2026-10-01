# Task: T03 Structured Area Routes and Obstacles

## Status: pending

## Goal

Make the battle map read as an intentional route through each themed area, with distinct spaced obstacles and less competing background detail, while preserving the current camera and battle actors.

## Decision Summary

- Use a clean illustrated 2.5D composition rather than a busy full-screen collage.
- Keep the selected area backgrounds as subdued thematic backdrops; build the route and obstacle layer separately.
- Obstacles are decorative in this task and do not change shot physics or combat rules.

## Implementation

### I01. Separate backdrop, continuous route, and obstacle layers

- Related Files:
  - `cookie-roguelike-mockup.html` :: `.arena-world`, `#arenaWorld`, `#launchPad`, `#enemyGroup` — add structured scene layers without changing world transforms; modify.
  - `cookie-roguelike-mockup.html` :: `.arena-world::before`, `.scene-route`, `.scene-obstacles`, `.scene-obstacle` — define layered background, route, and obstacles; add/modify.
  - `cookie-roguelike-mockup.html` :: `AREA_BACKGROUNDS`, `AREA_LABELS`, `AREA_ICONS`, `setArenaArea` — keep current area mapping synchronized with scene styling; modify only if needed.

#### Details

- Move the current full-image background treatment to a subdued backdrop layer using the existing `AREA_BACKGROUNDS` images. Reduce saturation and contrast so scene details do not compete with actors or the path.
- Add one inline SVG route layer under the actors and trajectory layer. It must have `id="sceneRoute"`, a viewBox matching the current `#arenaWorld` pixel dimensions, and a broad continuous path that clearly connects the launcher side to the enemy side.
- Style the route as a readable trail with a contrasting edge and fill; use the same side-on/isometric illustration direction as the current scene. Do not create multiple visually competing paths.
- Add `id="sceneObstacles"` and place intentional obstacle groups at spaced world positions. Use stable `data-obstacle` and `data-area` values rather than positional selectors alone.
- Area-specific obstacle set:
  - `forest`: fallen log, roots, and one boulder beside/across the visible trail.
  - `snow`: snowdrift and two ice/crystal formations beside or partly across the trail.
  - `city`: crates, a broken appliance panel, and a road barrier.
  - `chaos`: a small mix of forest, snow, and city set pieces, with enough clear trail left to read the route.
- Keep the obstacle count restrained and gaps between obstacles large enough to preserve a clear view of launcher, projectile, and enemies. The obstacles decorate the route; they do not stop or redirect shots.
- Keep `#launchPad`, `#enemyGroup`, `.trajectory-preview`, and the visible projectile inside `#arenaWorld`. Preserve the current world dimensions and camera transformations.
- Scale SVG viewBox and scene placement on resize; do not stretch actor artwork or change combat state.
- Mark purely decorative scenery with `aria-hidden="true"`. Keep `#arena` accessible label and area caption unchanged.

## Acceptance Criteria

- [ ] The path through each scene is visually distinct, continuous, and leads from launcher to enemies.
- [ ] Forest, snow, city, and chaos use the specified themed, spaced obstacles.
- [ ] Background art is subdued enough that route, projectile, monsters, and launcher remain the visual focus.
- [ ] The scene retains its illustrated 2.5D look without becoming a crowded collage.
- [ ] Existing camera intro, area labels, mouse trajectory, projectile animation, and controls remain aligned.
- [ ] Obstacles are decorative only; no collision or damage behavior is introduced.

## Validation

- `Start-Process .\cookie-roguelike-mockup.html` — visit Forest, Snow, City, and Chaos and inspect the route, spacing, and foreground readability.
- Repeat at the current desktop sizes and narrow mobile width; verify scene geometry remains inside `#arena` and camera motion still frames launcher and enemies.
- Verify that shots still travel visibly across the route and obstacle decoration does not conceal the projectile.
- Run `git diff --check` and extract the inline script for `node --check`.

## Commit Message

```text
feat(battle): structure area routes and obstacles

Plan: 2026-10-01-battle-presentation-refinement
Phase: P01-battle-refinement
Task: T03-structured-area-routes

- Separate area backdrop from the readable route layer
- Add spaced area-specific obstacle scenery
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
