# Task: T02 Camera Parallax

## Status: done

## Superseding T01R01 Layout Contract
User requested path between layers2/3 and a broader map after T01. Ready forest world now240%×200%; launcher left14%/bottom26%, enemy group left73%/right16%/bottom26% (mobile≤520px left68%/right14%, monsters40×46px). `#forestScenery` contains distant/midground only, `#forestPath` z2 and actors share the world, foreground is a direct world child z5. Query decorative layers under `#arenaWorld`, not only `#forestScenery`. Keep path/actors on the unmodified world camera, trajectory z6/projectilez7. Reuse `fitArenaWorld()` for idle fit refresh, adding parallax updates to that function and existing listeners rather than duplicating fit logic. Distant background fills180% overscan; midground/foreground use55.555556% centered within that expanded artwork box, with feather mask. When converting to wrappers/::before, move sizing AND mask to artwork pseudo-elements. Waterfall coordinates are world-normalized. This section overrides earlier contradictory DOM/sizing assumptions; see path-revision.md for evidence.

## Goal
기존 카메라가 적 → 발사대 → 전체 장면으로 이동할 때 숲의 먼 풍경은 작게, 가까운 풍경은 크게 움직이게 한다. 조준·투사체 좌표 기준은 유지한다.

## Decision Summary
- T01의 별도 이미지·흙길·ready fallback 구조를 사용한다. world 카메라는 하나이며 장식 transform만 추가한다.
- 기존 WAAPI 카메라의 실제 행렬을 관찰한다. 별도 카메라 시간축이나 마우스 추적 이동은 추가하지 않는다.

## Implementation

### I01. Decorative transforms
- Related Files:
  - `cookie-roguelike-mockup.html` :: `.forest-scenery`, `[data-forest-layer]`, new parallax functions/state; modify.
  - `assets/maps/forest-layers/distant.png`, `midground.png`, `foreground.png` :: T01 에셋; read-only.

#### Details
- **Signatures & Types** (plain JS with JSDoc; 아래 표기는 계약 설명용):
  - `updateForestParallax(): void`
  - `startForestParallaxSampling(): void`
  - `stopForestParallaxSampling(): void`
  - `forestParallaxFrameId: number|null = null`
- **Data & Schema Fields**:
  - `#forestScenery` 아래 data-forest-layer는 distant/midground/foreground. data-parallax는 각각 0.18/0.50/1.08, finite number, null 불허.
  - 이미지 URL은 `./assets/maps/forest-layers/distant.png`, `midground.png`, `foreground.png`.
  - 기존 카메라는 uniform scale와 translate만 사용한다. matrix 값 finite 및 scale>0 검사, invalid/크기0이면 해당 frame에서 변경하지 않는다.
- **Execution Flow / Logic**:
  1. T01 레이어를 transform wrapper로 변경: absolute inset:0, transform-origin:0 0. 각 wrapper의 `::before`를 absolute inset:-40%로 만들고 기존 이미지 background와 background-size:100% 100%를 옮긴다. wrapper 자체는 background:none. 이렇게 overscan 그림과 transform 원점을 분리한다.
  2. update는 arena/world 존재, area=forest, forestReady=true일 때만 계산한다. 나머지 지역은 레이어 inline transform을 비우고 종료. `getComputedStyle(world).transform`을 DOMMatrixReadOnly로 읽어 s=matrix.a, tx=matrix.e, ty=matrix.f. none이면 identity.
  3. fit 기준 f=min(arena.clientWidth/world.offsetWidth, arena.clientHeight/world.offsetHeight), bx=(arena.clientWidth-world.offsetWidth*f)/2, by=(arena.clientHeight-world.offsetHeight*f)/2.
  4. multiplier p별 desiredScale=f+p*(s-f), desiredX=bx+p*(tx-bx), desiredY=by+p*(ty-by). 자식 transform은 `translate((desiredX-tx)/s px,(desiredY-ty)/s px) scale(desiredScale/s)`, origin0. fit에서는 identity로 정렬된다. 배우/road에는 적용하지 않는다.
  5. start는 frame id가 있으면 반환하여 sampler 하나만 유지. frame마다 update 후 cameraAnimation이 running/pending이고 visible/ready forest battle이며 document visible일 때만 다음 frame 예약. 아니면 id=null. sampler는 world transform을 쓰지 않는다.
  6. stop은 예약 frame 취소 후 id=null. 마지막 update는 호출자가 수행. DOM/asset 실패로 aiming setup을 중단하지 않는다.

### I02. Existing camera lifecycle
- Related Files:
  - `cookie-roguelike-mockup.html` :: `stopCameraAnimation`, `focusCameraOn`, `playRoundIntro`, `setArenaArea`, `prepareForestScenery`, `showScreen`, existing resize/fullscreen/visibility listeners; modify narrowly.
  - `cookie-roguelike-mockup.html` :: `cameraTransformFor`, `getWorldPointFromPointer`, `getStoneCenter`, projectile functions; preserve coordinate contracts.

