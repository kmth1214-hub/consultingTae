# Task: T01 관리자 지도·전투 시범 화면 연결과 통합 검증

## Status: done

## Goal

`/__dev/maps`에서 선택한 지역·라운드·seed의 실제 적/쿠키/새총/받침을 지도에 보이고, **그 배치 그대로** 테스트 플레이한다. 숲 시범판의 탑승·낙하·사탕별 비행 효과를 전투 화면과 HUD에 드러낸 뒤 일반 사용자 게임과 배포 빌드의 격리를 확인한다.

## Decision Summary

- 지도 미리보기와 테스트 전투가 적 목록·seed·layout key를 공유한다. `같은 배치 다시 시작`은 동일 seed와 적 목록, `새 배치`는 새 seed. 개별 위치 편집은 제외한다.
- 시범판은 로컬 개발 서버 전용이다. 다른 지역의 테스트 플레이 기능은 기존처럼 작동하지만 새 고저차·기본 사탕 능력은 숲 시범판에만 적용된다.
- 기존 그림체를 유지하고 발판은 고정, 통나무만 붕괴한다. HUD는 **이번 사탕의 고유 효과**와 창에 의한 대체를 설명하며 정확한 각도/파워 수치를 노출하지 않는다.

## Implementation

### I01. 같은 seed의 지도 미리보기와 재실행

- Related Files:
  - `src/dev/MapStudio.jsx` :: `MapStudio`, `launchPlay` — 선택 라운드·seed·적 목록으로 미리보기 생성, 동일/새 배치 버튼; modify.
  - `src/dev/createStudioSession.js` :: `createStudioSession` 및 공용 `createStudioScenario` helper — roster/seed/flag 단일 생성 경로; modify.
  - `src/dev/StudioPlay.jsx` :: `StudioPlay` — 미리보기와 동일한 scenario 전달 및 재시작; modify.
  - `src/dev/mapStudio.css` :: 지도/버튼의 반응형 배치; modify.
  - `tests/studio-session.test.mjs`, `tests/studio-e2e/map-studio.spec.cjs`, `tests/studio-e2e/play-mode.spec.cjs` — 재현성·화면; modify.

#### Signatures & Types

- `StudioScenario = {area:'forest'|'snow'|'city'|'chaos', round:1|2|3, characterId:string, bossSpecial:boolean, seed:uint32, prototype:'forest-elevated-v1'|null, enemies:Enemy[], layout:Layout}`. `createStudioScenario(config)`는 미리보기와 세션이 호출하는 **같은** 결정적 조합 함수다.
- `MapStudio`의 `seed`는 컴포넌트 state로 유지한다. area/round/character 변경 시 이전 시나리오를 섞지 않도록 선택값과 seed로 scenario를 새로 계산한다. `play`에 scenario의 입력과 seed를 보관한다. `StudioPlay`의 같은 배치 다시 시작은 seed를 그대로, 새 배치는 `crypto.getRandomValues(Uint32Array(1))`를 통해 새 seed를 만든다.

#### Execution Flow / Logic

1. 현재 미리보기의 `round:1`·참조 뱀 1마리 고정 코드를 제거한다. 선택한 라운드의 실제 roster를 `createStudioScenario`가 만든다. 랜덤 roster가 필요한 혼돈도 preview/play에서 seed가 동일하다. preview에서는 상태·스토리지 변경을 일으키지 않는다.
2. 미리보기 `ArenaScenery`와 함께 `layout.enemies`, `layout.player`, `layout.launcher`, `layout.launcherPlatform`을 코드 기반 그림/간단한 표시로 겹쳐 표시한다. 발판 위 적은 받침 상단에 발이 닿아 보여야 하며 1라운드·보스의 지면 배치도 눈에 보인다. 배경 레이어 토글, 팬/줌, 축소 화면을 유지한다.
3. `테스트 플레이`는 미리보기의 area/round/character/bossSpecial/seed를 그대로 전달한다. 실행 중 다른 라운드를 선택하거나 새 배치를 눌러도 이전 shot callback이 새 encounter를 정산하지 않게 기존 `key={play.id}`와 예약 shot 취소를 유지한다.
4. seed가 충돌해 같은 배치가 나올 수도 있으므로 새 배치 버튼은 기존 seed와 동일하게 뽑혔을 때 한 번 더 뽑거나 다른 uint32로 바꾼다. `같은 배치`의 적/발판/받침 x/y/높이는 deep-equal 한다.

#### Error / State

- area/round/seed 조합에 도달 가능한 배치가 없으면 지도에 명확한 오류를 표시하고 테스트 시작을 막는다. 일반 사용자 profile/leaderboard/API를 건드리지 않는다. 다른 지역 미리보기의 기존 배경/장애물은 계속 렌더된다.

### I02. 낙하·사탕 효과의 실제 재생과 HUD

- Related Files:
  - `src/components/BattleArena.jsx` :: `BattleArena` — 같은 layout/flight로 이동 적·효과·카메라·결과 리뷰 연결; modify.
  - `src/components/MonsterGroup.jsx` :: `MonsterGroup` — 탑승 초기 y, 낙하 중 매 프레임 y/x, 착지 후 영속 위치/피격; modify.
  - `src/components/Slingshot.jsx` :: `Slingshot`, `src/components/PlayerCookie.jsx` :: `PlayerCookie` — 올라간 발사대와 쿠키·공격 접점 표시; modify only if layout 기반 위치로 부족한 경우.
  - `src/components/ArenaScenery.jsx` :: `ArenaScenery`, `LogStack`, `StackBody` — 넓은 비대칭 숲 받침, 낮은 고정 발사대 발판, 자식 구슬 장애물 wobble; modify.
  - `src/components/ProjectileFlight.jsx` :: `ProjectileFlight` — 모험가 첫 반동, 연금술사 충돌 파동, 마법사 자식 2개를 `flight`의 canonical samples로 재생; modify.
  - `src/components/MagicCandyCard.jsx` :: `MagicCandyCard`, `src/game/candyPresentation.js` :: `getCandyDetails` — 현재 장전 사탕의 고유 효과·창 대체 안내; modify.
  - `src/styles/arena.css` :: 높이·파동·분기 구슬 스타일, 축소 모션 대응; modify.

