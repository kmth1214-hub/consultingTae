# Task: T01 World and Shot Model

## Status: done

## Goal
Create deterministic, DOM-independent wide-field geometry, mouse-pull ballistics, solid-obstacle ordering, Wind bypass and camera math. Validate them before switching the playable UI.

## Decision Summary
- User selected reverse/vector shots, roughly 3× actual distance with distributed existing enemies, overview/aim/follow camera, stationary blockers and Wind's once-per-round obstacle bypass.
- Keep existing production imports/controls working in this task. Add pure modules/tests only; T02 performs the atomic UI migration. No engine rule/RNG changes or dependency installation.

## Implementation

### I01. Canonical world and deterministic placement
- Related Files:
  - `src/game/battlefieldModel.js` :: `BATTLEFIELD`, `buildBattlefield`, `getDragDraw`; new
  - `src/game/package.json` :: ES module scope; read-only
  - `assets/js/battle-engine.js` :: `createRoundEnemies`; read-only for test inputs
  - `src/game/arenaLayout.js` :: current compact layout; read-only in T01

#### Details
- **Signatures & Types** (type notation documents JavaScript; do not introduce a TS build):
```typescript
type Vec2 = {x:number; y:number};
type Area = 'forest'|'snow'|'city'|'chaos';
type EnemySeed = {id:string; kind:string; isBoss:boolean};
type Circle = {id:string; x:number; y:number; radius:number};
type EnemyPlacement = {id:string; kind:string; isBoss:boolean;
  x:number; y:number; size:number; collider:Circle}; // x/y = sprite bottom-center
type Obstacle = {id:string; kind:'log'|'ice'|'crate';
  x:number; y:number; width:number; height:number; polygon:Vec2[]}; // x/y = top-left
type BattlefieldLayout = {key:string; area:Area; round:number;
  width:number; height:number; groundY:number; minY:number; candyRadius:number;
  launcher:{x:number;y:number;width:number;height:number;restPouch:Vec2;impact:Vec2;contact:Vec2};
  enemies:EnemyPlacement[]; obstacles:Obstacle[]};
buildBattlefield(input:{area:Area;round:number;enemies:EnemySeed[]}):BattlefieldLayout;
getDragDraw(pull:{direction:Vec2;powerRatio:number}, active?:boolean):
  {pouch:Vec2;left:Vec2;right:Vec2;tension:number};
```
- **Data & Schema Fields**:
  - `BATTLEFIELD`: frozen constants `width=3600`, `height=1200`, `groundY=900`, `minY=-1200`, `candyRadius=10`, `gravity=1200`, `minSpeed=240`, `maxSpeed=1960`, `sampleStep=1/120` seconds, `maxSeconds=8`.
  - Launcher sprite `(x=220,y=758,width=124,height=142)`; local resting pouch `(64,54)` → world `(284,812)`; player impact `(284,823)`; melee contact `(319,900)`.
  - Layout key is area + round + ordered enemy id/kind/boss flags. HP/alive do not change placement. Placement objects intentionally omit live HP/alive; renderers join the latest engine state by id.
  - One enemy: x2438. Multiple: x=`1000+i*1860/(n-1)` using **all original slots**, including dead ones; y900; size boss130, otherwise92 for <=6 slots and60 for >6. Collider center `(x,y-size*.52)`, radius=`size*.42`.
  - No enemies: valid layout with empty placement/obstacle arrays. Invalid area/nonfinite round/duplicate or empty ids: throw `TypeError` (programmer/config error), never silently produce a different battlefield.
