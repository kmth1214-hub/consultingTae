# T03 Ambient Motion — Final Validation

Date: 2026-10-20. Implemented and verified in actual Chrome over local HTTP.

## Implementation
- Midground: two slow fog gradients (.12/.10 opacity, 24/32 seconds) and one upper-waterfall streak (.16 opacity, 2.8 seconds).
- Foreground: six fixed leaves at the outer margins, 6–12px, .4 opacity, 12–20 seconds with staggered negative delays. No particle loop or new animation frame scheduler.
- CSS animations default paused. `syncForestAmbientState()` enables them only for ready, visible forest battles with normal motion. Existing media-query and visibility listeners handle lifecycle changes.
- Ambient children animate separately from parallax wrappers. The world, road, actors and aiming coordinate formulas remain unchanged.
- Removed an accidental `ㅍㄴ` prefix found in the uncommitted resize handler at task start; it prevented inline JavaScript from parsing.

## Actual results
| Check | Result |
| --- | --- |
| Ambient suite | 34 assertions passed: effect counts and actual frame progression, four areas, screen exit/reentry, hidden/visible events, paused animation times, reduced motion, 3 widths × 3 camera views, themes. [Raw results](./ambient-suite.json). |
| Combat | Early release 5→5 ammo; completed shot 5→4 exactly once; leave during launch 4→4, idle and paused. [Results](./ambient-combat-motion.json). |
| Reduced motion during intro | Camera/frame sampler stop, cancelled intro stays stopped, restoring motion resumes only ambient. Three assertions passed. [Results](./ambient-intro.json). |
| Reduced motion before load | Injected matchMedia fixture before initialization; paused with no camera/sampler. [Results](./ambient-reduced-load.json). This tests application lifecycle, not an OS-level preference change. CSS reduce rules were inspected separately. |
| Real document hidden event | Navigating away captured hidden=true, ambient=paused, all nine effects paused, sampler=null. [Results](./ambient-hidden.json). Returning/reloading resumes ready forest motion. |
| Image failure | Temporarily renamed path.png, reloaded, observed ready=false, forest hidden, all effects paused and original illustrated PNG/road visible. Restored the exact file immediately; ready=true/running after reload. [Results](./ambient-fallback.json), [image](./ambient-fallback.png). |
| Responsive/visual | 1440×900, 760×900 iframe sizes; final 390×844 iframe (375px content width after scrollbar). Full-scene/enemy/launcher views preserve illustrated coverage; fog remains subtle and health indicators readable. Light and dark themes inspected. |
| Fullscreen | API request denied/fell back to window mode, ambient remained running. Entry/exit in actual fullscreen remains unverified. Do not infer fullscreen success from an expanded screenshot. [Results](./ambient-fullscreen.json). |
| Regressions | Protected camera, pointer mapping, aiming and projectile functions match HEAD. Bonus CSS and section markup match HEAD after line-ending normalization. Other three areas hide and pause all forest effects. |
| Errors | Final normal-load browser error log empty. Intentional missing-image run is expected to issue a 404. |

## Evidence
- [Full scene at 1440](./ambient-fit-1440.png)
- [Enemy view](./ambient-enemy-1440.png)
- [Launcher view](./ambient-launcher-1440.png)
- [Dark theme at 760](./ambient-dark-760.png)
- [Light theme at 390×844](./ambient-light-390.png)

## Reproduce
1. `node .memory/validation/2026-10-12-forest-layered-background/check-parallax.cjs` — inline scripts and protected coordinate functions pass.
2. `git diff --check` — passes.
3. `node .memory/validation/2026-10-12-forest-layered-background/serve-parallax.cjs` — existing dependency-free HTTP server, substituted for npx because package download is unavailable.
4. Open `http://127.0.0.1:4173/.memory/validation/2026-10-12-forest-layered-background/ambient-review.html`. Run ambient checks, shot checks, reduce-during-intro, reduced-load, fullscreen and view/size/theme buttons. Use a fresh reload between independent runs. The fixture suppresses automatic fullscreen requests while exercising routing; the explicit fullscreen button invokes the original API.
5. Watch exit → navigate to `ambient-exit-result.html` to capture a real visibility event.

The first combat attempt was accidentally triggered twice while asynchronous checks overlapped; its mixed result was discarded. A busy guard prevents overlap and the fresh, isolated run passed all three combat scenarios. Waits observe actual launch completion with a bounded timeout.

## Limits and adjacent issue
Actual fullscreen and OS-level reduced-motion switching still need a manual check in a browser that permits them. The pre-existing idle projectile `[hidden]`/`display:block` conflict remains visible in some screenshots and is outside this task; no gameplay change was made for it. Wrapper transforms must remain owned by parallax: future effects belong on their children.
