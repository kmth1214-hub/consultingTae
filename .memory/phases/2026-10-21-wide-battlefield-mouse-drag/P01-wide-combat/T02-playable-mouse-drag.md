# Task: T02 Playable Mouse Drag Integration

## Status: done

## Goal
Make the React game playable with direct mouse pull/release in the wide world, including reverse shots, real obstacle stops, Wind bypass and overview/aim/follow/enemy camera framing. Switch all coordinate consumers atomically so the weapon, path, collisions and attacks agree.

## Decision Summary
- Prerequisite: T01 pure modules exist and pass tests. Use their canonical geometry; do not invent a parallel DOM hit path. T01 keeps the old UI active, so this is the task that replaces it.
- User approved mouse-only vector drag, reverse shots, roughly3× field, distributed existing enemies, solid props and Wind bypass. Preserve all engine/progression/damage rules, one resolution per impact and the T06 response lifecycle. T03 will enrich the functional regional background/material effects.

## Implementation

### I01. Required pure contracts and new controller state
- Related Files:
  - `src/game/battlefieldModel.js`, `src/game/shotGeometry.js`, `src/game/battlefieldCamera.js`; T01 read-only APIs unless a verified model bug needs a regression fix
  - `src/game/useAimController.js` :: `idleAim`, `useAimController`; replace old phase logic
  - `src/game/useBattlefieldCamera.js` :: `useBattlefieldCamera`; new

#### Details
- **Canonical APIs to consume**:
  - `buildBattlefield({area,round,enemies})` returns `{key,area,round,width:3600,height:1200,groundY:900,minY:-1200,candyRadius:10,launcher,enemies,obstacles}`. Launcher sprite `(220,758,124,142)`, resting pouch world `(284,812)`, impact `(284,823)`, contact `(319,900)`. Enemy placements are `{id,kind,isBoss,x,y,size,collider:{id,x,y,radius}}`; they omit live HP/alive. Obstacle is `{id,kind,x,y,width,height,polygon:Vec2[]}`.
  - `getPull(delta,maxDragPx)` → `{direction,angleDeg,powerRatio,distancePx,maxDragPx,ready}|null`; dead zone12; direction opposite drag, ratio0..1. `getDragDraw({direction,powerRatio},active)` → local pouch/anchors/tension, max stretch72.
  - `planShot({layout,pull,enemies,windAvailable})` → `{path,hitIds,selectedTargetId,impactKind,impactDistance,obstacleId,blockerDistance,previewD,reverse,durationMs}|null`. Path `{kind,start,end,samples:[{x,y,time,distance}],length,durationSeconds,endKind,homingTargetId,d}`; helpers `sampleAtDistance`, `pathPrefixD` use that same sample table.
  - `getCameraPose({mode,viewport,layout,focus?,attackerId?,reducedMotion?})` → `{scale,x,y}|null`. Overview uses full3600 width; aim scale=min(width/1120,height/640); follow=min(width/1600,height/760), follows/clamps focus; enemy fits both actors; ground anchored at78% height. Reduced-motion forces static overview.
