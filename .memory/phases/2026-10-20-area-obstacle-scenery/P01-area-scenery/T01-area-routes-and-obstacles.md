# Task: T01 Area Routes and Obstacles

## Status: done

## Goal
Render a continuous, readable trail and a few visually distinct decorative obstacles for every arena region. Preserve all game interaction and camera behavior; scenery must not affect projectile or combat logic.

## Decision Summary
- Boss special attacks retain the existing third-attack trigger.
- Obstacles are decorative only; collisions and damage are out of scope.
- Use the existing art direction and world-coordinate arena; keep actors, trajectory, and projectile above route art.

## Implementation

### I01. Add region-specific scenic route and props

- Related files:
  - `cookie-roguelike-mockup.html` :: `.arena-world`, `.area-road`, `.forest-path`, `#arenaWorld` — add distinct route and obstacle overlay layers; modify.
  - `cookie-roguelike-mockup.html` :: `AREA_BACKGROUNDS`, `setArenaArea` — retain the four region keys and confirm styling follows `#arena[data-area]`; modify only if required.
  - `cookie-roguelike-mockup.html` :: `.launch-pad`, `.enemy-group`, `.trajectory-preview`, `.projectile-sprite` — preserve dimensions, transforms, and stacking above scenery; read-only.

#### Details
- Add an `aria-hidden="true"` route SVG with a stable `id="sceneRoute"` inside `#arenaWorld`, using a `viewBox="0 0 1000 600"` and `preserveAspectRatio="none"`. Draw one broad continuous illustrated trail from the launcher side toward the enemy side. Use a dark outer edge/shadow, area-themed surface colors, and a subtle highlight; keep contrast sufficient against existing backgrounds. For Forest's custom layered image, use its existing path layer as the ground and avoid drawing a duplicate competing trail.
- Add an `aria-hidden="true"` obstacle container with `id="sceneObstacles"` and stable area groups with `data-area="forest|snow|city|chaos"`. Use inline SVG paths/basic shapes or HTML/CSS shapes; no external assets or scripts. Keep obstacles around the route margins and do not cover the slingshot, enemy group, or most of the projectile path.
- Props inventory: Forest fallen log, exposed roots, boulder; Snow snowdrift and two ice/crystal formations; City stacked crates, broken appliance panel, road barrier; Chaos a restrained mix of log/root, crystal/snowdrift, and crate/barrier props.
- Keep SVG/scenery inside the existing world so world scaling and the camera continue to position it. Set scenery below launcher, enemy, trajectory, and projectile layers; retain existing foreground canopy above actors where currently used.
- Do not alter attack counters, boss special logic, aim calculations, projectile animation, actor positions, world dimensions, or area labels/captions.

### I02. Static structural and syntax validation

- Related files:
  - `cookie-roguelike-mockup.html` — validate expected SVG/groups and the inline script; no separate test file.

#### Details
- Extract each inline JavaScript block with Node and run `node --check` on the extracted script.
- Assert all four area keys have one obstacle group and expected prop identifiers, route layer remains present, decorative layer is `aria-hidden`, and collision/combat selectors are not introduced.
- Run `git diff --check`.

## Acceptance Criteria
- [ ] Each arena has a continuous readable route appropriate to the region; Forest reuses its existing layered path.
- [ ] Forest, Snow, City, and Chaos display the themed prop sets specified above with open spacing around battle actors.
- [ ] Launcher, monsters, trajectory, and projectile remain above route art and controls/camera logic are unchanged.
- [ ] Decorative props do not add collision, shot redirection, or damage behavior.
- [ ] Inline JavaScript syntax and whitespace checks pass.

## Validation
- `node` inline-script extraction and `node --check` on the extracted script.
- `node` static DOM/style checks for all four route/obstacle groups, expected IDs/data attributes, and absence of new collision handling.
- `git diff --check`.

## Commit Message
```text
feat(battle): add themed area route scenery

Plan: 2026-10-20-area-obstacle-scenery
Phase: P01-area-scenery
Task: T01-area-routes-and-obstacles

- Add a readable route and spaced region-specific scenery
- Keep obstacles decorative and preserve battle interactions
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: feat(battle): add themed area route scenery
