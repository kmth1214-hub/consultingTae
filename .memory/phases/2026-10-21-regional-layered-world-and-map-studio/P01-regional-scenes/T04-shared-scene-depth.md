# Task: T04 Shared Painted Scene, Parallax and Environment

## Status: pending

## Goal
Replace Snow/City/Chaos flat-map crop compositions with their accepted dedicated layers and make all four regions share restrained camera-driven depth and ambient life, with every gameplay coordinate unchanged.

## Decision Summary
- Prerequisites: T01–T03 delivered eight accepted PNGs and version1 layers.json for each new region, plus the reusable browser asset verifier. Forest's existing four PNGs stay unchanged.
- Five outer SVG siblings remain world-aligned. Only inner decorative planes move; route/solids/actors/preview never acquire depth offsets. One existing camera apply operation drives presentation. No competing game camera, package, combat or density change.
- Existing Wide Combat T04 cookie actor is still queued. Reserve its x44,y748,152×152 space, but do not add the actor or redirect attacks in this task.

## Implementation

### I01. Typed-by-contract scene catalog and shared composition
- Related Files:
  - `src/game/sceneCatalog.js` :: `SCENE_PROFILES`, `getSceneProfile`; new
  - `src/game/assetCatalog.js` :: add `regionLayers`; modify, keep maps/forestLayers/characters/items/monsters
  - `assets/maps/{snow,city,chaos}-layers/layers.json` and eight PNGs each; read-only accepted assets
  - `src/components/BattlefieldBackdrop.jsx` :: `BattlefieldBackdrop`; modify
  - `src/components/SceneArt.jsx` :: `PanoramaLayer`, proportional image/alpha masks; new
  - `src/components/ForestLayerContent.jsx` :: preserve existing Forest layer content; new extraction
  - `src/styles/arena.css`; modify
  - `src/components/{ArenaScenery,BattleArena,TrajectoryPreview,Slingshot,MonsterGroup,EnemyResponse,ProjectileFlight}.jsx`; read-only geometry consumers (BattleArena may only pass explicit backdrop presentation props if needed)

#### Details
```typescript
type Area='forest'|'snow'|'city'|'chaos';
type SceneLayer='sky'|'distant'|'midground'|'route'|'foreground';
type PaintedRole='distant'|'midground'|'path'|'foreground';
type Panel={href:string;x:number;width:number;height:number;y:number;
  sourceWidth:number;sourceHeight:number;side:'west'|'east'};
type SceneProfile={area:Area;renderer:'forest'|'panorama';
  palette:{sky:string;horizon:string;bank:string;ground:string;lane:string;light:string;dark:string};
  panels:null|Record<PaintedRole,Panel[]>};
getSceneProfile(area:Area):SceneProfile; // invalid area -> TypeError
BattlefieldBackdrop({area,layout,visibleLayers,motionPaused=false});
// visibleLayers?: Partial<Record<SceneLayer,boolean>>, omitted -> all true
PanoramaLayer({role,panels,idPrefix});
```
- `ASSETS.regionLayers` is frozen, keyed snow/city/chaos, then distant/midground/path/foreground, then west/east URLs. Use explicit static PNG imports so Vite hashes/copies assets correctly; no concatenated public filesystem paths, glob fallback or duplicate legacy-map copies. Import the small JSON metadata to compute native proportions; no persistent run fields.
- Catalog palettes start from current THEMES: Forest sky#72d5d3/horizon#f0efbd; Snow#91badf/#edf5ff; City#654a75/#f5c798; Chaos#23214d/#b598e7. Preserve current bank/lane colors initially, then calibrate to accepted painted edges in screenshots. Final palette values recorded in task notes; palette is presentation, not balance.
- Each new role has west/east panels from metadata: x−600/1500, width2700, height=2700*sourceHeight/sourceWidth, y=900−.75*height. Never stretch width/height independently; use source-native SVG viewBox and preserveAspectRatio="xMidYMid meet". Reject missing/invalid manifest shape during catalog initialization with a clear error rather than silently returning geometric placeholders.
- Preserve five SVG siblings directly inside `.arena-world`, viewBox0 0 3600 1200, `data-scene-layer` and `data-scene-area`, aria-hidden and pointer-events:none. Outer sibling screen matrices remain canonical; inside each use a `g[data-depth-plane={layer}]` for decorative translation. Route plane never translates. Keep unique useId gradients/masks/clip IDs across region changes/StrictMode.
- Put shared fills/definitions in a fixed inner group; moving art lives in its own plane. Sky fill covers x−5000..8600/y−5000..900, matching ground extends down to5000. Distant art backs onto matching sky, not an exposed rectangle. Midground is clipped at worldy820 outside its moving plane. Route is a continuous opaque underpaint centered900 (>=110 thick), overlaid by painted path surface/cross-section; it stays fixed at z2 and covers lower ground.
- Source panels overlap600 units. Feather west's last120 units and east's first240 units with alpha masks; keep a matching native underpaint (opaque for sky/road) so the overlap cannot expose a hole. Major landmarks were kept out of this overlap during asset acceptance. Inspect actual edges while panning; regenerate a bad art edge rather than hiding it with a frame/blur/recolored flat map. No duplicated whole poster.
- Foreground has a fixed OUTER clip, with its moving plane inside: visible below world1010, optionally x<=36 or x>=3564 at scene edges; reserved player/weapon x40..450/y720..940 always excluded. Do not translate the clip with the art. Keep decorations clear of registered obstacle tops and the early preview. No extra solid-looking logs/crates/ice in the candy lane.
- Forest renderer extracts existing Forest-only SVG paint/patches/foliage/water from BattlefieldBackdrop into ForestLayerContent, keeping its current appearance/PNG dimensions. Remove obsolete non-Forest crop/native-postcard branches once new panels are live; do not delete shared prop material painting or original source PNGs. The Forest path remains a fixed painted lane, with its existing bank textures and continuous underpaint.
- Only render image nodes for the current area. Static URL imports may be emitted, but switching maps should not keep three hidden scene trees alive or download every region's imagery at initial home display. Asset errors still fail browser validation.