- **Signatures & Types**:
```typescript
type Vec2={x:number;y:number};
type DragAim={phase:'idle'|'dragging'|'launching';pointerId:number|null;
  origin:Vec2|null;delta:Vec2;direction:Vec2;angleDeg:number;powerRatio:number;
  maxDragPx:number;hasMoved:boolean;ready:boolean;launchId:number|null};
useAimController({arenaRef,ammo,disabled,onLaunch,onAimChange,onCancel}):{
  aimState:DragAim;onPointerDown;onPointerMove;onPointerUp;onPointerCancel;
  onLostPointerCapture;onContextMenu;onKeyDown;cancelAim;completeLaunch};
useBattlefieldCamera({arenaRef,worldRef,layout,mode,focusRef,attackerId}):{
  viewport:{width:number;height:number};poseRef;valid:boolean;reducedMotion:boolean};
```
- **Defaults**: idle has null pointer/origin/launchId, delta(0,0), direction(1,0), angle0, ratio0, hasMoved/readyfalse. Store origin in CSS client pixels (not device pixels or world coordinates). One launch sequence id per mounted arena.
- **Execution Flow / Logic**:
  1. Primary mouse button0 anywhere in the arena except `.arena-hud`, no active response/terminal state, ammo>0 and idle: measure nonzero viewport, record origin=(clientX,clientY), freeze maxDragPx=`min(220,.34*min(viewport.width,viewport.height))`, capture pointer, focus arena, enter dragging. Ignore touch/nonprimary/new pointers. Do not depend on launcher being visible/clicked.
  2. Pointer move for captured id: delta=client−**stored origin**, call getPull, update local state and visual path. The camera must not participate in delta/power calculation. There is no RAF power oscillator, separate target step or Space lock. Space while dragging only prevents page scrolling; it cannot alter power/phase. Publish session aim on phase transitions/release, not on every camera frame.
  3. Pointer up with matching primary id and ready: invalidate capture ownership first, enter launching with monotonic id, release capture, emit a frozen aim snapshot. Below dead zone cancels without ammo. Pulling right is a genuine reverse shot; down/up shots use the full vector without10–80° clamping.
  4. `completeLaunch(id,resolve)` accepts only the matching launching id, invalidates it **before** callback, calls resolve once, then returns local state to idle if still mounted. On launch/path failure, cancel with a short local player-facing retry instruction; do not invent a Wind target or leave launching stuck.
  5. Esc, secondary click during drag, pointercancel/lostcapture, blur/hidden document, resize/fullscreen change cancel active drag/flight, restore card/overview, clear frame/capture, never resolve later. Intentionally releasing captured pointer at launch must not be mistaken for a cancellation. Unmount invalidates every callback and listener. Preserve existing cancellation behavior rather than charging ammo for a canceled animation.
  6. Camera hook measures via layout effect + ResizeObserver; uses one RAF only while following or easing between poses (200ms ease-out, follow smoothing time constant90ms). It writes a uniform transform directly to worldRef; pose/focus refs avoid publishing60fps external-store snapshots. Idle pose stops RAF. Use latest callbacks and clean up observer/listeners/frames in React StrictMode.
  7. Camera mode derives from response→enemy, flight→follow, dragging→aim, otherwiseoverview. Follow reads a point ref set by the projectile on each frame. A response uses the actual attacker id. New round/finished response/cancel returns overview; no blocking intro timer. Reduced motion stays overview; changing the media preference safely cancels an active grab and recomputes pose.

### I02. Session guard and combat metadata migration
- Related Files:
  - `src/game/gameSession.js` :: `initialAim`, `setAim`, `fireShot`, `routeCombat`; modify
  - `tests/game-session.test.mjs`; modify existing aim tests and add reverse/metadata safeguards
  - `assets/js/battle-engine.js`, profile store; read-only

#### Details
```typescript
type SessionAim={angle:number;power:number;phase:'idle'|'dragging'|'launching';selectedTargetId:string|null};
type ShotMeta={impactKind:'enemy'|'obstacle'|'ground'|'bounds'|'timeout';
  obstacleId:string|null;reverse:boolean};
fireShot(input?:{hitIds?:string[];selectedTargetId?:string|null;shotMeta?:ShotMeta}):CombatEvent;
```
- Default aim angle0, power0, idle, selectedTargetIdnull. Normalize finite angle into [-180,180), clamp power0..100; accept only the three phases. Remove old angle/power/direction phase acceptance. While response/terminal/nonbattle, ignore aim changes as before.
- `useConsumable` still rejects any nonidle aim and any active response. `fireShot` rejects dragging but accepts idle for existing controller/unit-test callers and launching for real impact. Resolve a cloned run through existing engine exactly once, using only eligible hit ids.
- **Important nullable contract**: explicit selectedTargetIdnull must override any prior selected id. The UI always supplies null for normal/blocked/reverse/path-failure shots. Only the valid forward Wind solution supplies a live target id. A reverse shot must not consume `windHomingUsed`, receive a forced hit or gain self-damage.
- `shotMeta` is optional presentation metadata, validated against the enum/string/null types and copied onto lastEvent, not into run. Do not change damage, add a second roll, pre-roll at release, change item/camp scoring, or mutate the engine for collision art. Status may say “장애물에 막혔어요” for obstacle-first or “뒤로 날아갔어요” for a reverse miss; use normal messages for actual hits.
- Preserve `enemyResponse:{id,stage:'windup'|'travel'|'impact',attack}` and guarded stage/complete commands. Engine computes its turn once at impact; HP/ammo/freeze/boss-heal reveal and fatal result delay remain intact.
- Unit tests: new session phases and full angle range, no aiming items, reverse/null target doesn't home, valid Wind once still does, meta survives response routing, repeated/stale completion does not reapply a turn, all original progression tests still pass.

