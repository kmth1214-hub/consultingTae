# Task: T05 Development-only Map Studio

## Status: in_progress

## Goal
Provide a distinct development review page where all four real runtime maps can be selected, panned, zoomed and inspected by layer, and prove that the ordinary production build exposes no studio interface or module.

## Decision Summary
- Prerequisite: T04 supplies the shared painted BattlefieldBackdrop, visibility/pause props and `applyScenePose` presentation API. This task reuses it, not a second map renderer.
- The user chose local development-only review now, with designated Entra administrator authorization deferred to Azure release. A dev URL is not authentication. No account/role/backend setup here.
- Use an exact pathname and Vite DEV compile-time gate with a lazy module; no router or new package dependency. Do not mount a game session in the review page.

## Implementation

### I01. Exact development entry and production unavailable state
- Related Files:
  - `src/main.jsx` :: root entry selection; modify
  - `src/dev/MapStudio.jsx` :: default `MapStudio`; new lazy development-only module
  - `src/dev/mapStudio.css`; new, imported only by MapStudio
  - `src/App.jsx`, `src/game/{useGameSession,gameSession,profileStore}.js`; read-only player app/state
  - `vite.config.js`; read-only, retain publicDir:false

#### Details
```typescript
type StudioPath='/__dev/maps'|'/__dev/maps/';
// Entry contract (not a runtime role check):
// exactStudioPath && import.meta.env.DEV -> lazy import('./dev/MapStudio.jsx')
// exactStudioPath && !DEV -> generic unavailable page, no App/session mount
// all ordinary existing app paths -> current App
```
- Determine pathname using window.location.pathname, matching ONLY the two paths above. Query/hash/localStorage cannot enable the studio at root or in production. Do not use `VITE_ENABLE_ADMIN`, `?admin=true`, a hard-coded password or a secret URL as authorization.
- Preserve current root existence check, React.StrictMode and ordinary App rendering. In the DEV branch lazy import MapStudio (React.lazy/Suspense) with a concise loading state and an error boundary that offers reload/back to game if the module fails. No eager static import of the studio, its CSS, fixture or camera modules from production entry/App/shared scene files.
- Production exact studio path renders a small accessible generic “페이지를 찾을 수 없습니다” with “게임으로 돌아가기” link to `/`. Do not instantiate useGameSession/createRunState to show this. Vite preview's SPA fallback may return HTTP200; test the unavailable UI/module exclusion rather than falsely requiring a server404 that this app does not implement.
- Studio header is clearly “개발용 맵 검토”, with short text that this is a development view and an ordinary “게임으로 돌아가기” link. Do not label it as authenticated “최상위 관리자” access. Use a unique dev-only marker `regional-map-studio-v1` in the studio root for bundle/route tests; no production screen contains it.
- Planned local link is `http://127.0.0.1:5173/__dev/maps`; verify it at completion before reporting as working. Keep existing5173/4173 servers intact. If the known dev service is unavailable, launch a task-owned loopback server, record its actual port, and do not claim a stale link works.

### I02. Shared scene preview with map/layer/environment controls
- Related Files:
  - `src/dev/MapStudio.jsx` :: `MapStudio`, `StudioViewport`; new
  - `src/dev/mapStudio.css`; new layout
  - `src/components/{BattlefieldBackdrop,ArenaScenery}.jsx`, `src/game/{gameData,battlefieldModel,sceneCatalog,sceneParallax}.js`; read-only reuse