#### Details
- **Signatures & Types**: retain `cameraTransformFor(target: HTMLElement, scale: number): string`, `stopCameraAnimation(): void`, `focusCameraOn(target: HTMLElement, scale: number, durationMs: number): Promise<void>`, `playRoundIntro(): Promise<void>`, `setArenaArea(area: string): boolean`.
- **Data & Schema Fields**: retain `cameraAnimation: Animation|null`, `roundIntroId: number`, `currentArea: string`. New frame id is decorative state only.
- **Execution Flow / Logic**:
  1. stopCameraAnimation reads actual computed world transform before cancelling, commits it to world.style to prevent jump, cancels/nulls animation, stops sampling and updates decoration. Missing world is guarded. No animation: stop sampler and refresh only.
  2. focusCameraOn stops previous animation first then reads committed/computed transform for from; do not prefer stale inline transform while animation runs. Keep duration/easing/fill. Assign cameraAnimation then start sampler. On finished commit to only when identity still matches, null/cancel handle, stop sampler, final update. On rejection do not finalize a superseded animation or stop its newer sampler.
  3. playRoundIntro keeps scale1.35 enemy focus for900ms, launcher1600ms, fit return700ms and introId guards. Update immediately after initial enemy transform and reduced-motion fit transform. Reduce skips WAAPI and sampler.
  4. prepareForestScenery success/failure refreshes decoration; start sampler only when existing camera requires it. setArenaArea refreshes and stops sampling for other areas, preserves map/label behavior and invalid-area=false.
  5. showScreen for name!='battle' increments roundIntroId and stops camera before fullscreen routing. This closes the existing battle→reward intro cancellation gap. Preserve fullscreen and aim cancellation; remove duplicate increment from old else branch.
  6. Existing resize/fullscreen listeners refresh decoration after layout. Visible battle with no camera animation and aimState.phase='idle': commit cameraTransformFor(world,fitScale) then update. During aiming/launching refresh decoration without resetting world/target. Running intro uses actual current matrix. Reuse listeners rather than duplicate handlers.
  7. On document hidden/window blur invalidate introId and stop camera while battle active. On visible refresh decoration without replaying intro. T03 shares visibility listener for ambient state. No lingering frame loop after leave/cancel/completion.

## Acceptance Criteria
- [x] Enemy focus, launcher focus and fit return show continuous layer speed differences.
- [x] Fit aligns layers; zoom and wide/tall layouts expose no blank edges.
- [x] Cancellation preserves current frame; replaced camera cannot cancel a newer sampler.
- [x] Hidden/non-forest/reduced-motion states have no sampling loop.
- [x] Pointer conversion, launcher coordinates, projectile path and ammunition remain unchanged.

## Validation
- Windows execution result: use `node .memory/validation/2026-10-12-forest-layered-background/check-parallax.cjs` for equivalent syntax and coordinate regression checks. Use built-in Node server `serve-parallax.cjs` because npx PowerShell policy/cache prevented the original command. See parallax.md for real browser results and fullscreen limitation.
- `node -e 'const fs=require("fs"),vm=require("vm"); const h=fs.readFileSync("cookie-roguelike-mockup.html","utf8"); for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]); console.log("inline scripts OK");'` — syntax passes.
- `git diff --check` — passes.
- `npx --yes http-server . -a 127.0.0.1 -p 4173 -c-1` — open HTTP page. Widths1440/760/390, fullscreen, battle→reward during intro, forest→snow→forest, blur/hide during intro, rapid battle reentry: no stale animation/jumps/holes.
- Browser at fit: `updateForestParallax(); [...document.querySelectorAll('[data-forest-layer]')].map(e=>({layer:e.dataset.forestLayer,transform:e.style.transform}))` — identity-equivalent transforms. After intro/leave: `({camera:cameraAnimation,frame:forestParallaxFrameId})` — both null.
- Complete mouse hold, vertical angle, Space press/release, horizontal target, mouse release: projectile follows preview, ammo decreases once. Record screenshots/results in `.memory/validation/2026-10-12-forest-layered-background/parallax.md`.

## Commit Message
```text
feat(forest): synchronize scenery parallax with the battle camera

Plan: 2026-10-12-forest-layered-background
Phase: P01-forest-scene
Task: T02-camera-parallax

- Derive decorative transforms from the existing world camera
- Clean up camera sampling on completion and battle exit
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — final16 camera assertions,9 coverage cases, actual hidden lifecycle, completed shot integration, syntax and diff. Fullscreen success unavailable; existing fallback recorded.
- commit: pending