- **Execution Flow / Logic**:
  1. Create all enemy slots in original order without mutating inputs or consuming RNG. The single-enemy separation is exactly 2438−284=2154, three times the old 950−232=718.
  2. Obstacles have width72; height log72, ice84, crate80. Forest uses log; Snow ice; City crate; Chaos slots alternate log/ice/crate. Place up to three near nominal centers x740/1520/2300, with stable ids `${area}-${round}-obstacle-${slot}`.
  3. Compute free horizontal intervals within x480..3260 by subtracting every original enemy sprite interval expanded by8. A prop center must leave its 36-unit half-width inside a free interval. For each nominal, choose the nearest admissible center (tie → smaller x); exclude already used center ±180. This keeps props out of enemy silhouettes and dead slots stable. Empty intervals may reduce prop count; normal authored layouts must have meaningful blockers and pass reachability tests below.
  4. World polygons use these normalized local silhouettes (multiply by width/height, add prop x/y; set `prop.y=900-height`): log `[(0,.30),(.85,.18),(1,.30),(.96,.88),(.15,1),(0,.9)]`; ice `[(0,1),(.18,.25),(.62,0),(1,1)]`; crate `[(0,.15),(.45,0),(1,.18),(1,.85),(.52,1),(0,.82)]`. Art must paint exactly this base silhouette in T02/T03.
  5. `getDragDraw`: normalize direction, clamp ratio0..1; active stretch=`12+60*ratio`, otherwise0; pouch=`(64,54)-direction*stretch`, anchors `(34,22)` and `(91,22)`. Max72 keeps even a straight-down pull above the ground with candy radius10. No stale angle clamps or positive-X restriction.
  6. Return fresh immutable-by-convention data. Freeze exported constants; no session/localStorage/DOM access. Use module-local helpers rather than adding package dependencies.

### I02. Pull, shared sampled paths and collision ordering
- Related Files:
  - `src/game/shotGeometry.js` :: `getPull`, `getBallisticPath`, `getHomingPath`, `sampleAtDistance`, `pathPrefixD`, `planShot`; new
  - `src/game/battlefieldModel.js` :: constants/types above; read-only consumer
  - `src/game/trajectory.js` :: old quadratic APIs; leave intact until T02/T04 migrate callers

#### Details
```typescript
type Pull = {direction:Vec2;angleDeg:number;powerRatio:number;distancePx:number;
  maxDragPx:number;ready:boolean};
type Sample = Vec2 & {time:number;distance:number}; // seconds, accumulated world arc length
type ShotPath = {kind:'ballistic'|'homing';start:Vec2;end:Vec2;samples:Sample[];
  length:number;durationSeconds:number;endKind:'ground'|'bounds'|'timeout'|'target';
  homingTargetId:string|null;d:string};
type ShotSolution = {path:ShotPath;hitIds:string[];selectedTargetId:string|null;
  impactKind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout';impactDistance:number;
  obstacleId:string|null;blockerDistance:number|null;previewD:string;reverse:boolean;durationMs:number};
getPull(delta:Vec2, maxDragPx:number):Pull|null;
getBallisticPath(input:{start:Vec2;direction:Vec2;powerRatio:number;layout:BattlefieldLayout}):ShotPath|null;
getHomingPath(input:{start:Vec2;target:Circle;obstacles:Obstacle[];layout:BattlefieldLayout}):ShotPath|null;
sampleAtDistance(path:ShotPath,distance:number):Sample;
pathPrefixD(path:ShotPath,distance:number):string;
planShot(input:{layout:BattlefieldLayout;pull:Pull;
  enemies:Array<{id:string;alive:boolean;hp:number}>;windAvailable:boolean}):ShotSolution|null;
```
- **Data / defaults**: dead zone12 CSS pixels. `getPull` direction=`-delta/length`; angle=`atan2(-direction.y,direction.x)*180/PI` in [-180,180], power=`clamp((min(length,maxDragPx)-12)/(maxDragPx-12),0,1)`, ready iff length>=12. Zero delta gives direction(1,0), angle0, power0, readyfalse. Nonfinite values or maxDragPx<=12 return null. Caller records maxDragPx once at grab (`min(220,.34*min(viewport.width,viewport.height))`); no camera scale enters this calculation.
- **Execution Flow / Logic**:
  1. Compute drawn world start from launcher x/y + `getDragDraw(...,true).pouch`. Ballistics use velocity=`direction*(240+1720*powerRatio)` and gravity positive down. Sample analytic `x=x0+vx*t`, `y=y0+vy*t+600*t*t` at 1/120 seconds. Refine the final ground/bounds crossing; stop center at groundY−radius or bounds x=−radius / width+radius, y=minY, or8s safety horizon. A below-ground/invalid start returns null; do not loop forever on downward/reverse shots.
  2. Each sample stores real time and accumulated arc length; `d` is a polyline through those samples. `sampleAtDistance` clamps distance and binary-searches/interpolates **these samples**, never recomputes a different curve. `pathPrefixD` includes the exact interpolated final point.
  3. Use **swept circle** contacts over each consecutive sample segment. Monster circles expand by candy radius and use earliest segment/circle contact. Polygon contact occurs if a moving candy disc touches a polygon edge/interior. Test segment-to-edge minimum distance <=radius (with segment intersection and endpoint projection checks), then binary-search the earliest contacting prefix20 iterations; include a starting-inside test. This avoids tunneling through thin corners and does not approximate props as large invisible AABBs.
  4. Compute first obstacle distance; collect unique live-monster ids by distance strictly before it (ties within1e−6 go to obstacle). A dead/unknown target cannot be hit. For ordinary shots `selectedTargetId=null`, including reverse shots. `impactDistance` is the nearest valid monster contact, obstacle or physical path endpoint. Only an actual obstacle-first stop sets `obstacleId`.
  5. Preserve existing permanent-shot spillover: the engine receives all geometrically eligible monster ids **before the barrier** and applies its existing carried damage at first physical contact. Flight ends at that first contact; additional engine hits retain their magic hit bursts. Do not invent a second projectile/second engine turn or damage behind a wall.
  6. Preview ends at `min(.30*path.length,firstObstacleDistance)`; never show the rest of the path/landing marker. Freeze the same solution at release for preview/flight/hits. `durationMs=clamp(sampleAtDistance(path,impactDistance).time*1000,420,3200)`; reduced-motion shortening is a renderer concern.
  7. Forward Wind availability is `windAvailable && pull.direction.x>1e−4`. Choose a living target ahead of launch nearest the ordinary ballistic end.x, tie by original slot index. Build a bypass path, `selectedTargetId=target.id`, eligible ids `[target.id]`, impact at that target center; ignore intermediate monsters just as existing targeted Wind flight does. Reverse/invalid/no target returns the ordinary solution with selectedTargetIdnull; do not consume an effect here.
  8. Bypass route: safeY=`min(start.y,target.y,all obstacle vertex y)-140`; ascend at start.x, travel above props to target.x, descend to target center. Round the two corners with quadratic joins of radius<=48 and <=quarter of adjacent lengths; sample joins at <=4 world-unit spacing. Assign time by distance/1400. The target column/start column must be clear by layout; validate the swept route against polygons. Route failure returns null to the caller as a configuration failure, **not** a fake guaranteed engine hit. No obstacles → use the same safe route for consistency. Homing `endKind='target'` and target id are explicit.
  9. All functions are deterministic and side-effect-free. `planShot` returns null for unready/invalid pull, invalid layout or unusable path; no RNG, DOM, damage or inventory writes. Error handling is explicit; caller must not pass a stale target after failure.