#### Details
```typescript
type StudioState={area:'forest'|'snow'|'city'|'chaos';
  visibleLayers:Record<'sky'|'distant'|'midground'|'route'|'foreground',boolean>;
  motionPaused:boolean;zoom:number;center:{x:number;y:number}};
// Defaults: area forest, all layers true, motionPaused false, zoom1, reset center.
```
- View consists of an outside control panel/header and a large preview viewport. Map select uses existing REGIONS names/order Forest/Snow/City/Chaos. Show five named checkboxes (“하늘”, “원경”, “중경”, “길”, “전경”), pause/resume button, zoom controls and “전체 보기” reset. Every control has a semantic label, keyboard operation and visible focus; selected map and zoom are announced without per-frame live-region chatter.
- Scene preview mounts one `.arena-world` with the actual3600×1200 layout and BattlefieldBackdrop; pass visibleLayers/motionPaused, and reuse applyScenePose. Reuse ArenaScenery for registered solid painting on the same fixed world transform. A neutral checker/solid stage backing makes intentionally hidden sky/ground layers inspectable without confusing it with a loading failure.
- For canonical round1 prop geometry call buildBattlefield({area,round:1,enemies:[{id:'studio-reference-target',kind:'snake',isBoss:false}]}). This id only provides the same single-enemy obstacle placement used by a real round; do not render/attack that synthetic enemy or import battle-engine fixtures. The tool reviews scenery and existing props; it has no enemy editor or playable combat. Region identity is the same passed to the shared renderer/model.
- Do not mount BattleArena/useAimController/gameSession, call createRunState/resolveProjectile, write localStorage/profile, unlock cookies or grant items. No production `__gameTest`/test-fixture import. Original player's run cannot be modified by map review.
- Map switch resets center/zoom to full-scene and cancels pointer capture, retains the user's layer visibility/pause preferences. No hidden extra scene trees. Layer controls hide only selected scenery root (via display/visibility), not props or camera geometry; route hiding deliberately reveals the backing, not new gameplay behavior.
- Keep controls outside pointer/wheel pan area; scrolling a control panel must not zoom the preview. Preview's height fills remaining space on desktop. At390px stack controls compactly above preview, with normal control-panel scrolling if needed and no horizontal overflow. Focused viewport is a named role=group, not an unlabelled canvas. Return to game is ordinary navigation with fresh player flow, no stale studio animation/capture.

### I03. Free pan/zoom with shared transforms and safe cleanup
- Related Files:
  - `src/dev/mapStudioCamera.js` :: `getStudioPose`, `panStudio`, `zoomStudioAt`; new pure helpers, dev-only import
  - `src/dev/MapStudio.jsx`; pointer/keyboard/ResizeObserver handlers
  - `tests/map-studio-camera.test.mjs`; new meaningful coordinate tests
  - `src/game/{battlefieldCamera,sceneParallax}.js`; reuse screenToWorld/worldToScreen/applyScenePose, read-only

#### Details
```typescript
type Vec2={x:number;y:number};
type Viewport={width:number;height:number};
type StudioCamera={zoom:number;center:Vec2};
getStudioPose({viewport,camera}:{viewport:Viewport;camera:StudioCamera}):
  null|{x:number;y:number;scale:number};
panStudio({camera,viewport,delta}:{camera:StudioCamera;viewport:Viewport;delta:Vec2}):StudioCamera;
zoomStudioAt({camera,viewport,nextZoom,point}:
  {camera:StudioCamera;viewport:Viewport;nextZoom:number;point:Vec2}):StudioCamera;
```
- Reset is center(1800,600), zoom1. Fit scale=min(vw/3600,vh/1200); actual scale=fit*clamp(zoom,1,6), world maps uniformly, translation=(vw/2−cx*scale,vh/2−cy*scale). Invalid/nonfinite viewport produces null, suppresses pointer/zoom and waits for a valid ResizeObserver measure rather than emitting NaN transforms.
- Clamp view center to the painted inspection bounds x−600..4200/y−1200..1800 with half-visible-extent margins; when the viewport exceeds an axis's bounds, center that axis. The reset view must show all3600×1200. These clamps belong only to studio camera; never change getCameraPose gameplay framing.
- Pointer pan is primary mouse-down in preview, capture pointer, snapshot starting camera and CSS viewport point. Movement delta is screen pixels; center=startCenter−delta/scale, clamped. Do not rebase on every camera update, turn a click into shooting or drag a browser image. Release/cancel/lost capture/blur/hidden/region change/unmount safely clears the drag; release capture only if owned.
- Wheel in preview is non-passive/preventDefault only there. nextZoom=clamp(zoom*exp(−deltaY*.0015),1,6). Convert client coordinates through viewport rect to a relative point; preserve world point under cursor: before=screenToWorld(point,oldPose), newCenter=before+(viewportCenter−point)/nextScale, then clamp. Zoom buttons/range use viewport center. Controls use1..6 in.1 steps; exact zoom is allowed in a development review UI, never copied to player power/angle HUD.
- Focused viewport keyboard: arrows pan120/zoom world units (ArrowRight moves view center right), +/− change zoom by.25 at center, Home/0 reset. Prevent default only for handled keys on the viewport, never from select/input/checkbox editing. No interval-driven pan or continuous RAF; pointer events/ResizeObserver update the presentation pose. Reuse applyScenePose for actual scene offset vars and camera-scale. Reduced motion disables atmosphere/parallax but still permits deliberate manual viewport pan/zoom; no automatic easing.
- Tests independently prove cursor-anchor preservation before clamping, uniform inverse matrices, drag direction and fixed origin, zoom limits, reset visibility, invalid inputs and extreme aspect-ratio clamps. No unit test that merely copies class/style generation.

