# Catapult Shot Tension — Validation

Date: 2026-10-20

## Browser run

Chrome desktop, local HTTP (`?preview=1`). The review harness is [aim-review.html](./aim-review.html); it exercises the real battle screen functions and displays measured path data above the embedded game.

- Preview geometry: visible path `M 385 484 Q 483.04 409.699 560.956 379.979`; full hidden geometry ends at `(815, 484)`. The visible endpoint matches the quadratic at `t = 0.30`; stroke is `rgba(255,255,255,.22)`. Measured path lengths in the sample were 205.06 and 517.95 respectively.
- Full launch: during flight, the visible path was empty, hidden geometry retained the complete curve, the projectile sprite was visible, and the camera reached the 1.35× launcher framing. The shot completed and ammunition changed from 5 to 4. After camera return, both paths were empty, the sprite was hidden, aim was idle, and world fit was `matrix(0.416667, 0, 0, 0.416667, 0, 31.125)`.
- Early release and pointer cancellation: aim reset to idle, both paths and sprite cleared, ammunition stayed at 5, and camera remained at fit.
- Battle exit: aim and projectile visuals cleared and the battle screen hid. Chrome denied fullscreen in this preview context; the existing window-mode fallback remained usable.
- Target reachability regression: keeping 1.35× zoom during pointer target selection clipped the world range before the enemies. Camera zoom now begins after the release has selected its world target and stays through flight. A release at 86% of the arena selected `x=1631`, beyond the sample enemy center at `x=1488`, while flight still used the close-up.
- Resize during flight kept the hidden geometry intact. Browser console reported no errors.

## Checks

- All inline application scripts parsed with Node `vm.Script`.
- Validation harness script parsed with Node `vm.Script`.
- `git diff --check` passed.
- The preview and complete shot were visually inspected in the browser; the screenshot is included with the completion response.

Reduced-motion and mobile viewport behavior were not exercised in this browser session. Their code paths preserve fit under the reduced-motion media query and reuse the same scene coordinate system; treat those two environments as unverified.