### I02. Pure decorative offsets driven by the existing camera
- Related Files:
  - `src/game/sceneParallax.js` :: `getSceneOffsets`, `applyScenePose`; new
  - `src/game/useBattlefieldCamera.js` :: existing `apply(pose)`; modify
  - `tests/scene-parallax.test.mjs`; new behavioral math tests
  - `src/styles/arena.css`; inner depth-plane transforms
  - `src/game/{battlefieldCamera,battlefieldModel,shotGeometry,useAimController,gameSession}.js`, `assets/js/battle-engine.js`; read-only

#### Details
```typescript
type Pose={x:number;y:number;scale:number};
type Offset={x:number;y:number};
type SceneOffsets=Record<SceneLayer,Offset>;
getSceneOffsets({pose,viewport,reducedMotion=false}:
  {pose:Pose;viewport:{width:number;height:number};reducedMotion?:boolean}):SceneOffsets;
applyScenePose(world:HTMLElement,pose:Pose,viewport:{width:number;height:number},
  reducedMotion:boolean):void;
```
- `getSceneOffsets` is pure: invalid/nonfinite pose/viewport or scale<=0 returns fresh all-zero offsets; reduced motion also returns zero. No DOM/RNG/time/store access. Factors/caps in world units:
  - sky factor.08 capX540/capY150;
  - distant.40 capX540/capY150;
  - midground.90 capX160/capY40;
  - route1 cap0/0;
  - foreground1.03 capX45/capY10.
- Let `dx=pose.x/pose.scale`, `referenceY=.78*viewport.height−900*pose.scale`, `dy=(pose.y−referenceY)/pose.scale`. Offset(layer)=clamp((factor−1)*{dx,dy}, corresponding symmetric caps). Thus overview x0/ground anchor yields zero; rightward camera tracking shifts distant art positively inside the moving world, reducing its screen travel. Foreground travels slightly faster. Caps plus accepted600-unit overscan prevent edge exposure. Test cap transitions and finite results at reverse/follow/extreme ceiling positions.
- `applyScenePose` applies the EXACT current world transform `translate(xpx,ypx) scale(scale)`, sets `--camera-scale`, and the ten `--scene-{layer}-{x|y}` values in world-px strings. Hook's existing apply operation delegates here. Inner SVG depth planes use these vars; verify actual getScreenCTM, not CSS strings alone. Do not independently scale a depth plane, rotate the world, change camera timing/modes/ref focus or recalculate shot data.
- The later studio uses this same pose application/offset function, not a copy. No per-frame getBoundingClientRect reads beyond current viewport measurement; no new RAF for scenery. Existing hook owns interpolation/follow and its cleanup. Route/solids/projectile/actor matrices stay identical to baseline, including reduced motion and camera-scale preview compensation.
- Unit tests check zero overview/reduced/invalid, independent analytic offset values, monotone slower distant motion, caps, no argument mutation, and route exactly zero. DOM tests handle actual matrices; don't add unit tests that merely mirror style property strings.

### I03. Restrained environment with visibility and reduced-motion lifecycle
- Related Files:
  - `src/components/SceneAtmosphere.jsx` :: `SceneAtmosphere`; new
  - `src/game/useSceneActivity.js` :: `useSceneActivity`; new
  - `src/components/BattlefieldBackdrop.jsx`; consume once and pass activity
  - `src/styles/arena.css`; scoped animation/media rules
  - `tests/e2e/scene-depth.spec.cjs`; new actual browser lifecycle/depth cases

