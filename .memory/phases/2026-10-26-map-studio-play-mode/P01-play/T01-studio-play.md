# Task: T01 관리자 테스트 플레이

## Status: done

## Goal
지도 스튜디오에서 선택한 실제 지역 전투를 바로 시작하고, 연출을 검토한 뒤 배경 검토 상태로 복귀한다.

## Decision Summary
- 실제 BattleScreen/게임 세션을 재사용하고 세션의 초기 생성 옵션만 dev 어댑터로 바꾼다.
- 프로덕션의 관리자 진입 제외 유지. 테스트 프로필은 메모리 한정이며 리더보드 컴포넌트는 마운트하지 않는다.

## Implementation
### I01. 격리 세션
- Related Files: 신규 `src/dev/createStudioSession.js` :: `createStudioSession`; `src/game/gameSession.js`, `profileStore.js`, `battleEngine.js`, `gameData.js` read-only
#### Details
- Signature: `createStudioSession(config:StudioConfig,{engine=BattleEngine,rng=Math.random,now=Date.now}={}) => GameSession`.
- StudioConfig: `{area:'forest'|'snow'|'city'|'chaos',round:1|2|3,characterId:CharacterId,bossSpecial:boolean,seed:uint32}`. 기본 adventurer/false/0, area와 round는 필수. 무효 값은 RangeError/TypeError, 생성 전 검증한다.
- engine.createRunState(options) 어댑터는 실제 createRunState에 선택 area/round/characterId, HP100/ammo9/inventory={fireball:3,spear:3,defense:3,heal:3}를 넣는다. round3 && bossSpecial이면 boss.attackCount=2, 일반 적은 유지.
- session.storage는 내부 Map 프로필 `{version:1,snowAreaCleared:true}`에서 읽고 쓴다. browser storage 미접근. layoutRng는 seed/2^32, 저장된 seed로 배치를 재현한다. session.actions.startCharacterSelect()/startRun(characterId)로 진입하고 성공하지 않으면 throw한다. 공통 엔진/상태 객체를 수정하지 않는다.
### I02. 관리자 UI
- Related Files: `src/dev/MapStudio.jsx` :: MapStudio; 신규 `src/dev/StudioPlay.jsx` :: StudioPlay; `src/dev/mapStudio.css`; modify|new
- MapStudio에 round/characterId/bossSpecial/playConfig/idCounter를 추가한다. 기존 지역 select는 유지하고 나머지는 별도 `.studio-play-field` 클래스여서 기존 `.studio-field select` 가정을 보존한다.
- 하단 테스트 설정에서 라운드/모든 쿠키/라운드3의 특수공격 옵션을 선택하고 ‘테스트 플레이’로 시작한다. 새 배치 seed는 crypto uint32(없으면 Math.random), idCounter 증가.
- 검토 main은 hidden 처리하되 DOM/카메라/레이어 설정을 유지한다. `.map-studio[hidden]{display:none}` 명시. hidden 중 환경 연출 정지. ResizeObserver는 같은 viewport를 유지해 복귀시 다시 측정한다. 플레이 진입 전 pointer capture 해제.
- StudioPlay는 config당 고유key로 새 factory 세션을 useState/useSyncExternalStore에 연결한다. BattleScreen에 snapshot+actions를 그대로 전달하고 notification은 Toast로 표시한다. game.css/arena.css는 이 dev 컴포넌트에서 import.
- 상단 toolbar는 지역/라운드/쿠키/보스 특수 옵션과 ‘선택한 전투 시작’, ‘다시 시작’(동일 seed), ‘새 배치로 시작’, ‘지도 검토로 돌아가기’를 제공한다. 조건 변경 후 시작은 새 seed, 재시작/지역 전환은 이전 컴포넌트를 unmount해 rAF와 키보드 리스너 정리. 상단 선택은 별도 draft 상태로 시작버튼까지 전투에 영향 없음.
- 부모 launch가 적용 지역/라운드/쿠키/특수 옵션을 갱신하고 지역 변경시만 검토 카메라 reset. 복귀는 적용된 조건의 검토 화면으로 간다. 재진입은 새 세션.
- battle 이외 screen은 전투 완료/실패와 점수 요약만 표시한다. 보상·캠프·리더보드/해금 UI는 마운트하지 않는다. ‘한 전투만 테스트하며 기록이 저장되지 않음’을 표시한다.
- CSS: play main은 높이100svh/grid(auto,minmax(0,1fr)), 게임 slot overflow:auto/min-height0, BattleScreen height100%/min-height0. 모바일/낮은 가로 화면은 toolbar wrapping/scroll 제공, 가로 overflow 금지. 기존 studio 카메라 조작과 full screen 유지.
### I03. 검증
- Related Files: 신규 `tests/studio-session.test.mjs`, 신규 `tests/studio-e2e/play-mode.spec.cjs`, `tests/studio-e2e/map-studio.spec.cjs`(기존 회귀), `tests/e2e/studio-exclusion.spec.cjs`(기존 회귀).
- 단위: 4지역x3라운드 실제 몬스터/보스, 잠긴 쿠키 테스트, 각3소모품/HP/ammo, 특수공격 카운트/실제 발동, 동일 seed와 독립 세션, 무효 config, localStorage 접근 금지.
- dev E2E: 네 지역 바로 진입/실제 마우스 발사·반격, 눈 한기·도시 폭발/범위피해 재생, 보스 특수 즉시 반격, 재시작/전환 도중 이전 발사가 결과를 바꾸지 않음, 동일 배치/새 배치, preview 레이어/줌 복원/드래그, 잠긴 쿠키와 localStorage 불변/API요청 없음, 작은 화면.
- production E2E: 직접경로 차단 유지, build 파일에 dev 도구 문자열/세션 팩토리 포함 안 됨.