### I03. Switch every render/physics consumer to the wide world
- Related Files:
  - `src/components/BattleArena.jsx` :: layout, immutable flight, camera/input wiring; modify
  - `src/game/arenaLayout.js` :: `monsterPositions` compatibility wrapper; modify
  - `src/components/BattlefieldBackdrop.jsx` :: initial themed SVG surface; new
  - `src/components/ArenaScenery.jsx` :: render registered obstacle polygons; modify
  - `src/components/{MonsterGroup,Slingshot,TrajectoryPreview,ProjectileFlight,EnemyResponse,BattleScreen}.jsx`; modify
  - `src/styles/arena.css`; modify

#### Details
```typescript
type Flight={id:number;path:ShotPath;hitIds:string[];selectedTargetId:string|null;
  impactDistance:number;impactKind:ShotMeta['impactKind'];obstacleId:string|null;
  reverse:boolean;durationMs:number;fireball:boolean};
ProjectileFlight({flight,onProgress,onComplete}); // onProgress({id,point:Sample}), refs only
MonsterGroup({enemies,placements,lastEvent,response,groupRef});
ArenaScenery({layout});
EnemyResponse({response,layout,onAdvance,onComplete});
BattlefieldBackdrop({area,layout});
```
- Layout is memoized by area/round/ordered id-kind-boss key; join live run.enemies by id on render/shot. Never cache live HP in placement or reflow after a kill. `arenaLayout.monsterPositions(enemies,area='forest',round=1)` may delegate to canonical build for existing tests; do not retain separate compact placement logic.
- `.arena-world` is absolute at top/left0 with **explicit3600px×1200px**, transform-origin0 0, uniform `translate(...) scale(...)` supplied by camera. Remove old bottom-anchored3:2 CSS, percentage actor positions and `translateY(-81.25...)` formula. Actors use px world positions; projectile/scenery/attack SVGs all have viewBox `0 0 3600 1200`. SVGs may paint surplus sky/ground outside nominal world bounds; only the viewport clips. Keep full-window grid and portrait viewport sizing from T08. HUD/notice/instructions stay outside world transforms.
- Expose passive arena `data-camera-mode` (effective mode; overview in reduced motion), `data-aim-phase` (idle/dragging/launching/responding), and flight-only `data-impact-kind`/`data-obstacle-id`. Camera hook writes `--camera-scale` on the world alongside its transform for readable world labels in T03. These attributes contain no action/debug API.
- Backdrop in this task provides regional sky/mountain/ground colors with an SVG sky rect extending y−5000..900 and ground to y5000 so camera never reveals blank canvas. Continuous path centered on y900, height110, extends across3600. T03 replaces sparse decoration with illustrated continuity without changing these geometry contracts.
- `ArenaScenery` paints each layout obstacle using its exact world polygon, theme fill/outline and simple inner facets/wood/crate marks. Add `data-obstacle-id` for diagnosis/tests. Remove the old fixed-coordinate decorative props; do not paint additional solid-looking unregistered barriers. Decoration away from flight lane can remain nonsolid only if visually distinct.
- `MonsterGroup` uses placement x/y/size and live HP/alive. Remove manual target-selection buttons/aria-pressed/onSelectTarget: enemies become named noninteractive `role="img"` elements carrying `data-enemy-id`. Wind's computed target cue is visual/accessibly named. Keep hit bursts and attacker-only pose; melee delta uses layout.launcher.contact rather than x265/y615 constants.
- `Slingshot` retains T07 art/gradient ids but uses local direction/ratio via `getDragDraw`, sprite bounds from layout and a held release pouch snapshot. Update strength thresholds to ratio<.35/<.7/strong. Meter height=ratio*100; no textual/ARIA exact numbers. Pouch is empty while launching, card hidden through physical flight, not through enemy response.
- During drag call planShot against canonical live colliders with `windAvailable = run.weapons.some(w=>w.id==='wind-candy') && !run.roundEffects.windHomingUsed`; this applies to any owner of that weapon, not only characterIdwind. Show solution.previewD only after mouse movement/ready. Preview full hidden geometry uses same path.d; initial30% may truncate sooner at a nearby wall.
- On release freeze the entire Flight and eligible ids. Animation samples only `sampleAtDistance(path,progress*impactDistance)`, length/time-derived duration, reduced motion80ms. Tail follows only flown points. onProgress updates focusRef; it never calls an engine action. At actual first impact/end, completeLaunch guards `onFire({hitIds,selectedTargetId,shotMeta})`; local lastImpact `{id,point,kind,obstacleId}` is cosmetic. Clear it on a new grab/round. No DOM getScreenCTM/monster-rect physics remains; camera changes cannot change the frozen solution.
- Projectile missing/disconnected path has a guarded completion/cancellation exit; malformed release has no stale homing id. Model/viewport validity replaces the obsolete “missing SVG matrix means a miss” test. Unexpected hidden/unmount paths cannot leave a flight/response behind in a fresh run.
- `EnemyResponse` looks up attacker placement and uses layout.launcher.impact/contact; eliminate old x950/y615/target230,569 and1200×800 viewBox assumptions. Preserve one clock per response id, shield and special event data. Long travel may use `clamp(abs(attacker.x-impact.x)/4,520,1100)` ms; apply the **same** duration to CSS melee and SVG timing through one computed value/CSS variable. Windup340 (special480), impact520; reduced150/100/400 remain. Camera fits both actors for the whole response; notice remains viewport-based. Do not recalculate damage.
- `BattleScreen` passes new layout-dependent props through arena, keeps HP reveal/routing, and replaces Space/phase instructions with “누르고 뒤로 당긴 뒤 놓으세요 / 당긴 반대 방향으로 발사”. Preserve item number keys, fullscreen, status live regions and main/bonus stats.

