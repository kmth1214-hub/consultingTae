# Task: T02 City View Visual Acceptance

## Status: pending

## Goal
Confirm the City panorama correction reads as the marked scenic view in both real play and the development map studio, then synchronize the Plan, Phase and current pointer without claiming acceptance from DOM checks alone.

## Decision Summary
- Review the live React renderer at desktop overview and portrait mobile sizes with all five scene layers enabled. Keep the play road, combat positions and all non-City regions unchanged.
- If visual evidence reveals a related masking or layer edge defect, fix only that reproduced City composition defect and repeat the affected tests. Do not generate new art or redesign gameplay under this Task.

## Implementation

### I01. Inspect actual gameplay and studio captures
- Related Files:
  - `tests/e2e/region-layers.spec.cjs` :: actual City battle screenshots; read-only unless a reproduced regression requires correction.
  - `tests/studio-e2e/map-studio.spec.cjs` :: actual studio screenshots and view controls; read-only unless a reproduced regression requires correction.
  - `src/components/SceneArt.jsx`, `src/game/sceneCatalog.js`, `src/dev/MapStudio.jsx` :: review only; no new architecture or game API.
  - `.memory/asset-reviews/2026-10-22-city-panorama-visibility.md` :: new visual evidence and command results.
  - `tmp/city-panorama-*.png` :: temporary untracked captures.

#### Details
- **Evidence schema**:
  ```typescript
  type Capture = { surface: 'game'|'studio'; viewport: {width:number;height:number};
    layers: 'all-visible'; capturePath: string; observation: string };
  type Check = { command: string; passed: number; total?: number; exitCode: 0 };
  ```
- Capture City at1440x900 and390x844 in the ordinary battle, and at1440x900 in the development map studio. Use normal overview framing, not a manually zoomed-in camera, as the critical player view. Also inspect one pan position in the studio to ensure the scenery doesn't reveal clip seams.
- Compare the central skyline region to the user's marked City reference: the dusk skyline and layered town must be recognizable across the center; edge buildings frame rather than consume it; route remains visible and player/enemies/HUD are not hidden.
- Verify under the actual normal layer visibility controls, with no debug CSS, injected style, forced visibility or screenshot postprocessing. Record the exact browser viewport and capture path.
- Run the whole relevant Node suite, region/scene-depth E2E, studio E2E and production build. If a check fails, reproduce it, make only a scoped correction to City decorative composition, and rerun the failed command plus full relevant suite.
- Final synchronization after acceptance: mark T01 and T02 done, set P01 `done: 2/2` and `complete`, set Plan status `complete`, set `.memory/current.md` active task `none` with results, and commit this Task using the message below. Keep unrelated dirty/untracked files unstaged.

## Acceptance Criteria
- [ ] Manual review shows the city panorama clearly during ordinary play and in studio at the required viewport sizes.
- [ ] Studio pan/zoom does not expose an abrupt mask edge or blank panel.
- [ ] Full relevant tests/build pass; no gameplay or non-City visual regression is observed.
- [ ] Evidence and accurate command results are recorded; Plan/Phase/current statuses agree.

## Validation
- `npm.cmd test` — full Node suite passes.
- `npm.cmd run test:e2e -- tests/e2e/region-layers.spec.cjs tests/e2e/scene-depth.spec.cjs` — relevant production-browser scene checks pass.
- `npm.cmd run test:studio -- tests/studio-e2e/map-studio.spec.cjs` — studio suite passes.
- `npm.cmd run build` and `git diff --check` — production output and patch pass.

## Commit Message
```text
검증(맵): 도시 파노라마 노출과 레이어 회귀 확인

Plan: 2026-10-22-city-panorama-visibility
Phase: P01-city-composition
Task: T02-visual-acceptance

- 실제 플레이와 지도 스튜디오에서 도시 원경 노출을 확인한다.
- 화면 크기별 캡처와 관련 회귀 결과를 기록한다.
```

## Progress
- [ ] 구현/검토 완료
- [ ] 검증 통과
- commit: pending
