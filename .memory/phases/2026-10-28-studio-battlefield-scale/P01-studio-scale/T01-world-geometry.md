# Task: T01 관리자 월드 배율과 충돌 판정

## Status: done

## Goal
관리자 시범판 네 지역에 1.5배 월드 배치를 생성하고, 미리보기와 실제 전투가 동일한 배치·발사 궤도를 사용한다. 일반 사용자 전장은 기존 1배다.

## Decision Summary
- 관리자 전용 `worldScale=1.5`, 일반 기본값 `1`. 숲 고저차 및 지역 몬스터 기능 플래그와 독립적이다.
- 3600×1200 월드와 전체 조망, 보스 상대 배율(3배/4.5배), 사탕 최대 5지름 굴림은 유지한다.

## Implementation

### I01. 관리자 전용 배율과 배치 생성
- Related Files:
  - `src/game/battlefieldModel.js` :: `buildBattlefield`, `getDragDraw` — 월드/충돌 모델; modify
  - `src/game/battlefieldPlacement.js` :: `buildPlayableBattlefield`, `isPlayableBattlefield`, `witnessAt` — 배치 검증; modify
  - `src/dev/createStudioSession.js` :: `createStudioScenario`, `createStudioSession` — 관리자 배율; modify

#### Details
- **Signatures & Types**:
  ```js
  buildBattlefield({ area, round, enemies, seed, encounterPhase, prototype, enemyLandingPositions, worldScale = 1 }) // layout
  buildPlayableBattlefield({ area, round, enemies, seed, encounterPhase, prototype, enemyLandingPositions, worldScale = 1 }) // layout
  getDragDraw(pull, active = true, worldScale = 1) // {pouch,left,right,tension}
  ```
- **Data & Schema Fields**: `run.studioWorldScale?: number` = 관리자 세션에만 `1.5`; `layout.worldScale: number` = 1 또는 1.5; `layout.candyRadius = 10 * worldScale`. 적 `size/collider.radius`, 장애물 `width/height/polygon`, 쿠키·새총 `width/height/impact/contact`, `launcher.restPouch`를 같은 배율로 만든다. `layout.key`는 배율을 구분한다.
- **Execution Flow / Logic**:
  1. Precondition: 배율은 1 또는 1.5만 허용하고 생략 시 1이다. 기존 `prototype`/숲 2라운드 검증은 유지한다.
  2. Core: 적 크기(60/92/276/414), 장애물 80폭 및 높이, 숲 받침 128폭/높이, 쿠키·새총 박스와 사탕 반경을 1.5배 한다. groundY=900은 고정. 쿠키/새총 x 간격과 발사대 발판 폭을 확대 몸체에 맞춘다. 새총 SVG는 기존 124×142 로컬 좌표를 유지하고 발사 시작점만 `getDragDraw(..., layout.worldScale)`로 월드 좌표화한다.
  3. 배치: 확대된 크기로 빈 구간, 장애물/적 겹침, 모든 적·장애물의 실사격 witness를 검증한다. 32번 시도와 deterministic fallback 유지. 숲 라이더 낙하 및 혼돈 보스 분리 위치 재구성에도 같은 배율을 전달한다.
  4. Error/Return: 배치 실패는 기존 Error. 같은 관리자 `area,round,seed`는 동일 `layout.key`와 슬롯/물체 좌표를 반환한다.

### I02. 발사 경로까지 배율 전달
- Related Files:
  - `src/game/shotGeometry.js` :: `planShot` — 실제 궤도 시작점; modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — 물리 해법; modify
  - `src/components/BattleArena.jsx` :: `layout`, `splitSource` — 실제 플레이/보스 전환; modify
  - `tests/battlefield-model.test.mjs`, `tests/studio-session.test.mjs`, `tests/shot-geometry.test.mjs` — 배율·1배 회귀; modify
- **Data & Schema Fields**: `flight.candyRadius?: number` = 활성 layout 반경(화면용), `run.studioWorldScale?: 1.5`.
- **Execution Flow / Logic**: `BattleArena`, `preparePhysicalFlight`, `createStudioScenario`의 모든 `buildPlayableBattlefield`에 배율 전달. `planShot`과 배치 witness가 같은 배율의 시위 좌표를 사용한다. 기본 run 기존 테스트는 그대로다.

## Acceptance Criteria
- [ ] 관리자 네 지역의 주요 크기와 사탕 반경이 정확히 1.5배다.
- [ ] 일반 사용자 run은 기존 1배 물리와 배치를 유지한다.
- [ ] 프리뷰/플레이/발사 결과가 같은 seed에서 동일 좌표를 사용한다.
- [ ] 적·장애물·숲 받침이 겹치지 않고 실사격 witness가 존재한다.

## Validation
- `node --test tests/battlefield-model.test.mjs tests/studio-session.test.mjs tests/shot-geometry.test.mjs` — 배율 및 기존 1배 검증
- `npm run build` — React 빌드 통과

## Commit Message
```text
feat(studio): 관리자 전장 크기와 충돌 판정을 확대

Plan: 2026-10-28-studio-battlefield-scale
Phase: P01-studio-scale
Task: T01-world-geometry

- 관리자 네 지역에 1.5배 월드 배율 적용
- 발사와 적·장애물 배치 판정을 표시 크기에 맞춤
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`node --test` 41/41, `npm.cmd run build`)
- commit: 아래 커밋 참조
