# Task: T01 지역별 높낮이 배치

## Status: done

## Goal
공개 게임과 관리자 미리보기의 눈·도시·혼돈에 시드 기반 적 받침과 발사대 높낮이를 배치한다. 숲 기존 배치는 유지한다.

## Decision Summary
- 숲·눈·도시는 1라운드 바닥, 2라운드 일반 적 1명 위, 3라운드 보스 바닥.
- 혼돈 일반전 1·2라운드는 2~3명을 서로 다른 높이에, 보스는 바닥에 둔다.
- 공개 스케일 1과 관리자 스케일 1.5 모두 조준 가능해야 한다.

## Implementation

### I01. 전장 모델
- Related Files: `src/game/battlefieldModel.js` :: `buildBattlefield`, `SHAPES`, `SUPPORT_HEIGHTS`; modify.
- Signatures & Types: `buildBattlefield({ area: 'forest'|'snow'|'city'|'chaos', round: number, enemies: Enemy[], seed?: uint32, encounterPhase?: 'split'|null, prototype?: 'forest-elevated-v1'|'regional-elevated-v1'|null, enemyLandingPositions?: Record<string,{x:number,y:900}>|null, worldScale?:1|1.5 }): Layout`.
- Data & Schema Fields: `Layout.enemies[]` has `x:number,y:number,size:number,collider:{id,x,y,radius},supportObstacleId?:string,elevation?:'low'|'medium'|'high',groundY?:900`; `Layout.obstacles[]` has `id,kind:'log'|'ice'|'crate',x,y,width,height,polygon, supportsEnemyId?:string,elevation?:...`; `Layout.launcherPlatform` is an optional non-toppling platform.
- Execution Flow: validate area/prototype pairing and regular enemy roster; seed the existing deterministic RNG; place enemies with adequate spacing (widen chaos spread); place ordinary regional obstacles, then selected support bodies under 1 snow/city round-2 enemy or 2–3 chaos round-1/2 enemies, using distinct low/medium/high elevations, retaining enough gap from ground enemies and other obstacles; select launcher lift with same round seed; apply prior landing positions only to known enemies. Bosses and chaos split remain on ground. The support polygon must give a broad top for both visual and collision.
- Errors: reject unsupported prototype/area, malformed landing positions, impossible roster; `buildPlayableBattlefield` retries deterministic seeds, then fails clearly.

### I02. 조준 가능성과 세션
- Related Files: `src/game/battlefieldPlacement.js` :: `isPlayableBattlefield`, `buildPlayableBattlefield`; `src/game/gameSession.js` :: `assignLayoutSeed`; `src/dev/createStudioSession.js` :: `createStudioScenario`; modify.
- Validation: link every support to exactly one rider, check boundary/overlap, prove physical first-contact shot to each enemy and obstacle with existing `witnessAt`; stable seed across rerenders. `assignLayoutSeed` chooses forest or regional prototype and resets `enemyLandingPositions` per round. Studio preview and StudioPlay use same regional prototype and seeded positions; administrator-only ability gating stays on forest `studioPrototype`.

### I03. 회귀 검증
- Related Files: `tests/regional-elevated-placement.test.mjs`; new. `tests/public-forest-placement.test.mjs`, `tests/battlefield-model.test.mjs`, `tests/studio-session.test.mjs`; modify old flat-region expectations.
- Test seeds 0,1,4,4927; 4 areas × 3 rounds × 2 scales; assert rider counts and distinct elevations, no overlap, deterministic redraw, shootable targets/supports, round reset and unchanged private candy abilities.

## Acceptance Criteria
- [ ] 결정한 라운드별 rider 수와 지역별 받침 종류가 나온다.
- [ ] 공개·관리자 모든 배치가 적과 받침을 실제 샷으로 맞힐 수 있다.
- [ ] 같은 시드는 같은 배치이고 숲의 기존 기능을 보존한다.

## Validation
- `node --test tests/regional-elevated-placement.test.mjs tests/public-forest-placement.test.mjs tests/battlefield-model.test.mjs tests/studio-session.test.mjs`
- `npm run build`

## Commit Message
```text
feat(battlefield): 네 지역의 몬스터 높낮이 배치 확장

Plan: 2026-10-29-regional-elevated-enemies
Phase: P01-regional-placement
Task: T01-regional-layout

- 눈·도시·혼돈의 받침과 발사대 높이를 시드 기반으로 배치
- 공개 게임과 관리자 미리보기의 조준 가능한 전장을 일치
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 22 tests, `npm.cmd run build`
- commit: pending
