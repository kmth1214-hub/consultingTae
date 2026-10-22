# Task: T01 Open the City Skyline View

## Status: done

## Goal
Reveal the existing dedicated City skyline across the central battlefield by treating City midground buildings and bridge as edge framing, so the marked panorama is recognizable during ordinary play without moving the road or changing any gameplay coordinates.

## Decision Summary
- Use the existing eight City art panels; do not generate, replace, crop or edit bitmap assets in this Task. Limit the City midground layer's visible x-range to outer framing zones and retain the current City distant-art placement already present in the worktree.
- Keep the canonical world road at y=900 and the visual route above decorative midground. Forest, Snow, Chaos, all camera modes and actor/collision geometry remain unchanged.

## Implementation

### I01. Make a central City scenic window in the shared renderer
- Related Files:
  - `src/components/SceneArt.jsx` :: `PanoramaLayer`, `SceneArt`, `ORDER`, `Z`; modify City-only clip construction and preserve shared layer markup.
  - `tests/e2e/region-layers.spec.cjs` :: City composition assertions and visual screenshot checks; modify.
  - `src/game/sceneCatalog.js` :: `profile`, city panel y placement; read-only for this Task. Preserve the current city lift of220 world units; do not replace it with the committed default80.
  - `src/components/BattlefieldBackdrop.jsx` and `src/dev/MapStudio.jsx` :: shared runtime/studio composition; read-only, verify the same renderer is used.

#### Details
- **Signatures & Types**:
  ```typescript
  type Area = 'forest' | 'snow' | 'city' | 'chaos';
  type LayerRole = 'sky' | 'distant' | 'midground' | 'route' | 'foreground';
  // Existing React signatures remain unchanged:
  function PanoramaLayer(props: {
    role: 'sky' | 'distant' | 'midground' | 'path' | 'foreground';
    panels: Array<{ side: 'west' | 'east'; x: number; y: number; width: number; height: number; href: string }> | null;
    area: Area; profile: object; prefix: string; activity: object; visible: boolean;
  }): React.ReactElement;
  function SceneArt(props: { area: Area; activity: object; visibleLayers?: Partial<Record<LayerRole, boolean>> }): React.ReactElement;
  ```
- **Data and SVG geometry**:
  - Keep `ORDER=['sky','distant','midground','route','foreground']`, outer `data-scene-layer` names, layer count, z-index values `[0,0,1,2,5]`, and `viewBox="0 0 3600 1200"`.
  - The existing City world extends through x=0..3600, with west/east artwork panels overlapping by600 units. Keep the generic midground clip path `x=-600,y=-500,width=4800,height=1320`. Define a City-only alpha mask in user-space coordinates over `x=0..3600,y=-500..820`: a black base rect; opaque west frame x=0..450; west linear fade x=450..600 from white to black; east fade x=3000..3150 from black to white; opaque east frame x=3150..3600. Thus the central scenic window x=600..3000 remains clear and each150-unit edge transition feathers instead of creating a hard vertical cut. Keep the SVG's normal viewport clipping outside these strips.
  - Apply this alpha mask only when `area==='city' && role==='midground'`. Keep the existing generic midground clip (`x=-600,y=-500,width=4800,height=1320`) for Snow/Chaos/City. Forest uses the separate `ForestLayerContent` renderer and has no panorama midground clip; leave that renderer unchanged. Do not nest duplicate IDs or modify image panel registration.
  - Retain `data-depth-plane="midground"` and its existing parallax transform on the same `<g>`; the new clip is a viewport visibility mask only and must not transform the route or painted panels.
