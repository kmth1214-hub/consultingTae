# Decisions: Chaos Theme Depth and Flat Route

- Date: 2026-10-06
- Status: Confirmed

## D01. Preserve the Chaos artwork
- **Chosen**: Keep `assets/maps/chaos_theme.png` as the unchanged, full-composition Chaos background.
- **Rationale**: The user explicitly asked to keep this design and background. Depth treatment will be added as separate, subtle scene layers; the source artwork itself will not be recolored, cropped, or replaced.

## D02. Add depth cues without changing the illustration
- **Chosen**: Use code-native atmospheric shading and layered shadows that complement the existing illustrated perspective.
- **Rationale**: This gives the scene a stronger 3D-like sense of distance while preserving the supplied image and avoiding new art assets or dependencies.

## D03. Keep the Chaos road level and simple
- **Chosen**: Add one broad, continuous, horizontal road band with parallel edges and consistent height across the arena.
- **Rationale**: The requested road should read as flat and easy to follow from the launcher toward the enemies.

## D04. Keep the map presentation-only
- **Chosen**: The road and depth layers are decorative; they do not affect projectile motion, collision, damage, or enemy behavior.
- **Rationale**: The request concerns visual presentation and should preserve the existing combat rules.