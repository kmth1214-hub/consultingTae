# Task: T01 개발 전용 고저차 전장 배치

## Status: done

## Goal

로컬 관리자 테스트의 숲 라운드에만 높이별 통나무 받침·탑승 몬스터·선택적 낮은 발사대 발판을 결정적으로 배치한다. 아직 낙하 피해나 사탕 능력은 구현하지 않는다. 시범판 flag가 없는 일반 게임과 다른 지역의 배치 결과는 그대로 유지한다.

## Decision Summary

- 숲 1라운드의 1마리와 쿠키·새총은 바닥에 둔다. 2라운드의 일반 몬스터 2마리 중 정확히 1마리가 쓰러지는 통나무 위, 나머지는 바닥이다. 3라운드 보스는 바닥이다.
- 2라운드부터 쿠키·새총은 seed에 따라 바닥 또는 낮은 고정 발판에 **함께** 올라가고 라운드 중 움직이지 않는다. 적 받침은 낮음·중간·높음 3단계다. 적과 장애물의 충돌 범위는 겹치지 않으며 사탕이 모두 닿을 수 있어야 한다.
- 배치와 seed는 같은 입력에 대해 고정된다. 관리자에서 새 seed를 고를 때만 바뀐다.

## Implementation

### I01. 개발 전용 시나리오 표식과 전장 모델

- Related Files:
  - `src/dev/createStudioSession.js` :: `createStudioSession` — 숲 run에만 `studioPrototype: 'forest-elevated-v1'`을 설정; modify.
  - `src/game/battlefieldModel.js` :: `buildBattlefield`, `BATTLEFIELD`, `SHAPES` — 선택적 prototype 입력과 고저차 기하; modify.
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — run의 표식을 전장 생성에 전달; modify.
  - `src/components/BattleArena.jsx` :: `BattleArena` — 표시용 전장 생성에도 **같은** 표식을 전달; modify.

#### Signatures & Types

- `buildBattlefield({area:string, round:number, enemies:Enemy[], seed:uint32, encounterPhase:string|null, prototype?:'forest-elevated-v1'|null}): Layout`. `prototype` 생략은 기존 배치와 key를 포함해 이전 결과를 유지한다.
- `Layout`에 시범판일 때만 `prototype:'forest-elevated-v1'`, `launcherPlatform: {x:number,y:number,width:number,height:number}|null`을 둔다. `enemies[]`의 탑승자는 `supportObstacleId:string`, `elevation:'low'|'medium'|'high'`, `groundY:900`, `collider:{id,x,y,radius}`를 갖는다. 바닥 적은 support 필드가 없고 기존 y=900을 유지한다.
- `obstacles[]`의 받침 통나무는 `supportsEnemyId:string`, `elevation:'low'|'medium'|'high'`, 상단이 넓은 `polygon`을 갖는다. 시범판 외의 기존 obstacle 객체 형식은 유지한다.
- `player`와 `launcher`의 `y`, `impact.y`, `contact.y`는 발판 높이 `h`만큼 함께 감소한다. `restPouch`는 로컬 좌표 그대로 둔다. `layout.key`에 prototype을 포함해 일반 배치 캐시와 혼동하지 않는다.

#### Execution Flow / Logic

1. `area==='forest' && prototype==='forest-elevated-v1'`인 경우에만 새 분기로 들어간다. 무효 prototype 또는 다른 지역에 prototype을 넣은 호출은 `TypeError`를 반환한다. 일반 호출은 기존 난수 호출 순서까지 보존한다.
2. 기존 `randomFromSeed(seed)` 하나로 위치·높이·발사대 발판을 결정한다. 숲 2라운드에서 보스가 아닌 2명 중 탑승자 1명을 선택하고 그 적 근처의 통나무 1개를 받침으로 지정한다. 탑승자 y는 `support.y`에 발이 놓이는 월드 좌표, collider y는 `enemy.y - size*.52`; 적 중심과 통나무 몸통은 겹치지 않는다. 다른 적과 각 장애물의 실제 점유 폭·높이도 분리한다.
3. 받침 높이는 3단계 고정 값으로 정의하고 최소한 한 seed씩 각 단계가 나오게 한다. 통나무의 `SHAPES.log`는 시범판 지원용 폴리곤을 사용하고 상단 판이 몬스터 바닥 폭을 지탱할 만큼 넓어야 한다. 나머지 통나무는 현재 랜덤 배치와 연쇄 충돌 규칙을 따른다.
4. 1라운드 쿠키·새총의 y를 현재 값으로 고정한다. 2·3라운드는 seed가 정한 바닥/낮은 발판 선택을 사용하고, 발판은 `obstacles`에 넣지 않아 무너지거나 사탕의 지역 효과를 발동하지 않게 한다.
5. `preparePhysicalFlight`와 `BattleArena`는 run의 동일 표식·seed·적 목록을 사용한다. 관리자 아닌 run에서 표식이 없으면 물리·표시 전부 기존 배치다.

