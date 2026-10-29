# Task: T01 일반 게임 숲 고저차 배치

## Status: done

## Goal
일반 게임 숲 2라운드에서 적 하나가 높이가 다른 통나무 더미 위에 서고, 받침이 무너지면 실제 낙하 경로·피해·착지 위치가 다음 발사까지 유지되게 한다. 관리자 전용 사탕 능력과 다른 지역의 규칙은 공개하지 않는다.

## Decision Summary
- 사용자 요청과 이전 확정 범위에 따라 숲부터 공개한다. 숲 1라운드는 바닥, 2라운드는 적 1마리 위 배치, 3라운드 보스는 바닥이다.
- `forest-elevated-v1` 레이아웃/낙하 기능과 `studioPrototype` 사탕 능력 게이트를 분리해 사용자 게임에 의도하지 않은 새 능력이 섞이지 않게 한다.

## Implementation

### I01. 공개 전투의 배치 상태

- Related Files:
  - `src/game/gameSession.js` :: `createGameSession`, `assignLayoutSeed`, `actions.startRun`, `actions.resolveProjectile` — 숲 배치 모드를 라운드별로 지정하고 낙하 검증; modify
  - `assets/js/battle-engine.js` :: `enterRound`, `resolveProjectile` — 사용자 모드의 낙하 결과 적용; modify
  - `src/game/battlefieldModel.js` :: `buildBattlefield` — 기존 배치 구조 확인만, 수정 필요 없으면 read-only

#### Details
- **Signatures & Types**:
  ```js
  // run에 저장하는 별도 공개 배치 모드
  run.battlefieldPrototype = run.area === 'forest' ? 'forest-elevated-v1' : null;
  // 레이아웃/낙하 활성 조건
  const elevatedForest = run.battlefieldPrototype === 'forest-elevated-v1'
    || run.studioPrototype === 'forest-elevated-v1';
  ```
- **Data & Schema Fields**:
  - `run.battlefieldPrototype: 'forest-elevated-v1' | null` — 공개 숲의 높이 배치·낙하만 허용; `studioPrototype`은 관리자 사탕 능력 등 시범 기능 용도 그대로 유지.
  - `run.enemyLandingPositions: Record<string, { x: number, y: 900 }>` — 라운드 시작 때 빈 객체로 초기화, 받침 적이 생존 착지했을 때만 갱신.
  - `run.layoutSeed: uint32` — 기존 난수 주입 방식 유지, 같은 라운드의 배치 재현에 사용.
- **Execution Flow / Logic**:
  1. `assignLayoutSeed`가 현재 `run.area`를 보고 `battlefieldPrototype`을 숲에서만 설정한다. 다른 지역으로 진입하면 `null`로 되돌린다. 숲의 높이 모드에서는 `enemyLandingPositions={}`를 초기화한다.
  2. `startRun`은 `assignLayoutSeed`를 기존대로 호출한다. `enterRound`는 공개 또는 관리자 숲 높이 모드에서 착지 위치를 초기화한다.
  3. `resolveProjectile`은 공개 또는 관리자 숲 높이 모드일 때만 확정된 `shotMeta.riderFalls`를 실제 적 피해·착지 좌표로 적용한다. 기존 `studioPrototype` 검증만을 사용해 관리자 사탕 파동·분리 구슬을 여는 조건은 변경하지 않는다.
  4. `gameSession`의 발사 결과 검증도 공개 또는 관리자 숲 높이 모드에서 낙하 메타를 허용한다. 실제 예약 발사 경로가 만든 값만 사용하고 중복 충돌·피해를 거부하는 기존 검증을 유지한다.

### I02. 화면·물리 경로 통일

- Related Files:
  - `src/components/BattleArena.jsx` :: `BattleArena`, `layout`, `makeSolution` — 사용자 숲 전투와 화면 배치를 같은 모드로 생성; modify
  - `src/game/shotResolution.js` :: `preparePhysicalFlight` — 예약 발사 물리가 같은 배치를 사용; modify
  - `src/game/shotGeometry.js` :: `planShot` — 기존 `layout.prototype`은 받침/낙하에 사용하고 별도 인수 `prototype`은 관리자 사탕 능력에만 사용; read-only
  - `src/game/candyPresentation.js` :: `getCandyDetails` — 사용자 게임에서는 관리자 사탕 능력 설명을 노출하지 않음; read-only
- **Signatures & Types**:
  ```js
  const layoutPrototype = run.battlefieldPrototype ?? run.studioPrototype ?? null;
  buildPlayableBattlefield({ area, round, enemies, seed, prototype: layoutPrototype,
    enemyLandingPositions: run.enemyLandingPositions ?? null, worldScale: run.studioWorldScale ?? 1 });
  planShot({ layout, ..., prototype: run.studioPrototype ?? null });
  ```
