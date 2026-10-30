# Task: T01 네 지역의 보이는 바람과 실제 궤도

## Status: done

## Goal
숲·눈·도시·혼돈의 두 바람 구간과 날씨가 보이고, 구간을 지나는 모든 플레이어 스톤의 미리보기·비행·충돌에 같은 약한 바람이 적용된다.

## Decision Summary
- 숲 잎, 눈 눈송이, 도시 바람, 혼돈 검은 비+잎/눈. 숲·눈·도시의 방향은 라운드 고정, 혼돈은 발사마다 바뀌되 조준 전에 표시한다.
- 장식은 배경에 두어 적과 30% 궤도 안내를 가리지 않는다. 현재 `SceneAtmosphere`의 입자/안개를 확장하고 별도의 과한 전면 오버레이를 만들지 않는다.

## Implementation

### I01. 결정적 바람 필드
- Related Files:
  - `src/game/windField.js` :: `buildWindField`, `sampleWindAcceleration`, `crossedWindZone` — new
  - `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield` — layout seed 재사용; modify if needed
  - `assets/js/battle-engine.js` :: `createRunState`, `resolveProjectile`, `enterRound` — accepted player shot ordinal 추가; modify
- **Signatures & Types**:
  ```js
  buildWindField({ area, round, layoutSeed, shotOrdinal, layout })
    // -> { direction: -1|1, acceleration: number, zones: Array<{id:string,x:number,y:number,width:number,height:number}> }
  sampleWindAcceleration(field, point) // -> number, signed horizontal world-units/s²
  crossedWindZone(path, field) // -> boolean, whole flight not preview prefix
  ```
- **Data & Schema Fields**: `run.playerShotsFired: integer >= 0`, initialized 0 and incremented exactly once per accepted projectile (not consumables, enemy turns, or rerenders), retained across rounds. `field.zones` has two broad, nonoverlapping screen-visible rectangles at different heights within `layout.width=3600`; derive positions from stable `layoutSeed` and round. Deterministic direction hash uses area/seed/round for Forest/Snow/City; Chaos also uses `playerShotsFired` before launch. Use a mild constant horizontal acceleration (target 60 world units/s² while inside a zone); direction and geometry are immutable through the shot.
- **Execution Flow / Logic**: The same field object/value is used for aiming, reserved flight, minimap cues, playback, and `shotMeta.windCrossed`. Count at most one crossing boolean per shot even if both zones are crossed. Validate finite coordinates and direction. `isPlayableBattlefield` currently tests no-wind witnesses; retain that test, then add representative windy hit witnesses or tune strength to avoid making all targets unreachable. Do not alter enemy projectiles or boss split animation.

### I02. Path and atmosphere
- Related Files:
  - `src/game/shotGeometry.js` :: `getBallisticPath`, `ballisticFromVelocity`, `planStackedShot`, `planShot` — sample wind in authoritative path; modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight`, `flightResultPayload` — pass/capture field/crossing; modify
  - `src/components/SceneAtmosphere.jsx`, `src/components/SceneArt.jsx`, `src/components/ForestLayerContent.jsx`, `src/components/BattleArena.jsx` — wind bands, direction indicator, weather; modify
  - `src/styles/arena.css` — restrained animation and reduced motion; modify
  - `tests/wind-field.test.mjs`, `tests/shot-geometry.test.mjs`, `tests/e2e/region-layers.spec.cjs` — new/modify
- **Execution Flow / Logic**: Extend ballistic sample integration only when field exists; preserve old analytic/no-wind behavior for existing geometry helpers and layout generation. Use deterministic fixed time steps no larger than existing `BATTLEFIELD.sampleStep`; retain continuous segment-circle/polygon collision and ground/bounds/roll termination. Wind changes horizontal velocity only inside zones; recompute path distance/time so `sampleAtTime`, the 30% preview, monster patrol contacts, obstacle chains, and flight playback all use the same samples. Render clear but translucent zone edges plus region-specific particles. Pause animation on inactive tab, honor `prefers-reduced-motion`, and keep HUD above artwork.

## Acceptance Criteria
- [ ] Same seed/shot ordinal yields identical field and collision; Chaos's next ordinal can change direction without changing during a drag.
- [ ] A crossing shot visibly drifts and its preview/actual impact agree; a shot outside zones retains its old path.
- [ ] All four weather treatments are visible without covering enemies or the aim line.

## Validation
- `node --test tests/wind-field.test.mjs tests/shot-geometry.test.mjs tests/shot-resolution.test.mjs` — deterministic physics/crossing
- `npx playwright test tests/e2e/region-layers.spec.cjs tests/e2e/shot-integrity.spec.cjs` — scene and committed hit consistency
- `npm run build` — React build

## Commit Message
```text
feat(weather): 지역별 바람을 투사체 궤도와 날씨에 연결

Plan: 2026-10-30-active-candy-abilities-and-wind-weather
Phase: P02-battle-abilities
Task: T01-regional-wind-physics

- 두 바람 구간과 지역 날씨를 결정적으로 표시
- 미리보기와 실제 충돌에 같은 바람 적용
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 1c87689