#### Data & Flow

- `BattleArena`는 `run.studioPrototype`·`run.layoutSeed`·`run.enemyLandingPositions`로 `buildPlayableBattlefield`를 호출한다. shot 시작/완료가 같은 `layout.key`를 가져야 한다. 탑승 적 초기 placement는 layout, 낙하 중은 `flight.contacts[].riderMotion.samples`, 착지 후는 run의 landing override가 출처다.
- `MonsterGroup`의 기본 enemy `left/top`만 CSS로 임의 보간하지 않는다. `ProjectileFlight.onProgress`의 `time`으로 rider motion을 샘플해 위치를 갱신한다. 추락 damage 숫자·피격 반응은 engine `event.hits`를 통해 보여준다. 사탕이 낙하 적을 때리는 동안 target 위치와 미니맵 점도 같은 좌표를 쓴다.
- `ProjectileFlight`는 큰 사탕과 자식 2개의 samples를 같은 재생 시계로 표시한다. 자식이 적을 맞힐 때만 피격 효과, 장애물에 닿을 때는 받침의 짧은 wobble만 낸다. 파동은 각 `abilityContacts` 접촉점에서 반경 180에 퍼지는 장면 효과이며 엔진이 이미 확정한 피해만 표시한다. 바운스는 실제 path에서 회전/먼지와 함께 표현한다.
- `MagicCandyCard`는 시범판에서 현재 사탕별 효과 문장을 표시하고 창 준비 중이면 `이번 발은 창 관통으로 대체`를 표시한다. 불공 준비 중에는 큰 사탕 직접 피해만 2배라고 안내한다. 기존 보유 상시 능력 목록, 다음 사탕, 발수, HUD 숨김 타이밍은 유지한다.
- 축소 동작 설정에서는 장식 반복 애니메이션만 줄이고 실제 명중·낙하/점수 결과는 동일하다. 모바일 화면에서 HUD·새총·적이 서로 가려지지 않게 확인한다.

### I03. 통합 회귀와 로컬 관리자 검토

- Related Files:
  - `tests/studio-e2e/play-mode.spec.cjs` — 숲 1·2·3라운드, 같은/새 배치, 낙하/사탕 3종/아이템 조합; modify.
  - `tests/studio-e2e/map-studio.spec.cjs` — 미리보기/전투 좌표 일치; modify.
  - `tests/e2e/studio-exclusion.spec.cjs` — production `/__dev/maps` 차단과 사용자 게임 기존 룰; modify.
  - `tests/e2e/candy-details.spec.cjs`, `tests/e2e/forest-log.spec.cjs` — HUD·기존 user 전투 회귀; modify if needed.
  - `src/main.jsx` :: `isStudioPath`, `StudioUnavailable` — production 차단 read-only 확인.

#### Required evidence

- 같은 seed의 지도와 테스트 화면에서 적 ID·x/y·받침 ID/높이·발사대/쿠키 y가 일치한다. 새 배치는 다른 seed, 재시작은 같은 seed를 기록한다.
- 숲 2라운드 받침이 실제 발사로 무너질 때 탑승 적이 이동·착지하며 피해 1~3이 화면과 점수에서 일치한다. 1라운드 지면, 3라운드 보스 지면을 확인한다.
- 각 기본 사탕의 비행/충돌 영상이 물리 결과와 일치한다. 불공의 직접 피해만 ×2, 창에서 추가 효과 없음, 자식의 장애물 wobble만 확인한다.
- 일반 게임에서 시범판 flag/고유 능력/발판이 보이지 않고 배포용 빌드에서 `/__dev/maps`는 이용 불가이며 리더보드 요청·프로필 변경이 관리자 테스트에서 0이다.

## Acceptance Criteria

- [ ] 미리보기와 같은 배치 테스트는 적·쿠키·새총·받침·seed가 동일하고 새 배치만 바뀐다.
- [ ] 낙하 적·바운스·파동·자식 구슬의 보이는 위치/시각과 실제 체력·점수가 일치한다.
- [ ] 데스크톱과 모바일에서 HUD/배경/미니맵이 읽히고 기존 사용자 게임·Azure용 빌드의 격리가 유지된다.
- [ ] 관리자 시범판의 로컬 검토 주소를 제공한다. Azure로 업로드하거나 사용자 게임에 승격하지 않는다.

## Validation

- `npm.cmd test` — 전체 단위/API 회귀 통과.
- `npm.cmd run test:studio` — 관리자 지도·전투 E2E 통과.
- `npm.cmd run build` — 프로덕션 빌드 통과.
- `npx.cmd playwright test tests/e2e/studio-exclusion.spec.cjs tests/e2e/candy-details.spec.cjs tests/e2e/forest-log.spec.cjs` — 관리자 차단 및 일반 게임 회귀 통과.

## Commit Message

```text
feat(관리자시범판): 고저차 숲 전투 미리보기와 사탕 연출 연결

Plan: 2026-10-28-forest-elevated-enemies-candy-abilities
Phase: P02-studio-presentation
Task: T01-studio-preview-playback

- 동일 배치 지도·테스트와 낙하·사탕 능력 재생 표시
- 관리자 전용 범위와 일반 게임 회귀 검증
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: T01 작업 커밋
