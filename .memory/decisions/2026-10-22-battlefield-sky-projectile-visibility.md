# Decisions: Battlefield Sky and Enemy Projectile Visibility

- Date: 2026-10-22
- Status: Confirmed from browser reproduction
- Target: React/Vite game under `src/`; legacy HTML remains a visual reference.

## D01. Fill the visible sky with the regional gradient
- Browser pixel samples show a flat palette-colored strip across the top of Snow, City, and Chaos. The strip covers roughly the first 8% of the arena; the illustrated scene begins below it. Forest already has visible color variation at the same positions.
- Extend the non-Forest sky gradient and paint rectangle across the full visible sky range so camera framing never exposes only the solid fallback color.
- Preserve each region's palette, existing illustrated panels, layer ordering, camera, and road/actor geometry. Do not add new artwork or change camera framing for this fix.

## D02. Make the enemy projectile's existing arc readable
- `EnemyResponse` already moves non-melee enemy projectiles from attacker to player with a sine-shaped vertical offset (except breath attacks). Browser observation confirms that the rendered projectile itself has no path or trail.
- Draw a restrained, attack-color trajectory behind the projectile, from its attacker to the player. Match the current travel geometry: a quadratic arc for normal projectiles and a straight line for breath attacks.
- Show the trail only during the travel stage. It is a visual cue, not a collision or combat mechanic; keep attack timing, damage, camera movement, reduced-motion behavior, and projectile coordinates unchanged.

## D03. Verify both issues in the real browser
- Add regression coverage that measures arena screenshot pixels across the upper sky band for all four regions and checks that the enemy path is visible only during projectile travel.
- Retain the existing attack motion and combat timing checks. Review the produced screenshots at desktop and narrow viewports; do not weaken unrelated tests to accommodate these changes.
- Do not alter the active Candy Roll plan's task files. This plan temporarily becomes the active pointer so it can be executed in order; the Candy Roll plan remains pending and can be resumed afterward.

## D04. Raise the low distant art selectively
- Snow, City, and Chaos place their distant panels too low in the visible battlefield, leaving too little of the scenic artwork visible. Their source art begins at world y=-450; Forest uses a separate layered composition whose distant artwork already sits higher.
- Lift only the Snow/City/Chaos distant panels by 80 world units. Keep Forest's composition, midground, route, foreground, actors, obstacles, camera, and collision positions unchanged.
- Recheck the sky-to-art blend after the move because the distant panel edge will also move upward. Prefer a modest lift that reveals more of the artwork while keeping the sky transition seamless.
