# Task: T04 Themed Topple and Visual Acceptance

## Status: done

## Goal
All regions show recognizable tall stacks; each visibly wobbles and topples toward the candy, then remains as non-blocking debris without hiding actors or the City skyline.

## Decision Summary
- Art and animation are presentation of T03's authoritative combat state. Forest uses bundled logs, snow faceted ice, city tiered jars/crates, chaos an unstable mix. Aim preview remains partial.

## Implementation
### I01. Region-themed SVG and animation
- Related Files:
  - `src/components/ArenaScenery.jsx` :: `ArenaScenery`, `ContactEffect` — modify
  - `src/components/ProjectileFlight.jsx` :: progress callback — modify if needed
  - `src/components/BattleArena.jsx` :: scenery props, flight progress and contact effects — modify
  - `src/components/BattlefieldMinimap.jsx` :: standing/debris marker — modify if needed
  - `src/styles/arena.css` :: stack motion and reduced-motion styles — modify
#### Details
- **Data & Schema Fields**: view state `standing | wobbling | toppled`, keyed by stable obstacle id, derived from `run.toppledObstacleIds` and current flight's contact distances. Contact presentation includes world point, direction, distance and id; never stores duplicate gameplay damage in UI state.
- **Execution Flow / Logic**: draw multiple-piece material silhouettes within T01 collision bounds. On projectile progress crossing each contact distance, show contact cue and wobble, then rotate/fall in the horizontal travel direction into a low debris silhouette. Maintain visual order for chained contacts. After flight ends, derive debris from `run.toppledObstacleIds`, unaffected by React rerender/camera zoom. `prefers-reduced-motion` skips intermediate motion and displays state immediately. Use region contrast without an opaque backdrop over the distant skyline. Minimap retains visible monster icons and its power-dependent short guide ending before the nearest monster.

### I02. Browser acceptance
- Related Files:
  - `tests/e2e/obstacle-effects.spec.cjs`, `tests/e2e/wide-battlefield.spec.cjs` :: revise fixed-x assumptions; add real playback checks — modify
#### Details
- Inject stable `layoutRng`/seed where tests require exact geometry. Check a stack down after later aim, no duplicate effect, chain visual order, forest/snow/city/chaos contrast, City panorama, mobile viewport, and reduced motion. Preserve meaningful old gameplay assertions.

## Acceptance Criteria
- [x] Four region silhouettes and sequential topple/debris are legible in the real battle view; city skyline and enemies remain visible.
- [x] Playback/camera/minimap work at desktop and mobile widths, including reduced-motion; one gameplay resolve per shot.

## Validation
- `npm test` — pass.
- `npm run build` — pass.
- `npm run test:e2e -- tests/e2e/obstacle-effects.spec.cjs tests/e2e/wide-battlefield.spec.cjs` — pass.

## Commit Message
```text
feat(연출): 지역별 쌓인 물체의 흔들림과 쓰러짐 표시

Plan: 2026-10-23-toppling-stacked-obstacles
Phase: P01-stacked-battlefield
Task: T04-visual-playback

- 숲·눈·도시·혼돈에 맞는 높은 물체와 잔해 제작
- 접촉 연출, 도시 원경, 모바일 화면과 조준 미리보기 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
