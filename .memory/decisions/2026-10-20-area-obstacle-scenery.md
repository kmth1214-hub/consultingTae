# Decision: Area Obstacle Scenery

## Confirmed decisions
- Preserve the existing special boss ability cadence: the special attack triggers on the boss's third attack.
- Add a distinct route and region-themed decorative obstacles for Forest, Snow, City, and Chaos.
- This task is visual only. Obstacles do not collide with projectiles, redirect shots, block attacks, or deal damage; interaction rules can be planned separately.
- Preserve the slingshot, enemies, projectile, aim preview, camera transforms, and current area backgrounds.
- Keep Unity migration as an evaluation, not part of this implementation. Recommend an engine decision based on the intended mechanics and a small vertical-slice test.

## Visual direction
- Use restrained illustrated scenery that complements each existing background and keeps actors and shots easy to read.
- Forest: fallen log, exposed roots, and a boulder.
- Snow: a snowdrift and two ice/crystal formations.
- City: stacked crates, a broken appliance panel, and a road barrier.
- Chaos: a small readable mix of forest, snow, and city props.
- Keep a continuous broad route between the slingshot and enemies; obstacles sit beside or partially overlap its margins with generous gaps.