- **Data & Schema Fields**:
  - `layout.prototype`: 기존 `forest-elevated-v1` 문자열. 적 받침·새총 발판·쿠키 높이·원형 피격 판정이 한 좌표계에 있다.
  - `flight.contacts[].riderMotion`과 `shotMeta.riderFalls[]`: 기존 구조 그대로, 새 데이터 모델은 만들지 않는다.
- **Execution Flow / Logic**:
  1. `BattleArena`의 `buildPlayableBattlefield`와 `preparePhysicalFlight`의 레이아웃 인수만 공개 배치 모드를 우선하도록 바꾼다.
  2. `planShot`의 `prototype` 인수는 관리자 시범 사탕 능력 조건인 `run.studioPrototype` 그대로 두어 공개 숲에서 튀기기·파동·분리 구슬이 자동 발동하지 않게 한다.
  3. `layout.enemyLandingPositions`을 다시 그릴 때 반영해 생존 적의 착지 후 피격 위치, 반격 출발 위치, 미니맵을 일치시킨다.
  4. 관리자 시범 세션의 `studioPrototype` 및 1.5배 `studioWorldScale`은 바꾸지 않는다.

### I03. 회귀 검증

- Related Files:
  - `tests/public-forest-placement.test.mjs` :: 숲 공개 모드 배치·낙하·지역 경계 테스트; new
  - `tests/e2e/forest-placement.spec.cjs` :: 실제 production 화면에서 숲 2라운드 받침과 적 위치 검증; new
  - `tests/e2e/support.cjs` :: 기존 테스트 fixture 읽기 전용
- **Test Cases**:
  1. 공개 세션 숲 1·2·3라운드에서 각각 적 높이 0/1/0명, 보스 바닥, 새총·쿠키 같은 높이, 장애물·적 충돌 영역 겹침 없음 확인.
  2. 같은 시드에서는 배치가 동일하고 다른 시드에서는 적 또는 발판 배치가 바뀌며 `isPlayableBattlefield`가 참.
  3. 숲 2라운드 받침 타격 실제 예약 경로의 낙하를 정산하면 피해는 1~3을 1회만 주고 살아 있는 적의 바닥 위치를 다음 레이아웃에 반영. 관리자 사탕 능력 payload는 없는지 확인.
  4. 눈 진입 후 공개 배치 모드가 `null`로 돌아가고 기존 배치/판정 유지.
  5. production 브라우저에서 2라운드의 받침, 위·아래 몬스터 높이 차이, 미니맵의 두 적, 1라운드 바닥/보스 바닥을 확인. 조준·발사 시 런타임 오류가 없는지 확인.

## Acceptance Criteria
- [ ] 일반 게임 숲 2라운드에서 위 몬스터 1마리와 바닥 몬스터 1마리가 보인다.
- [ ] 통나무 타격에 따른 낙하 피해·착지 좌표가 실제 발사 경로와 맞고 중복 적용되지 않는다.
- [ ] 사용자 게임에서는 관리자 전용 사탕 능력, 1.5배 크기, 타 지역 융합 몬스터가 켜지지 않는다.
- [ ] 숲 외 지역과 관리자 스튜디오의 기존 전투 경로가 유지된다.

## Validation
- `node --test tests/public-forest-placement.test.mjs tests/battlefield-model.test.mjs tests/shot-resolution.test.mjs tests/game-session.test.mjs` — 배치·물리·세션 검증.
- `npm.cmd test` — 전체 단위·API 회귀 통과.
- `npm.cmd run build` — 음악을 제외한 production 빌드 통과.
- `node ./node_modules/@playwright/test/cli.js test tests/e2e/forest-placement.spec.cjs tests/e2e/bgm.spec.cjs --config tests/config/bgm-preview.config.cjs` — 별도 포트 4180의 production preview에서 배치·음악 제외 확인.

## Commit Message
```text
feat(battle): 일반 게임 숲에 고저차 몬스터 배치 적용

Plan: 2026-10-29-public-forest-elevated-placement
Phase: P01-public-forest
Task: T01-public-forest-placement

- 숲 2라운드의 통나무 위 몬스터와 실제 낙하 판정을 공개 전투에 연결
- 관리자 사탕 능력과 크기 확대는 분리하고 생산 빌드 회귀 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd test`: 248/248, production 숲 배치·음악 제외: 4/4, 지역 전환 재검증: 3/3, build 성공)
- commit: `72fbe01`
