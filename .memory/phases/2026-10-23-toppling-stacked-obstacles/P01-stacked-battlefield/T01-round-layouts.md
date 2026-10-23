# Task: T01 Playable Randomized Round Layouts

## Status: done

## Goal
At each round entry choose a fresh but round-stable layout: randomized monster positions and 2–4 tall, region-matched stacks with no overlap and ordinary slingshot shots to all actors/props.

## Decision Summary
- Randomness is sampled once per round, independent of combat RNG and React rerenders. Preserve 3600×1200 world geometry and ground y=900. Empty-enemy direct callers keep empty obstacles.

## Implementation
### I01. Layout data and validation
- Related Files:
  - `src/game/battlefieldModel.js` :: `buildBattlefield`, `BATTLEFIELD`, shape/height constants — modify
  - `src/game/shotGeometry.js` :: `planShot` — read-only verification dependency
  - `tests/battlefield-model.test.mjs`, `tests/shot-geometry.test.mjs` :: layout invariants/reachability — modify
#### Details
- **Signatures & Types**: `buildBattlefield({area:string,round:number,enemies:Array<{id:string,kind:string,isBoss:boolean}>,seed?:number}): Layout`. Seed is unsigned 32-bit; omitted seed uses deterministic fallback for direct callers. Preserve `Layout.enemies[]` fields `{id,kind,isBoss,x,y,size,collider}` and `Layout.obstacles[]` fields `{id,kind,x,y,width,height,polygon}`. `kind` is `log | ice | crate`; chaos mixes those. Include `seed` in `layout.key`.
- **Data & Schema Fields**: 2–4 obstacles, heights 1.5–2× regular enemy size for the round, bottoms on ground. Keep player and launcher anchors unchanged. Geometry polygons must match later SVG art. New builder output owns fresh arrays and never mutates `enemies`.
- **Execution Flow / Logic**: local seeded pseudo-random placement in safe x-band; keep enemy and stack bounding boxes separated by explicit margins and stacks separated from each other. Generate bounded candidates, accepting only those for which an ordinary first-contact `planShot` witness exists for every enemy and standing stack. Avoid circular import between builder and geometry (separate generator/verifier module if needed) and provide a verified deterministic fallback if candidate attempts fail. Test real rounds/density extremes over several seeds. Reject invalid ids/seed with `TypeError`.

### I02. Stable round entry
- Related Files:
  - `src/game/gameSession.js` :: `createGameSession`, `startRun`, `continueAfterReward`, `chooseCampReward`, `enterBonusRoute`, chaos advance — modify
  - `src/components/BattleArena.jsx` :: layout `useMemo` — modify
  - `tests/game-session.test.mjs` :: seed lifecycle — modify
#### Details
- **Signatures & Types**: `createGameSession({rng=Math.random,layoutRng=Math.random,now,storage,engine})`; `run.layoutSeed:number` is an unsigned 32-bit seed. Draw only after successful round entry, never on aim/damage/reward rerender. `layoutRng` is injectable for deterministic tests and does not advance `rng`.
- **Execution Flow / Logic**: memoize layout by area/round/seed/enemy identity, not live HP. Successful new game or round draws a new seed. Invalid actions and camp fusion pauses do not redraw. Keep Azure/leaderboard transitions unchanged.

## Acceptance Criteria
- [ ] Each nonempty round has 2–4 tall regional stacks; no actor/stack or stack/stack overlap.
- [ ] Seed affects placement, same seed is stable through shots, and combat RNG sequence is unchanged.
- [ ] Every accepted sampled layout has an ordinary shot to every enemy and stack; fallback is playable.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs tests/game-session.test.mjs` — pass.
- `npm run build` — pass.

## Commit Message
```text
feat(전장): 라운드마다 조준 가능한 몬스터와 장애물 위치 배치

Plan: 2026-10-23-toppling-stacked-obstacles
Phase: P01-stacked-battlefield
Task: T01-round-layouts

- 전투 난수와 분리된 시드로 물체 2~4개와 몬스터 위치 선정
- 겹침과 도달 가능성 검사 후 라운드 동안 고정
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