- **Error / return contract**: invalid builder inputs return null as specified; invalid `buildBattlefield` arguments throw TypeError. `sampleAtDistance`/`pathPrefixD` require a nonempty finite sample table; programmer-supplied malformed tables throw TypeError rather than looping. `getHomingPath` rejects coincident start/target or an unsafe route. All valid outputs are new objects; no live run/session state changes occur.

### I03. Pure camera transforms
- Related Files:
  - `src/game/battlefieldCamera.js` :: `getCameraPose`, `worldToScreen`, `screenToWorld`; new
  - `tests/battlefield-camera.test.mjs`; new
#### Details
```typescript
type Viewport = {width:number;height:number};
type CameraPose = {scale:number;x:number;y:number}; // CSS translate(x,y) scale(scale), origin(0,0)
getCameraPose(input:{mode:'overview'|'aim'|'follow'|'enemy';viewport:Viewport;
  layout:BattlefieldLayout;focus?:Vec2;attackerId?:string;reducedMotion?:boolean}):CameraPose|null;
worldToScreen(point:Vec2,pose:CameraPose):Vec2;
screenToWorld(point:Vec2,pose:CameraPose):Vec2|null;
```
- Overview scale=viewport.width/3600, left0, ground maps to .78*viewport.height. Aim scale=min(width/1120,height/640), left0, same ground anchor. Follow scale=min(width/1600,height/760); camera left clamps `focus.x−.4*width/scale` into `[0,max(0,3600−width/scale)]`; top clamps `focus.y−.46*height/scale` into `[minY,900−.78*height/scale]`. Enemy mode fits launcher/attacker bounds with120 units horizontal margin, scale=min(width/boundsWidth,height/640), ground anchored, clamped left. Missing focus/id uses overview.
- Reduced motion always returns overview for all modes. Nonfinite/zero viewport returns null; transformations reject nonfinite/zero scale. Rendering extends sky/ground outside nominal world bounds, so vertical overview padding is painted rather than stretching the scene.

