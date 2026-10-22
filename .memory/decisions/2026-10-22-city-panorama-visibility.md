# Decisions: City Panorama Visibility

- Date: 2026-10-22
- Status: Confirmed
- Target: React regional battlefield and development map studio under `src/`
- References: [Regional layered world and map studio](./2026-10-21-regional-layered-world-and-map-studio.md), [Battlefield sky and enemy projectile visibility](./2026-10-22-battlefield-sky-projectile-visibility.md), user-provided city panorama reference and marked view.

## D01. Let the scenic city panorama read as the main backdrop
- **User request**: The impressive city vista is hidden in the current scene; the user wants the marked skyline panorama to be visible during play.
- **Chosen by user**: “원경 우선, 길은 아래에 유지”. Preserve the interactive horizontal road and its collision plane. Open a broad central view to the existing distant city skyline, while keeping city midground landmarks as framing scenery near the outside edges. The distant city art should be immediately recognizable at ordinary gameplay scale, not only in the map studio or close zoom.
- **Reference**: Use the marked city skyline image as the visual target for its warm dusk, layered town, bridges and scenic breadth. Existing dedicated City PNGs and Forest remain the project style/depth references.

## D02. Keep visual composition separate from gameplay geometry
- Preserve the world dimensions, `groundY`, road y-position, registered obstacle polygons, actor positions, shot geometry, camera modes and all input/combat rules.
- Only City decorative composition may change. Forest, Snow and Chaos remain visually and behaviorally unchanged.
- Preserve the user's current uncommitted city distant-art lift in `src/game/sceneCatalog.js`; incorporate it as the starting state rather than replacing or reverting it.
- The selected view is confirmed; if implementation reveals the intent requires removing or moving the playable road, stop before that incompatible change.

## D03. Acceptance must use the real runtime composition
- Review both the normal game and development map studio, since both render `BattlefieldBackdrop` but use different viewports/camera framing.
- Check the city panorama at desktop overview and narrow portrait sizes, with all scene layers enabled. The composition succeeds only when the skyline remains visually prominent above the clear road in actual screenshots; DOM presence and image-load checks alone are insufficient.
- Verify that the midground still frames the city and the route remains the foremost gameplay plane. Do not accept a flat-color placeholder, opaque card edge, repeated panel seam, HUD obstruction or altered collision geometry.

## Deferred scope
- No new city art generation, gameplay obstacle changes, road redesign, global camera change, administrator feature or Azure configuration is authorized by this visual correction plan.
- If existing art cannot produce the target composition through safe City-only layer placement/clipping, record the limitation and return for a separate art decision rather than silently replacing assets.
