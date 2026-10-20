# Task T02: Monster Idle Motion

## Status
done

## Objective
Give the new regular-battle illustrations a quiet breathing idle that adds life without shifting their layout or fighting the camera transforms, and honor reduced-motion preferences.

## Dependencies
T01 must be complete so animation targets the final `.monster-art` nodes.

## Files and Symbols
- `cookie-roguelike-mockup.html`: `.monster-art` styles, monster idle keyframes, and `@media (prefers-reduced-motion: reduce)`.

## Behavior Contract
- Animate only `.monster-art`, never `.monster`, `#enemyGroup`, `.arena-world`, or a forest layer. This preserves positions, health badge placement, and camera/parallax transforms.
- Use a slow, restrained breathing loop (approximately 2.8–3.4 seconds) with a very small scale change (no more than about 1.5%); avoid abrupt translation, rotation, flashing, or large opacity changes.
- Add modest per-character phase offsets so the three enemies do not breathe in lockstep. Both boars retain identical artwork.
- In `@media (prefers-reduced-motion: reduce)`, explicitly stop the monster-art animation. No JavaScript state or matchMedia listener is required for this CSS-only behavior.

## Acceptance Criteria
- In normal motion mode the three sprites have a barely noticeable breathing loop without parent-box movement or health-badge jitter.
- With reduced motion enabled, the sprites remain fully visible and still; forest/camera geometry and item effects are unaffected.

## Verification
- `git diff --check`
- In Chrome, compare the battle scene with normal motion and emulated `prefers-reduced-motion: reduce`; verify animation stops and the art stays visible.

## Execution Notes
- Passed `git diff --check`. The keyframe targets only `.monster-art` and scales by 1.2%; the parent monster boxes and health badges remain unanimated. A dedicated reduced-motion rule disables the animation.
- Browser motion/reduced-motion comparison remains unverified because local-page navigation is blocked by the browser security policy.

## Commit
`Plan: 2026-10-20-monster-visual-refresh — T02 add reduced-motion-aware idle`
