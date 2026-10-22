# Task: T01 Regional Sky Coverage

## Status: done

## Goal
Remove the visible color seam where the upper vector sky meets the opaque distant-art panels, and protect the boundary with a browser pixel test.

## Decision Summary
- Pixel sampling reproduced a sharp top seam on Snow, City, and Chaos. The opaque distant PNGs include their own sky, whose top colors did not match the old vector palette colors.
- Match each vector sky color to its distant art and extend the gradient and fallback across the camera-visible sky bounds.
- Forest art, regional panels, layer order, camera, and gameplay geometry remain unchanged.

## Implementation

### I01. Add the rendered-pixel regression
- Related file: `tests/e2e/region-layers.spec.cjs` :: regional sky blend tests.
- For each region, install the game, load source art, capture the arena, decode screenshot pixels in a canvas, and compare the upper band and sky/art boundary at desktop 1440x900 and portrait 390x844.
- Baseline seam color distances were 138 for Snow, 89 for City, and 102 for Chaos; Forest already passed.
- Validation: `npx playwright test tests/e2e/region-layers.spec.cjs -g "sky blends"`.

### I02. Extend and tune regional sky paint
- Related files:
  - `src/components/SceneArt.jsx` :: `PanoramaLayer` sky gradient and paint rectangle.
  - `src/game/sceneCatalog.js` :: `SCENE_PROFILES` and `profile` palette.
- Gradient bounds now run from `y1=-850` to `y2=900`, with an upper hue at offset 0, the image-matched sky color at `.23`, and horizon at 1. Paint covers `x=-5000 y=-5000 width=13600 height=5900`.
- Image-matched colors: Snow `#55adfd`, City `#8378c8`, Chaos `#212671`; their upper hues are Snow `#9bd2ff`, City `#b09be0`, Chaos `#48458d`.
- Distant panels currently begin at `y=-450`; the `.23` stop aligns with that edge. T03 will update the stop after raising the panels.

## Acceptance Criteria
- [x] Pixel regression reproduced the original seam and now passes all four regions at desktop and mobile sizes.
- [x] Region structure, source art, camera, and gameplay geometry regressions pass.
- [x] Screenshot review confirms the upper sky blends into the original illustration.

## Validation
- `npx playwright test --config=tmp/diagnostic.config.cjs tests/e2e/region-layers.spec.cjs` — 21 passed.
- `git diff --check` — passed.

## Commit Message
```text
수정(맵): 지역별 하늘 그라데이션 영역 조정

Plan: 2026-10-22-battlefield-sky-projectile-visibility
Phase: P01-scene-and-projectile-clarity
Task: T01-regional-sky-coverage

- 화면 상단까지 하늘 그라데이션을 확장해 색상 단절을 제거한다.
- 네 지역의 하늘과 원경 경계를 확인하는 픽셀 검증을 추가한다.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `6125767`
