# Regional Scene and Studio Acceptance — 2026-10-21

## Delivered presentation

All four combat regions render five registered world-space planes: sky, distant, midground, route, and foreground. Snow, City, and Chaos each use their eight native 1536×1024 regional cutouts. Their manifest-driven panel transforms, feathered overlap, contact surface, and 24 image files passed the actual browser/pixel verifier. Forest continues to use its four existing source PNGs and shared scene lifecycle.

The T06 visual inspection caught a Forest composition regression that automated layer-presence checks could not catch: repeated narrow crops of the same trees and an artificial angular ridge dominated the center. The correction removes the ridge and repeated midground patches, places the existing 1536×1024 forest panorama once across the 3600-unit distant plane, and places its matching road artwork once beneath the registered collision geometry. This uses the original art and preserves all gameplay world coordinates. Re-inspection shows the landscape fills the wide battlefield with a natural mountain horizon and a textured path; the side huts, falls, foreground, three canonical first-round props, actors, and minimap remain visible.

## Visual evidence inspected

- Development studio overviews: `tmp/map-studio-forest-overview-1440.jpg`, `tmp/map-studio-snow-overview-1440.jpg`, `tmp/map-studio-city-overview-1440.jpg`, and `tmp/map-studio-chaos-overview-1440.jpg`.
- Forest close review after the T06 change: `tmp/map-studio-forest-revised.png`.
- Actual playable forest at `2007×1037`: `tmp/wide-t03-forest-overview-2007.jpg`; full-pull/reverse/obstacle views were also regenerated during the production browser suite.
- Studio layout checks/captures at `1440×900`, `844×390`, and `390×844`; no horizontal overflow.
- Snow, City, and Chaos were inspected assembled and in gameplay through overview, weak/vertical/reverse/strong pull, obstacle and contact paths, and responsive captures. Their new art has strong theme separation and aligned route surfaces. Remaining outer checkerboard belongs to intentionally transparent planes and is the studio's backing, not missing/failed image data.

## Validation evidence

| Check | Result | Scope |
| --- | --- | --- |
| `node scripts/verify-region-art.cjs all` | 24/24 passed; 36,015,499 bytes | Native dimensions, alpha, registration, and route baseline for Snow/City/Chaos |
| `npm.cmd test` | 85/85 passed | Engine, session, shot, camera, parallax, and studio-camera unit coverage |
| `npm.cmd run test:e2e -- --reporter=line` | 71/71 passed | Fresh production build, four-region art/camera, shots/collision, items, enemy response, progression, viewports, reduced motion, and production studio exclusion; zero retries |
| `npm.cmd run test:studio -- --reporter=line` | 8/8 passed | Development link, all maps/layers, camera, input cancellation, no profile/session writes, and desktop/short/narrow layout; zero retries |
| `npm.cmd run build` | passed | Final production bundle |
| `node scripts/verify-studio-build.cjs` | passed; 5 emitted HTML/JS/CSS files inspected | No studio UI, CSS, camera helper, or test fixture in production output |
| `git diff --check` | passed | No whitespace errors |

Both `/__dev/maps` and `/__dev/maps/` were exercised. Actual Chrome verified the live development URL: `http://127.0.0.1:5173/__dev/maps`. This page is a local development inspection screen, not an authenticated administrator role. Production deep links show an unavailable screen and do not mount a player session; query/hash variants cannot enable the tool.

## Limits and handoff

- The headless browser cannot make `document.hidden` true by switching pages. Existing cancellation coverage dispatches `visibilitychange` after setting a test-only hidden value, while separate real browser tests cover blur/focus, reduced motion, and other pointer cleanup. This is not proof of a physically backgrounded browser tab; browser-hidden lifecycle remains an explicit test limitation.
- The selected cookie and cookie-centered incoming hit/shield/heal feedback are still pending in the queued Wide Combat T04. This review deliberately does not claim those actors exist.
- Designated Entra administrator authentication remains deferred to Azure deployment configuration. The development studio URL is not access control.
- `sites/` and `tmp/` remain untracked user/work outputs; screenshots and probes were not staged.

## Handoff

Regional layered scenes, parallax/lifecycle, read-only minimap, development studio, and production exclusion are complete. Resume [Wide Combat P01-T04 — Selected Cookie and Player Hit Feedback](../phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/T04-player-cookie-feedback.md), preserving the shared `applyScenePose` call and existing combat resolution.
