# Task: T03 Raise Distant Artwork

## Status: done

## Goal
Move the Snow, City, and Chaos distant illustrations upward enough to reveal more of their scenic artwork in the battlefield view, while preserving Forest's already higher composition and all combat geometry.

## Decision Summary
- Raise the three panorama regions' distant panels by 80 world units.
- Keep Forest's renderer and artwork placement unchanged.
- Keep camera, midground, route, foreground, obstacles, actors, projectile paths, and collision/gameplay coordinates unchanged.
- Re-tune the sky gradient's panel-edge stop and make the pixel regression sample the actual distant-panel boundary, since the edge moves upward.

## Implementation

### I01. Move only the panorama distant art
- Related Files:
  - `src/game/sceneCatalog.js` :: `profile`; offset only generated `distant` panel `y` values by 150 world units.
  - `tests/e2e/region-layers.spec.cjs` :: existing regional layout/art regression and new distant elevation assertions.
- Baseline distant panel y is `-450` (source height scales to 1800 at width 2700 with baseline ratio `.75`); expected y after lift is `-530` for Snow, City, and Chaos. Assert Forest retains its separate renderer and existing image position at `-600`.
- At all four regions, verify obstacle IDs, layer order, camera scale, and actor/gameplay positions remain unchanged. Check the distant art remains visible and panel proportions remain intact.

### I02. Keep the sky blend aligned to the raised art edge
- Related Files:
  - `src/components/SceneArt.jsx` :: `PanoramaLayer` sky gradient stop and paint bounds.
  - `tests/e2e/region-layers.spec.cjs` :: pixel samples around the dynamically measured distant-art top edge.
- Keep the gradient start at `y1=-850`, end at `y2=900`; calculate the matching sky-color stop from the raised panel edge (`y=-530`) instead of leaving `.23` hard-coded. Preserve the existing image-matched colors.
- In browser tests derive the distant panel's visible top ratio from its rendered bounding box relative to the arena, then compare pixels just above and just below that edge. Retain the upper-sky color-transition assertion for Snow/City/Chaos.
- Review desktop 1440x900 and portrait 390x844 screenshots for all regions; the central artwork should be more visible without a visible color seam or overlap with gameplay elements.

## Acceptance Criteria
- [x] Snow, City, and Chaos distant artwork moves upward by 80 world units; Forest remains unchanged.
- [x] The full regional layer, camera, obstacle, actor, and collision regressions pass.
- [x] The sky-to-art edge stays blended after the move, measured at its new location on desktop and mobile.
- [x] Screenshots confirm a more scenic composition without distracting overlap.

## Validation
- `npx playwright test tests/e2e/region-layers.spec.cjs`
- `npx playwright test tests/e2e/scene-depth.spec.cjs`
- `git diff --check`

Validation run: `npx playwright test --config=tmp/diagnostic.config.cjs tests/e2e/region-layers.spec.cjs tests/e2e/scene-depth.spec.cjs` — 26 passed; `npm.cmd run build` — passed.

## Commit Message
```text
수정(맵): 눈·도시·혼돈 원경을 위로 배치

Plan: 2026-10-22-battlefield-sky-projectile-visibility
Phase: P01-scene-and-projectile-clarity
Task: T03-raise-distant-art

- 세 지역의 원경 일러스트를 끌어올려 풍경이 더 잘 보이게 조정한다.
- 이동한 경계에서도 하늘과 원경의 색이 자연스럽게 이어지는지 검증한다.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