### I04. Migrate input tests at the same time
- Related Files:
  - `tests/e2e/support.cjs`, `tests/e2e/{slingshot,game-launch,accessibility,enemy-response}.spec.cjs`; modify
  - `tests/e2e/game-flow.spec.cjs`; modify only obsolete direct helper expectations if needed
- Shared `grabMap` waits idle, presses non-HUD map at x=.5width/y=.40height, expects dragging and returns that **screen** point. New `dragPull(page,{angleDeg=45,powerRatio=.8,reverse=false})` computes frozen maxDragPx from arena bounds; distance=`12+ratio*(maxDrag−12)`, delta=`(-cos(angle)*distance,+sin(angle)*distance)` (reverse uses angle135). Move via real mouse; do not set app state. `shoot` releases, waits launching, then idle/result heading. Remove charge/target helpers and Space imports.
- Default ordinary Forest shot starts with45°/.80, weak miss with45°/.08, reverse with135°/.6. These are initial deterministic physical-input fixtures, not production auto-aim. Calibrate only if necessary against independently verified T01 model and record fixture values; never force hitIds/damage in the basic shot tests.
- Replace old phase expectations angle/power/direction with dragging; replace hardcoded worldx950 with layout-based fixtures; compare camera modes/transform scale equality rather than oldscale1.5/1. Update enemy selectors from target-select button to named enemy img. Space has no effect; pointer movement alone changes angle/power, stationary pointer during camera easing leaves meter/path unchanged.
- Keep every meaningful old case: primary/non-HUD entry, touch/right-click exclusions, cancellation/dead zone/lost capture/blur/resize/fullscreen, card timing, one ammo per real hit/miss, reload during flight, killing-shot unmount, reduced motion, real no-overflow/named HUD controls, Wind once and all item/progression tests. Replace only compact/matrix-specific assumptions, not the assertions that catch failures.

## Acceptance Criteria
- [x] Mouse-only grab/pull/release controls full forward/reverse/downward trajectories; Space no longer charges.
- [x] Screen fills the window; logical separation truly grows, actors keep their aspect ratio and dead slots stay stable.
- [x] Camera goes overview→aim→follow→enemy/overview, without modifying held power or shot/hit results.
- [x] Visible solid props stop normal candy and exclude behind-wall hits; valid forward Wind actually bypasses them once.
- [x] Existing combat/response/reward/bonus paths remain playable and no callback resolves more than once.

