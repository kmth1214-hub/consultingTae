# Decisions: Forest Layered Background

- Date: 2026-10-12
- Status: Confirmed
- Target: `cookie-roguelike-mockup.html`

## D01. Reconstruct the forest artwork as separate scene layers
- **Chosen**: Create separate bitmap artwork for distant scenery, middle scenery, and foreground rather than adding shading over the existing flattened PNG.
- **Rationale**: The user selected reconstruction of the background artwork itself to achieve stronger depth.
- **Decision source**: User selection, option 3 in the reconstruction interview.
- **Prior decision update**: For the forest presentation only, supersede the requirement in `2026-10-06-area-background-depth.md` to use the unchanged original image as the full-area backdrop. Retain the original source file as a reference; replacing its use does not require deleting or overwriting it.

## D02. Apply the first version to the forest only
- **Chosen**: Implement and evaluate the forest first. Snow, City, Chaos, and the separate bonus scene remain outside this feature's implementation scope.
- **Rationale**: The user selected a forest-first rollout so the visual style and depth can be assessed before expanding.
- **Decision source**: User selection, option 1 in the scope interview.

## D03. Use a side-view forest stage
- **Chosen**: Compose distant mountains and forest, middle trees and cookie houses, and foreground grass and branches as a side-view scene. Preserve the existing forest's green palette, playful illustrated atmosphere, cookie houses, and waterfall motifs where appropriate for this new composition.
- **Rationale**: A side view suits the existing horizontal launcher-to-enemy combat and makes visual distance easier to read.
- **Decision source**: User selection, option 1 in the viewpoint interview; visual motifs derived from the inspected `assets/maps/forest_theme.png`.
- **Layer structure**: Use distinct distant scenery, middle scenery, gameplay ground, and foreground decoration, with separate atmospheric effects where needed. Exact asset boundaries and implementation symbols will be defined during planning.

## D04. Combine camera parallax with subtle environmental motion
- **Chosen**: During camera movement, distant scenery moves less than nearer scenery. Add subtle fog, falling or drifting leaves, and waterfall motion while the battle is visible.
- **Rationale**: The user selected both camera-driven depth and gentle ambient movement.
- **Decision source**: User selection, option 2 in the motion interview.
- **Implementation constraints derived from existing code**: Integrate with `playRoundIntro`, `focusCameraOn`, and `stopCameraAnimation`; do not introduce an independent competing gameplay camera. Respect the existing `prefers-reduced-motion` behavior by showing a static composition when reduced motion is requested. Suspend decorative animation while the battle is hidden. Ensure camera movement and zoom do not expose uncovered edges.

## D05. Redesign the road as a continuous horizontal dirt path
- **Chosen**: Keep a broad, level, continuous route and redesign it as forest dirt with grassy edges and a visible earth cross-section.
- **Rationale**: The user selected a natural forest road that retains the simple horizontal combat layout while adding depth.
- **Decision source**: User selection, option 1 in the road interview.
- **Prior decision update**: Preserve the horizontal road requirement from the earlier decisions; replace the forest road's current visual treatment only.

## D06. Preserve combat readability and coordinate behavior
- **Chosen**: Keep decorative foreground objects around scene edges so they do not obscure enemies, the launcher, or trajectory previews. Decorative layers do not intercept aiming input or alter projectile motion, damage, ammunition, or enemy behavior.
- **Rationale**: The existing aiming code converts pointer coordinates through the inverse transform of `arenaWorld`, and projectile and launcher positions share that world. Background reconstruction must preserve that coordinate relationship.
- **Decision source**: Code-derived constraint and the interview's stated foreground placement approach; no new gameplay mechanic was requested.
- **Verification expectations for planning**: Check forest rendering during enemy focus, launcher focus, and full-scene return; ambient motion and reduced-motion fallback; fullscreen and responsive layouts; unobstructed aiming and projectile travel; unchanged rendering and selection behavior in other areas.

## Existing implementation notes
- `arenaWorld` currently paints one theme PNG as a CSS background. The existing `.area-depth-layer` adds atmospheric shading, and `areaRoad` draws the road separately. They are not independently moving scenery layers.
- The camera already animates the whole gameplay world during round introduction. Reuse and adapt that integration instead of adding duplicate camera control.
- The current forest reference is a flattened illustration viewed from above at an angle. The confirmed side-view composition requires newly composed artwork; merely slicing rectangular sections from the PNG will not produce independent objects with transparent surroundings.
- The separate `.bonus-field` has its own decorative implementation. It is excluded from the forest-first scope.

## Next workflow step
- Run `/memory-plan forest-layered-background` to define assets, files, symbols, verification commands, and sequential tasks. No implementation code was changed during this interview.