### I04. Separate development browser suite and production exclusion proof
- Related Files:
  - `playwright.studio.config.cjs`; new
  - `tests/studio-e2e/map-studio.spec.cjs`; new dev-only UI suite
  - `tests/e2e/studio-exclusion.spec.cjs`; new ordinary production negative cases
  - `scripts/verify-studio-build.cjs`; new emitted-output inspection
  - `package.json`; add test:studio script only, no dependency/lockfile churn
  - `tests/e2e/support.cjs`; reuse browserHealth fixture, no production import

#### Details
- Add `test:studio: playwright test --config playwright.studio.config.cjs`. Separate config testDir tests/studio-e2e, channel chrome, one worker, no retries, same trace/failure screenshots/health diagnostics; baseURL127.0.0.1:4181. webServer uses npm.cmd on Windows (`npm` elsewhere) `run dev -- --host 127.0.0.1 --port 4181 --strictPort`, reuseExistingServer:false. Do not put dev-positive tests in default tests/e2e, which runs production preview4180.
- Studio tests must not call installGame/start or mutate engine/profile. Verify direct route/trailing slash, ordinary root unchanged, map switching correct actual painted assets, pan and cursor-anchored zoom/reset across wide/portrait/short viewports, all five toggles, pause/reduced/hidden/unmount behavior, focus/keyboard use and no capture leak after map switch/back navigation. Check no profile/localStorage change and no BattleEngine action. Keep actual image/console errors fatal.
- Compare preview with a production-game capture at matching area/viewport/pose for scene features, allowing the studio controls/backing/absent combat actors. It must use the same PNG hrefs, source dimensions and depth factors. Test no duplicate paint IDs after repeated region changes, no clipped controls or horizontal overflow.
- Production spec on default4180: `/__dev/maps` and trailing slash show generic unavailable screen, never the studio marker/controls; root with ?admin=true, ?studio=true and #/__dev/maps stays ordinary game. No studio chunks requested. Browser refresh/deep link cannot enable it. Assert unavailable page creates no game run and has working return link; a normal root play flow still works.
- `node scripts/verify-studio-build.cjs` reads current dist output (requires a successful fresh build), inspects emitted JS/CSS and imports/filenames, and exits nonzero if the dev-only root marker, MapStudio module/chunk/CSS identity, studio-only fixtures or `__gameTest` appear. Do not reject the route pathname string needed by the generic unavailable screen or shared painted assets legitimately used by gameplay. This checker validates build exclusion, not authentication.
- Script must not build silently, scan secrets or modify dist. Missing dist is a clear failure. Report inspected file counts/results. A failed exclusion blocks Task completion; don't merely hide the menu or disable the assertion.
- Manually inspect `tmp/map-studio-{area}-{state}-{width}.jpg` and verify the actual development link. No generated screenshots/probes or fixtures staged as production.

## Acceptance Criteria
- [ ] Development route presents a clearly separate usable four-map/layer/environment review screen.
- [ ] Pan/zoom/reset preserves proportions, cursor anchors and bounds; controls/capture/cleanup are reliable.
- [ ] Shared runtime art/props/depth are shown without starting or modifying a game session/profile.
- [ ] Production deep link fails closed to generic unavailable UI; dev module/UI/CSS/fixtures are absent from built output.
- [ ] Desktop/narrow/short/reduced-motion and keyboard/browser-health checks pass; verified local URL recorded.

## Validation
- `node --test tests/map-studio-camera.test.mjs tests/scene-parallax.test.mjs` — camera/coordinate behavior passes.
- `npm.cmd test` — full Node suite passes.
- `npm.cmd run test:studio` — actual Chrome dev suite on4181 passes, no retries/runtime/asset errors.
- `npm.cmd run test:e2e -- studio-exclusion.spec.cjs game-launch.spec.cjs accessibility.spec.cjs` — actual fresh-production negative route and unaffected player flow pass on4180.
- `npm.cmd run build`, then `node scripts/verify-studio-build.cjs`, then `git diff --check` — clean production exclusion and build.
- Verify development URL with real browser and inspect all four map controls/captures; record the exact working link and the development-only limitation. Keep4173/5173 untouched.

## Commit Message
```text
feat(dev): add isolated regional map inspection studio

Plan: 2026-10-21-regional-layered-world-and-map-studio
Phase: P01-regional-scenes
Task: T05-development-map-studio

- Reuse real scenes with map, camera, layer and atmosphere review controls.
- Exclude the development studio from production and verify both entry boundaries.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After prescribed implementation/task commit and phase/plan/current sync, advance to `T06-regional-review-and-handoff.md`. No authenticated admin/deployment or cookie migration here.