## Acceptance Criteria
- [x] 원하는 지역/라운드에서 실제 플레이와 기존 연출을 바로 확인한다.
- [x] 전투 전환/복귀가 깨끗하고 일반 저장/순위/프로덕션 진입은 영향 없다.

## Validation
- `npm.cmd test`
- `npm.cmd run build`
- `npx.cmd playwright test --config tmp/studio-play.config.cjs --workers=2 --timeout=60000` — 자체 dev4182, testDir tests/studio-e2e. 자체 서버/config만 종료·정리.
- `npx.cmd playwright test studio-exclusion.spec.cjs --config tmp/studio-production.config.cjs --workers=1` — 자체 preview4192, 완료 후 정리.
- UI 스크린샷 확인. 실행 중인 사용자 서버는 중지하지 않는다.

## Commit Message
```text
feat(관리자): 지역과 라운드를 바로 고르는 테스트 플레이 추가

Plan: 2026-10-26-map-studio-play-mode
Phase: P01-play
Task: T01-studio-play

- 실제 전투 화면과 격리된 개발 테스트 세션 연결
- 지역·라운드·쿠키·보스 특수 선택과 재시작 및 검토 복귀
- 프로필·리더보드 격리와 프로덕션 제외 및 전투 연출 검증
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 242a740

## 구현 및 검증 결과
- 구현·검증 완료, git commit pending. 자동 승인 검토 사용량 제한이 해소되기 전까지 승인 우회나 재시도를 하지 않는다.
- 초기 몬스터 구성도 배치 seed에서 파생한 별도 LCG로 고정했다. 같은 배치를 재시작할 때 혼돈의 몬스터 수/종류까지 동일하고 전투 피해 RNG와는 독립이다.
- 혼돈 일반전은 core session이 원래 다음 라운드로 자동 이동한다. dev 어댑터에서 advanceRound만 중단하고, review/반격이 끝난 terminal 상태를 StudioPlay 결과로 표시한다. 일반 게임의 진행 코드는 수정하지 않았다.
- 기존 studio 테스트에 장애물3개 고정 가정이 남아 있었다. 실제 buildBattlefield 등록 배치 개수를 기준으로 갱신했다.
- 단위146/146, production build 및 dev 도구 문자열 미포함 검사 통과.
- E2E22개 범위 검증: 관리자20(기존8/플레이12), 프로덕션 제외2. 병렬 실행의 공용 trace 폴더 충돌로1개 종료 오류가 있어 별도 outputDir로 재검증 통과. 최종 몬스터 재현성 수정 후 영향7개 재검증 통과.
- 도시 효과/모바일 화면 이미지 확인. 기존 사용자 서버5173에서 최신 MapStudio 코드 제공 확인.
- 자체 dev4182/preview4192만 종료. 사용자5173은 유지.
- 추가 발견 사항 없음.
