# T02 Camera Parallax Validation

- Validated: 2026-10-14 (Asia/Seoul)
- Plan: 2026-10-12-forest-layered-background

## Implementation
- Existing world camera remains the only gameplay camera. `updateForestParallax` reads its actual DOMMatrixReadOnly values, then compensates scenery transforms so the distant/middle/foreground camera movement factors are0.18/0.50/1.08.
- Camera/aim coordinates, path, actor positions, world dimensions and all four artwork assets are preserved. The foreground is still a direct world child in front of the path; trajectory and projectile remain above decoration.
- Artwork and feather masks moved to ::before while the decorative wrapper uses origin0/0. The distant image retains overscan; transparent images retain the world-sized composition within overscan.
- Sampling uses one requestAnimationFrame chain only while a visible, ready forest camera is moving. Cancellation freezes the actual rendered camera transform before cancelling WAAPI, preventing a jump back to stale inline style. A superseded animation cannot finalize or cancel its replacement.
- Battle exit now cancels intro even when entering reward/other gameplay screens. A navigation generation prevents delayed fullscreen callbacks from starting an obsolete intro. Blur/hidden invalidates both intro and pending screen navigation. Visible/focus refresh uses existing `fitArenaWorld` without replaying intro.
- `forestMotionQuery` and its change listener now exist in T02; T03 must extend them for ambient state rather than registering a duplicate camera lifecycle.

## Commands and Reproduction
- `node .memory/validation/2026-10-12-forest-layered-background/check-parallax.cjs`: passed JS syntax and comparison of protected camera coordinate/aim functions against pre-task HEAD.
- `git diff --check`: passed.
- The blueprint's npx server could not run in this environment: npx.ps1 is blocked by PowerShell execution policy; npx.cmd --offline had no cached http-server package. No policy/settings change or dependency installation was made. Used Node's built-in HTTP server on127.0.0.1:4173 instead. A reproducible equivalent is `node .memory/validation/2026-10-12-forest-layered-background/serve-parallax.cjs`.
- Open `http://127.0.0.1:4173/.memory/validation/2026-10-12-forest-layered-background/parallax-review.html`. Review fixture embeds the actual mockup, exposes test controls outside the product, and uses fixed iframe widths rather than altering the user's browser viewport.

## Browser Results
- Final camera suite:16/16 assertions passed. [Raw final results](./parallax-suite-final.json).
- Fit produces identity-equivalent scenery transforms (rounding residual translations below0.001px).
- At enemy focus, effective scales differ by depth: distant≈0.58479, middle≈0.88341, foreground≈1.42466 while gameplay scale=1.35.
- Cancellation preserves the current computed frame and releases both handles. Previous-animation completion preserves the new camera/sampler. Battle→reward, rapid reentry, forest→snow→forest, blur/focus and reduced-motion camera branches pass.
- The first rapid-reentry check used a fixed3.4s wait and timed out with variable fullscreen/browser scheduling. The fixture now waits for actual fit/null-handle state with a bounded6s deadline after400ms, then asserts the final state. The production code was not altered to hide this timing failure. Final suite passed. The earlier raw coverage file retains that superseded timing result for transparency.
- All9 coverage checks passed:1440/760/390px × enemy/launcher/fit. They use actual transformed DOM rectangle bounds of the opaque distant layer and its40% overscan to verify it covers every arena edge. [Coverage run](./parallax-coverage.json).
- Actual visibility lifecycle: navigating away while the camera moved produced `hidden:true,camera:true,frame:null` (camera=true means cameraAnimation was null). The fixture persisted this event briefly to its own localStorage test key; the result page immediately removes that key. [Actual hidden event](./parallax-hidden-event.json). Opening a separate browser window did not hide the original document, so that attempt is not claimed as a hidden-tab test.
- Synthetic PointerEvents plus Space KeyboardEvents into the existing real-page handlers generated a trajectory and completed a projectile animation, ammo5→4, phase returned idle. [Initial suite plus shot](./parallax-suite.json); [final shot result](./parallax-shot-final.json). A repeated shot check with a fixed900ms wait failed before the browser finished the animation; the fixture now waits for actual launching completion with a bounded deadline. That corrected check passed without changing gameplay code. The superseded fixed-delay result is preserved in parallax-shot-fixed-delay.json.
- Other areas clear decorative transforms and sampling while using their original backgrounds/road. The forest resumes sampling if an existing camera is active when returning.

## Visual Evidence and Limits
- [Fit composition](./parallax-fit-visible.png), [enemy focus](./parallax-enemy-visible.png), [launcher focus](./parallax-launcher-visible.png): actual browser captures. Scenery has no uncovered arena edges; actors/health numbers remain legible; path stays between middle and foreground layers.
- Fullscreen request returned false with the existing window-mode fallback. Actual fullscreen success was not verified; resize/fullscreen handlers reuse the existing fit path, and three fixed scene widths were verified.
- Reduced motion was tested by temporarily substituting the fixture's query value; no OS preference was changed. The native query/listener remains in production.
- Explicit CDP clipped capture timed out; the native browser capture succeeded and was saved. No generated illustration or reconstructed screenshot stands in for the browser evidence.

## Existing Adjacent Issue
The already reported idle projectile hidden/display override remains outside T02 and was not changed. No new unrelated feature or gameplay rule was added.