### I04. Behavioral and analytic tests
- Related Files: `tests/battlefield-model.test.mjs`, `tests/shot-geometry.test.mjs`, `tests/battlefield-camera.test.mjs`; new. Existing Node tests remain intact in T01.
- Assert original counts, ids, HP objects unmodified; single distance3×; near/far x; dead-slot stability; distinct obstacle ids, no sprite overlap; all four areas/main rounds and three Chaos rounds using real `BattleEngine.createRoundEnemies` with fixed RNG.
- Verify pull sign in four quadrants, zero/dead zone, saturation, same stored delta under changed camera; drawn pouchfull-angle/reset/maxground clearance.
- Compare path samples against an independent analytic projectile equation; stronger pulls reach farther at fixed45°, reverse x decreases, downward lands promptly, all samples finite/bounded horizon. Preview <=30% actual arc length, not30% time.
- Contacts: thin/tangent polygon, inside start, duplicate/dead enemies, before/after/tie with wall, ground/bounds; no behind-wall spillover ids. Wind samples never intersect any solid shape, exact target endpoint, reverse/no-target normal, no mutation of effect flags.
- Reachability: for each real round/each target, test-only independent analytic y-at-target-X plus bisection of power for angles35/40/45/50/55/60/65/70 finds a legal **ordinary** shot reaching that enemy before obstacles/other monsters. Run only the resulting candidate paths, not an enormous all-powers brute-force loop. There must be at least one solid blocker per nonempty layout and both a blocked low shot and an over-the-top shot in a focused fixture. If initial art-height placement fails, fix layout/math within the stated constant contracts before completing; do not weaken the test or mark Wind as the reachability witness.
- Camera round trips, equal X/Y scale, wide/narrow/short viewports, focus clamping, reduced static overview and invalid input. No timing-sensitive performance assertions.

## Acceptance Criteria
- [x] Pure world/path/collision/camera contracts above exist with finite, deterministic results and no production UI change.
- [x] Ordinary shots cannot include a monster behind a solid obstacle; Wind visibly has a collision-free sampled bypass.
- [x] Real round layouts keep existing enemies and allow normal reachable shots.
- [x] All existing Node tests still pass; build still uses the old UI until T02.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs tests/battlefield-camera.test.mjs` — analytic/behavioral cases pass.
- `npm.cmd test` — old engine/session/trajectory regressions remain green.
- `npm.cmd run build` — unchanged playable app builds.
- `git diff --check` — clean.

## Commit Message
```text
feat(game): define wide battlefield and pull-driven shot geometry

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T01-world-shot-model

- Add deterministic placement, vector pull, ballistics, solid contacts and Wind bypass.
- Verify reachability and camera transforms without switching the live controls.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: prescribed source/task commit (hash recorded in phase/current after commit)

## Execution Notes — 2026-10-21
- Added three pure modules and three focused test files; production imports, UI, engine and legacy HTML remain unchanged.
- `launcher.restPouch` is sprite-local `(64,54)`; `launcher.impact` and `launcher.contact` are world coordinates. `getDragDraw().pouch` is also sprite-local, including when idle.
- Calibration: increased polygon contact bisection from the planned 20 to 32 subdivisions. A real moving-disc simultaneous wall/enemy regression showed 20 leaves about 1e-5 world-unit error, exceeding the specified 1e-6 obstacle-wins tolerance. Removed radius padding that advanced tangent contact. Both simultaneous and tangent contact tests now pass without relaxing assertions.
- Focused tests: 14/14 pass. Full Node suite: 76/76 pass (existing 62 retained). Includes all Forest/Snow/City rounds and all Chaos waves at fixed RNG 0/.5/.999; every original enemy has an ordinary first-contact reachability witness. No balance/count/HP changes or RNG consumption in geometry.
- `npm.cmd run build` and `git diff --check` pass. No browser run is needed for these unconnected pure modules; playable integration and browser verification belong to T02.
- Adjacent out-of-scope findings: none. New world/controls are not visible in the game until T02 connects these APIs.

## Next pointer
After the prescribed commit, update phase/current to `T02-playable-mouse-drag.md`. Do not start Azure work.