- **Execution Flow / Logic**:
  1. Precondition: read the existing `SceneArt.jsx`, `sceneCatalog.js`, region-layer tests and current worktree diff. Do not discard the uncommitted City lift/test edits. Confirm the City profile panel positions and the actual DOM layer order before editing.
  2. In `PanoramaLayer`, create the existing world bounds clip and a second city-midground clip only for the City midground. Set the role group's `clipPath` to the City-specific clip under that condition; otherwise preserve the current role clip exactly.
  3. Add browser assertions that City keeps five ordered layers, uses the specified two opaque edge frames and two 150-unit alpha fades around its x=600..3000 scenic window, and keeps route layer z=2, midground z=1, distant y at the current profile value. Assert Forest retains its independent renderer with no panorama clip/mask, while Snow/Chaos retain the generic panorama clip and positions.
  4. Capture actual City battle overview and map-studio overview. The central two-thirds must show the existing City distant skyline above the clear road; left bakery/right oven framing remains visible where present. Check 1440x900 and 390x844, then review the screenshot manually. If a hard mask edge, panel seam or hidden skyline remains at a required viewport, adjust only the City mask bounds/gradient and record final world-coordinate values in the test and execution notes.
  5. Error handling: if the renderer's current geometry differs from the blueprint, do not guess at coordinates. Stop and document the mismatch for plan correction; do not move gameplay geometry or silently broaden the change to other regions.
- **Forbidden regressions**: no changing `groundY`, road/path y=900, route layer z-order, obstacle polygons, actor positions, distance/camera math, city distant lift, other region clip paths, asset files or dependencies.

### I02. Verify the clipped composition and shared gameplay view
- Related Files:
  - `tests/e2e/region-layers.spec.cjs` :: existing City actual-browser layer and visible-art checks; extend with center-window checks.
  - `tests/e2e/scene-depth.spec.cjs` :: existing layer/camera geometry assertions; read-only unless a reproduced test gap needs a related assertion.
  - `tests/studio-e2e/map-studio.spec.cjs` :: studio's real City overview; add only if a shared composition assertion is not already covered.
  - `tmp/city-panorama-*.png` :: untracked visual evidence only; never stage.
- **Test cases**:
  1. City opening applies only to the midground layer: city distant and route images remain visible; center open width is2400 world units; two solid450-unit frames and two 150-unit gradient fades are present.
  2. All four regions still render layers in `sky,distant,midground,route,foreground` order with z-indices `0,0,1,2,5` and equal outer-camera scale.
  3. At 1440x900 and390x844, the City skyline image contributes visible pixels in the central scenic window above world y=900; road and collision obstacles remain at their before-change coordinates.
  4. Existing capture/trajectory/obstacle tests show no shot geometry or input regression. Studio selectors, pan/zoom controls and route back to the game still work.

## Acceptance Criteria
- [ ] The marked City skyline is visibly prominent across a broad central view during ordinary gameplay, not just in the development studio.
- [ ] Side City landmarks remain as edge framing; the central window is2400/3600 world units and road y=900 stays clear and interactive.
- [ ] No non-City scene, camera transform, layer count/order, obstacle/actor position or gameplay coordinate changes.
- [ ] Desktop and portrait screenshots are manually reviewed and evidence is recorded.

## Validation
- `npm.cmd run test:e2e -- tests/e2e/region-layers.spec.cjs tests/e2e/scene-depth.spec.cjs` — City scenic-window and cross-region layer/camera checks pass.
- `npm.cmd run test:studio -- tests/studio-e2e/map-studio.spec.cjs` — actual shared studio renderer and controls pass (use the repository's supported Playwright config syntax if CLI filtering differs).
- `npm.cmd run build` — production build passes.
- `git diff --check` — no whitespace errors.

## Commit Message
```text
수정(맵): 도시 원경 파노라마 시야 확보

Plan: 2026-10-22-city-panorama-visibility
Phase: P01-city-composition
Task: T01-open-city-skyline

- 도시 중경을 양끝 프레임으로 제한해 중앙 원경을 드러낸다.
- 전투 길과 다른 지역 레이어·게임 좌표를 유지한다.
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — production E2E 26/26, studio E2E 8/8, production build, `git diff --check`
- Visual review: `tmp/wide-t03-city-overview-1440.jpg`, `tmp/wide-t03-city-overview-390.jpg`, `tmp/map-studio-city-overview-1440.jpg`; first hard-edged mask was rejected and replaced by 150-unit feathered alpha fades.
- commit: pending
