# Plan: Regional Layered World and Development Map Studio

- Date: 2026-10-21
- Status: in_progress (4/6 tasks done; active P01-T05; T04 shared scene/depth/minimap completed in the Korean T04 commit; T03 Chaos artwork completed as1cee22f, T02 City as86432cc, T01 Snow as82751e8)
- Decisions: [Confirmed scope](../decisions/2026-10-21-regional-layered-world-and-map-studio.md)

## Goal
Give Snow, City and Chaos dedicated side-view painted scenery matching Forest, restore restrained parallax/environment motion across all four regions, and provide a separate development-only map review screen. Preserve the3600×1200 battlefield and all proven gameplay. Deliver a verified local review link after implementation, without claiming authenticated production administration.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Produce regional layers, integrate one shared scene/camera presentation, and validate a development map studio. | [P01](../phases/2026-10-21-regional-layered-world-and-map-studio/P01-regional-scenes/phase.md) |

## Task sequence
| Task | Result | Main files |
| :--- | :--- | :--- |
| T01 | Snow west/east distant, midground, path and foreground art, native metadata, alpha/registration review tooling. | `assets/maps/snow-layers/`, `scripts/verify-region-art.cjs` |
| T02 | City equivalent artwork and review. | `assets/maps/city-layers/` |
| T03 | Chaos equivalent artwork and review. | `assets/maps/chaos-layers/` |
| T04 | Shared five-layer runtime, dedicated art, decorative parallax, environment lifecycle and read-only player minimap. | `sceneCatalog.js`, `sceneParallax.js`, `useBattlefieldCamera.js`, backdrop/atmosphere/minimap components, CSS and relevant tests |
| T05 | Separate development-only map studio and explicit production exclusion. | `src/main.jsx`, `src/dev/`, separate studio browser config/tests |
| T06 | Cross-region visual/gameplay/production-boundary acceptance; hand back to existing cookie task. | scene/studio regressions, asset-review record, memory dashboards |

One Phase is sufficient: these are connected scene-presentation assets and their review UI, with no external integration milestone. Each art region can be reviewed/committed independently without changing the live game. Shared runtime and camera changes stay together so partially migrated decorative coordinates cannot drift. The studio then consumes that exact runtime scene rather than a second renderer. T06 validates the completed composition and access boundary; it does not replace the later cookie/full-game tasks.

## Art and composition contract
- New art is required; flat source-map crops/native geometric continuation are not final substitutes. Keep existing originals and Forest PNGs unchanged.
- Each new region supplies8 PNGs: `{distant,midground,path,foreground}-{west,east}.png`, plus `layers.json`. Two distinct3:2 side-view panels per layer avoid repeating a whole landmark along the wide field. Prefer native1536×1024; accept larger native3:2 outputs and record real dimensions. Do not stretch or programmatically fabricate transparency.
- Map each panel proportionally at worldwidth2700. West x−600, east x1500, overlapping600 with native thematic underpaint/feathering. Worldheight=2700*sourceHeight/sourceWidth; y=900−.75*worldheight. The common source contact registration is75% of canvas height. New metadata explicitly records actual dimensions, baselineRatio .75 and panel placement.
- Opaque distant art; genuinely transparent midground/path/foreground. Midground avoids the playable lane. Path has a level surface/contact line, matching edge and cross-section. Foreground remains below world1010 after fixed clipping, aside from narrow outermost edges that cannot cover actors. Leave x40..450/y720..940 clear.
- Generate/edit artwork using the available imagegen skill/tool during execution. Inspect references before edits, use real transparency, and inspect every layer on contrasting backgrounds plus an assembled preview. No image generation now. No new package dependency.

## Shared runtime constraints
- Five outer world-aligned SVG siblings: sky0, distant0, midground1, route2, foreground5. Gameplay props3, preview6, actors7, launcher8, attacks9 retain their geometry/order.
- Only inner decorative depth planes move. Ground/path, registered solids, sprites and trajectory remain in the canonical world. Extend the existing camera apply operation; no second gameplay camera/RAF.
- Forest retains its existing composition/art adapter; all areas share depth/activity policy. Ambient effects are restrained, noninteractive and paused while hidden. Reduced motion is static.
- Replace obsolete decorative-transform equality assumptions with explicit parallax tests; keep gameplay screen matrices and collision outcomes exact.

## Studio and deployment boundary
- Planned development URL: `http://127.0.0.1:5173/__dev/maps` (not implemented/verified yet).
- Exact pathname entry gated by `import.meta.env.DEV`, lazy dev module. Production shows a generic unavailable page at that path; no studio UI/module/fixture in output. No router/auth/backend dependency.
- Map selector, pan/zoom/reset, five layer visibility controls, environment pause. Scene and real registered prop rendering are reused; no combat/session/profile mutation or enemy/item editor.
- Local development access is not an authenticated administrator role. At the later explicitly requested Azure step, designated Entra administrator identities/roles require host/server-enforced authorization. Corporate membership alone is insufficient. No Azure work/secrets here.
- Vite `publicDir:false` is currently set; keep it. Default production Chrome tests use4180; studio tests use a separate dev4181 configuration. Leave existing4173/5173 services running.

## Reconcile existing tasks
- [Wide Combat](./2026-10-21-wide-battlefield-mouse-drag.md) remains3/5 completed: T01 c49d8c9, T02 c7c63df, T03 455990b. Its T04 selected-cookie task is queued, not completed or deleted; T05 final gameplay review remains pending.
- This plan takes the active pointer because the user explicitly requested this visual/studio plan. After T06 completion, restore the pointer to [existing T04](../phases/2026-10-21-wide-battlefield-mouse-drag/P01-wide-combat/T04-player-cookie-feedback.md), then its original T05.
- Preserve exact cookie reservation and existing incoming-attack behavior until T04 migrates ownership. Do not quietly implement the cookie or mark full game release complete here.
- Old T04/T05 receive dependency notes only. Historical completion commits/counts remain unchanged. Azure stays a separate explicit project step.

## Validation / completion policy
- Asset CLI verifies actual browser-decoded PNG dimensions/transparency/registration; human inspection verifies art style, perspective, seams and quality. Metrics alone do not approve images.
- `npm.cmd test`; affected/full production `npm.cmd run test:e2e` on4180; `npm.cmd run test:studio` on4181 after T05; standalone build/diff checks.
- Verify all areas at2007×1037,2560×1080,1440×900,844×390,390×844, normal/reduced motion; inspect entrance/middle/far follow and obstacle/Wind/reverse/enemy feedback.
- Production boundary: actual browser negative route case plus emitted chunk/import checks. Development UI tests must not accidentally run against Vite preview.
- Each Task: task done → prescribed implementation/art+task commit → phase/plan/current sync → next pointer. Keep sites/tmp/build/test artifacts out of commits. Final T06 restores Wide Combat T04.
- Planning was documentation-only. Subsequent T01 completed Snow assets/verifier/review as82751e8; T02 completed City assets/review as86432cc; T03 completed Chaos assets/review as1cee22f. All 24 new regional images passed browser-decoded asset checks and the production build. T04 now includes the compact gameplay minimap requested in this conversation: player/launcher, remaining enemies, blockers and camera viewport, with no trajectory/landing hint and no independent camera. Runtime/studio work remains pending. Adjacent unrequested code findings: none; Forest motion gap and test migration are already confirmed scope.