#### Error / State

- 유효하지 않은 seed, 중복 적 ID, 필요한 숲 2라운드 일반 적 2마리가 없는 시범판 입력은 명시적으로 거부한다. 임의의 받침·적 겹침을 조용히 허용하지 않는다.
- 배치 생성은 run이나 입력 적 객체를 mutate하지 않는다. 살아남은 탑승 적의 후속 발사 위치 갱신은 T02에서 다룬다.

### I02. 도달성 검증과 정규 시작점

- Related Files:
  - `src/game/battlefieldPlacement.js` :: `witnessAt`, `findForestLogOpportunity`, `isPlayableBattlefield`, `buildPlayableBattlefield` — 시범판을 포함한 도달성 검증; modify.
  - `src/game/shotGeometry.js` :: `planShot` — 이미 `layout.launcher`의 pouch를 발사점으로 삼으므로 read-only 확인.
  - `tests/battlefield-model.test.mjs` :: seeded 시범판 배치 케이스; modify.
  - `tests/shot-geometry.test.mjs` :: 높이별 발사점·적·받침 선행 충돌 케이스; modify.
  - `tests/studio-session.test.mjs` :: 숲 관리자 run에만 표식이 붙는지 검증; modify.

#### Details

- `buildPlayableBattlefield`에 선택적 `prototype`을 전달하고 최대 32개 후보 탐색 및 fallback의 **모든** 호출에 동일하게 전달한다. 재현성: 같은 seed와 적 목록은 같은 후보를 채택한다.
- `witnessAt`의 하드코딩 시작점 `(284,812)`을 `layout.launcher.x + getDragDraw(pull).pouch.x`, `layout.launcher.y + getDragDraw(pull).pouch.y`로 대체하고 중력은 `layout.gravity / 2`를 사용한다. `planShot`으로 실제 첫 충돌이 목표인지 재확인한다.
- 시범판 숲 2라운드에서 `isPlayableBattlefield`는 탑승 적·바닥 적 각각에 직접 명중 witness가 있고 받침 통나무도 사탕이 닿으며, 적/장애물 배치가 겹치지 않을 때만 true다. 어느 높이든 실제 충돌 판정으로 닿을 수 있어야 한다. 기존 지역/일반 전장의 성립 조건은 그대로다.
- 테스트: 숲 라운드 1/2/3 여러 seed에서 적 수·탑승 수·보스 지면·발판 동행·두 좌표의 seed 재현성을 확인한다. 낮음/중간/높음 각각 통과 배치를 찾아 검사한다. 시범판 off 비교는 같은 입력의 기존 `buildBattlefield` 결과와 key를 deep-equal 한다.

## Acceptance Criteria

- [x] 관리자 숲 2라운드에서 정확히 1명이 통나무 위, 1명이 지면이고 두 대상과 받침에 실제 유효 발사가 존재한다.
- [x] 1라운드의 쿠키·새총·적은 지면이며 3라운드 보스는 지면이다. 2·3라운드 발판 선택 시 쿠키와 새총의 모든 월드 접점이 함께 이동한다.
- [x] 같은 seed의 레이아웃은 재현되고 시범판 flag가 없는 기존 지역·숲 배치는 바뀌지 않는다.
- [x] 적 받침과 고정 발사대 발판은 충돌·효과 목록에서 구별된다.

## Validation

- `node --test tests/battlefield-model.test.mjs tests/shot-geometry.test.mjs` — 높이별 배치·도달성·기존 배치 비교 통과.
- `node --test tests/studio-session.test.mjs` — 관리자 숲 표식 격리 통과.
- `npm.cmd run build` — React 번들 통과.

## Commit Message

```text
feat(관리자전장): 숲 고저차 적과 발사대 배치 추가

Plan: 2026-10-28-forest-elevated-enemies-candy-abilities
Phase: P01-combat-simulation
Task: T01-elevated-layout

- 관리자 숲 라운드에 결정적 통나무 받침과 발사대 발판 배치
- 높아진 발사점 기준으로 실제 도달성 검사
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 — 배치·궤적 25개, 관리자 세션 6개, Vite 빌드.
- commit: `feat(관리자전장): 숲 고저차 적과 발사대 배치 추가`