## Validation
- `npm.cmd test` — pure math + session + unchanged engine rules pass.
- `npm.cmd run test:e2e` — all migrated actual-Chrome regressions pass against production preview4180; no stale Space/target fixtures.
- `npm.cmd run build` and `git diff --check` — pass.
- Inspect functional overview/drag/flight/response at1440×900 and390×844, save captures under untracked `tmp/wide-t02-*.jpg`. Functional background is intentionally refined in T03, not considered the final art acceptance.

## Commit Message
```text
feat(game): integrate mouse drag combat and wide-field camera

Plan: 2026-10-21-wide-battlefield-mouse-drag
Phase: P01-wide-combat
Task: T02-playable-mouse-drag

- Switch input, rendering, solid contacts and Wind to the same canonical world.
- Preserve single-impact combat and update real-input regressions with the new controls.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: prescribed source/task commit (hash recorded in phase/current after commit)

## Next pointer
After source/task commit and state sync, advance to `T03-wide-scenery-and-tension.md`. Do not mark the entire visual feature complete yet.

## Execution Notes — 2026-10-21
- Connected the T01 pure modules without modifying them, the battle engine, legacy HTML or dependencies. Stable layout slots join current enemy HP/alive by id; all actors/props/projectile/enemy-attack SVGs now share the explicit 3600×1200 world.
- Input now captures a fixed CSS-pixel origin and drag limit per grab. The only local phases are idle/dragging/launching; Space suppresses scrolling but never changes aim. Release snapshots the world solution, and guarded matching launch ids resolve the engine only at physical impact/end. Cancel/unmount invalidates pending work without spending ammo.
- Added the camera hook with ResizeObserver, 200ms transitions and 90ms follow smoothing using refs/direct style writes. Reduced motion stays overview. Response travel duration is computed once per render from the same layout and shared with the melee CSS and response clock.
- Session accepts the full angle range and zero power, rejects firing/items during a grab, honors explicit null target ids and prevents reverse metadata from forcing Wind. Presentation-only shotMeta survives response routing without entering run state or changing rules/RNG.
- Functional regional sky/path colors and the exact registered obstacle polygons intentionally replace the compact illustrated backdrop here. T03 must complete illustrated continuity/materials and world-label readability; this is not final art acceptance. The old compact trajectory helper/tests remain disconnected until their planned T04 retirement.
- Physical input fixtures needed no balance/model calibration: ordinary Forest hit45°/.80, weak miss45°/.08, reverse135°/.60. Test-only progression fixtures remain confined to the existing test engine wrapper; basic shot/hit/obstacle tests use real damage and physical input.
- Necessary migration fix: Chrome's SVG vector-effect does not cancel an ancestor CSS camera transform. Inverse `--camera-scale` compensation keeps preview strokes at3.5 screen pixels (outline7) and dashes legible; desktop/narrow browser tests verify the actual stroke/CTM relationship and exposed segments.
- Captures: untracked `tmp/wide-t02-{overview,drag,flight,response}-{1440,390}.jpg`; inspected actual framing/HUD/trajectory alignment. Narrow overview captures wait for resize easing to settle; flight captures wait until the candy is clear of the item table.
- Final validation: `npm.cmd test`78/78; fresh production `npm.cmd run test:e2e`51/51 in actual Chrome (one worker/no retries); standalone `npm.cmd run build` passes; `git diff --check` clean. Browser health reports no runtime/console/asset failures. Covers2007/2560 desktop,1440 standard,844×390 short and390×844 portrait; actual default hits/misses, reverse/downward, blocked props, Wind, all cancellation paths, camera-invariant held pull, response/shields/boss specials and full reward/camp/Chaos routing.
- Development URL `http://127.0.0.1:5173/` returns HTTP200. Existing4173/5173 services were left intact; browser tests use their own4180 preview. The first sandboxed diagnostic run needed its own stale4180 process identified/rechecked and closed; the final elevated full run exits cleanly.
- Adjacent out-of-scope findings: none. Azure remains deferred.