#### Details
```typescript
useSceneActivity({paused=false}:{paused?:boolean}):{active:boolean;reducedMotion:boolean};
SceneAtmosphere({area,band,active,reducedMotion}:
  {area:Area;band:'far'|'near';active:boolean;reducedMotion:boolean}); // SVG g children
```
- Hook reads matchMedia reduced-motion and document.hidden, listens to preference/visibility changes, removes listeners on cleanup. Active=!paused&&!document.hidden&&!reducedMotion. Battle scene unmounts when not visible; studio passes its pause state. No continuous JS loop/engine calls for particles. No storage writes. React StrictMode cannot multiply listeners/animations.
- Render deterministic low-opacity SVG motifs inside existing scenery layers, not a sixth covering interactive layer. Fixed seed arithmetic, never Math.random. Forest: <=10 slow leaves confined above700, low fog below1050 and a narrow translucent waterfall glint confined to the existing far-right waterfall crop. Snow: <=16 flakes above700 and a faint lower drift. City: <=10 dust/light motes above700. Chaos: <=12 violet motes plus faint lower mist. No strobe, full-screen haze or diagonal stripe across enemies/preview.
- Animation spans roughly8–18s, modest <=40 world-unit drift, opacity<=.18 for fog and<=.35 for particles. Area-specific motifs/locations are presentation configuration. Foreground fog remains below1010 via the same fixed clip. Keep sky readable and do not obscure a target or new cookie space. Record final tuning in visual notes.
- Active false pauses decorative CSS animations (`animation-play-state:paused`); reduced motion hides moving particle/glint motifs and keeps a static subtle ambient tint. Media preference change updates both scene activity and the existing camera behavior. No catch-up burst when visibility returns. Cleanup cannot cancel projectile/response completion or alter an accepted turn.

### I04. Real painted-scene/depth regression
- Related Files:
  - `tests/e2e/{region-layers,accessibility,slingshot,enemy-response}.spec.cjs`; retain/migrate necessary assumptions
  - `tests/e2e/scene-depth.spec.cjs`; add depth and activity cases
  - `tests/scene-parallax.test.mjs`; focused math
  - untracked `tmp/regional-t04-{area}-{stage}-{width}.jpg`

#### Details
- Old region-layer checks measure outer siblings. Keep their five-layer ordering, unique IDs, native ratio, actual source-art contribution and one-action assertions; add inner-plane CTM checks proving the decorative offset differs while route/obstacles/launcher/preview remain canonical. Update old `[data-source-patch]` crop-specific selectors to shared painted-panel attributes where appropriate; do not drop the pixel-contribution check.
- For all four regions use existing test-only installGame/start/dragPull/shoot. Confirm ordinary hit/miss/first wall, visible Wind bypass, reverse empty-pouch release, HUD/card timing, one engine result, and existing enemy response. No production fixtures/debug actions.
- Capture overview, close weak/strong/reverse aim, flight at entrance/middle/far, low obstacle contact and enemy response. Inspect actual source edges, perspective, painted quality, path cross-section and no blank far/reverse/ceiling frame at1440/2007/2560/844×390/390×844. Compare Forest before/after to avoid losing its accepted look.
- Test actual document visibility or focus/hidden transitions with real browser lifecycle support; verify decorative time stops/resumes, reduced motion stays static, and a committed shot/response still resolves once. Do not count setting a fake data attribute as a hidden-tab test. No retries or weakened health assertions.

## Acceptance Criteria
- [ ] Three reconstructed regions use accepted independent PNG layers; no flat-map crop stand-in remains in live combat.
- [ ] Forest retains its look; all four regions share clear five-layer depth and restrained atmosphere.
- [ ] Actual decorative parallax is visible while every gameplay transform/contact stays aligned.
- [ ] Scene edges, route and future cookie space remain clear across all prescribed camera modes/viewports.
- [ ] Hidden/reduced/unmount behavior is clean and all combat/input/session outcomes remain unchanged.

## Validation
- `node scripts/verify-region-art.cjs all` — all24 regional images remain accepted.
- `node --test tests/scene-parallax.test.mjs tests/battlefield-camera.test.mjs tests/shot-geometry.test.mjs` — independent scene math and existing geometry pass.
- `npm.cmd test` — complete Node suite passes.
- `npm.cmd run test:e2e -- region-layers.spec.cjs scene-depth.spec.cjs slingshot.spec.cjs accessibility.spec.cjs enemy-response.spec.cjs` — fresh-production actual Chrome on4180, no retries/runtime/asset errors.
- `npm.cmd run build` and `git diff --check` — pass; manually inspect and record the required captures. Leave4173/5173 services intact.

## Commit Message
```text
feat(scene): unify painted regional layers and camera-driven depth

Plan: 2026-10-21-regional-layered-world-and-map-studio
Phase: P01-regional-scenes
Task: T04-shared-scene-depth

- Replace flat regional crops with dedicated painted layers and continuous roads.
- Drive decorative parallax and restrained ambient motion without moving gameplay geometry.
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending

## Next pointer
After implementation/task commit and phase/plan/current sync, advance to `T05-development-map-studio.md`. Do not implement the queued cookie actor, balance changes or Azure.
