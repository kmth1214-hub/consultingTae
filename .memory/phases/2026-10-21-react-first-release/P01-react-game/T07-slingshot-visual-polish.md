# T07 Slingshot Visual Polish

## Status
done

## Decisions
- User requests a player slingshot that matches the newly polished monster attacks.
- Retain the forest-fantasy style: carved wood, brass fork caps, wrapped leather grip/pouch, luminous candy and an amber rune. Use native SVG/CSS so the weapon stays crisp during aim zoom.
- Strengthen pull feedback with layered taut bands and local charge sparks; release adds spring recoil, a short flash and candy flight streak. Fireball gets warm flame colors. Keep effects localized and honor reduced motion.
- Preserve current dimensions, pouch/anchor coordinates, aim phases, camera, 30% preview, hidden numeric values, trajectory/collision/damage, item effects and enemy response. No gameplay redesign, image generation or Azure changes.

## Targets and model
- `src/components/Slingshot.jsx`: detailed SVG materials using unique React `useId` gradient IDs; `active:boolean`, `primed:boolean`, `tension:number` remain derived from existing aim state. Launch-only visual starts at the drawn pouch; the pouch appears empty during flight.
- `src/components/ProjectileFlight.jsx`: short decorative trail follows the same sampled trajectory as the projectile, with no separate physics or combat callback.
- `src/styles/arena.css`: material/gem/charge/recoil/release styling, refined vertical power meter, reduced-motion overrides.
- No persistent/session/engine schema changes. No new RNG calls. Timers/frames continue to use the existing flight lifecycle and cleanup.

## Validation
```powershell
npm.cmd test
npm.cmd run test:e2e -- slingshot.spec.cjs accessibility.spec.cjs
npm.cmd run build
git diff --check
```
Inspect desktop charge/release screenshots and narrow/reduced-motion arena. Reuse meaningful input/collision/cancel/fullscreen checks; do not add tests that mirror SVG markup. If a separate visual probe is needed, keep it in untracked `tmp/`.

## Commit
```text
feat(game): polish enchanted slingshot and launch effects

Plan: 2026-10-21-react-first-release
Phase: P01-react-game
Task: T07-slingshot-visual-polish

Add carved wood, brass and leather materials with charge and release feedback.
Keep existing aim geometry and combat timing; trail follows the real candy path.
```

## Next
Complete this task, commit, synchronize P01/current, and restore P02-T01 without starting deployment.

## Completion and learning notes
- `Slingshot.jsx` replaces the plain strokes with outlined carved wood, grain highlights, brass fork/end caps, a stitched leather grip/pouch and a luminous rune/candy. `useId()` gives each SVG gradient a unique fragment ID so separate weapons/flights cannot share the wrong paint.
- Existing `getSlingshotDraw(...)` still drives every anchor and pouch coordinate. Tension adds localized glow/sparks; `!launching && <g className="sling-loaded-candy">` removes the loaded candy while the actual projectile is in flight. The release ring uses the drawn pouch origin, rather than the recoiled resting point.
- `ProjectileFlight.jsx` samples `pointAtDistance(flight.path, ...)` over the last 86 world units for a short gradient wake. It shows only the already-flown section, not future trajectory. The existing guarded completion callback, frame cleanup, trajectory, hit testing and damage are untouched. No new random calls or game state were introduced.
- `arena.css` adds material shadows, charge sparkle, a spring recoil/brief release ring and a brass-framed meter. Fireball uses warmer colors. Reduced-motion mode retains static charge feedback and removes trail/burst/spark animation and flight spin.
- Validation: 62/62 Node tests; 17/17 fresh-production Chrome input/accessibility regressions; standalone build and diff checks pass. Existing hit/miss, Wind, missing-matrix recovery, cancel/reload, fullscreen, duplicate-ID, 390px and reduced-motion checks remain green. No new tests mirroring SVG markup were added for this visual-only change.
- Visually inspected desktop direction/flight captures, 2×-resolution Fireball charge/flight and detailed weapon crop, plus 390px charge/flight captures in untracked `tmp/react-t07-*.jpg`. A temporary visual probe uses real mouse/Space input with test-only fixtures; no runtime errors. Dev URL still returns HTTP 200 at `http://127.0.0.1:5173/`.
- Keep the 124×142 SVG coordinate frame and arena launcher bounds intact when editing art: both aim geometry and hit sampling rely on them. Automated tests verify behavior; art appearance still needs visual review. Small-screen inventory can cover the upper fork during zoom, as in the existing HUD layout; no unrelated HUD redesign was made.
- Adjacent necessary fix: the original pouch displayed a second loaded candy throughout projectile flight; now empty until reload. Other out-of-scope findings: none. Legacy HTML, enemy animation and combat balance remain unchanged.
