# Task: T03 관리자 테스트 플레이 연결과 최종 검증

## Status: done

## Goal

T02의 동일한 2.5D 장면을 관리자 테스트 플레이에서도 기본 표시하고 미리보기의 원본 비교 상태를 공유한다. 전투 판정과 일반 게임 화면을 유지하며, 배포 번들에 새 관리자 자산·렌더러가 포함되지 않음을 확인한다.

## Decision Summary

- `run.studioDepthPreview===true`인 로컬 관리자 세션에서만 새 장면을 사용한다. 원본 비교 시 전체 배경을 교체하며 발사·적·장애물 컴포넌트는 그대로 둔다.
- 일반 게임은 `studioDepthEnabled` prop이 없으므로 기존 `BattlefieldBackdrop`만 렌더링한다. 새 개발 전용 렌더러는 개발 모드에서만 동적으로 import한다.

## Implementation

### I01. 미리보기와 전투의 비교 상태 공유

- Related Files:
  - `src/dev/MapStudio.jsx` :: `MapStudio` — T02의 `depthEnabled`를 `StudioPlay`에 전달하고 전투에서 바꾼 값을 미리보기에 유지; modify.
  - `src/dev/StudioPlay.jsx` :: `StudioPlay` — 내부 `depthEnabled` 상태를 제거하고 prop으로 비교 버튼을 제어; modify.
  - `src/dev/createStudioSession.js` :: `createStudioScenario` — 기존 `run.studioDepthPreview=true`를 유지; read-only.

#### Details

- **Signatures & Types**:
  ```ts
  type StudioPlayProps = {
    config: {area:'forest'|'snow'|'city'|'chaos';round:1|2|3;characterId:string;weaponGrade:'C'|'B'|'A';bossSpecial:boolean;seed:number;id:number};
    onRestart: (config?: object, newLayout?: boolean) => void;
    onExit: () => void;
    depthEnabled: boolean;
    onDepthEnabledChange: (next: boolean) => void;
  };
  function StudioPlay(props: StudioPlayProps): JSX.Element;
  ```
- **Data & Schema Fields**:
  - 비교 상태는 `MapStudio`의 React `depthEnabled:boolean` 한 곳에서 소유한다. 기본 `true`, 새 맵 표시; `false`, 원본 표시. `run`, profile, API, localStorage에 저장하지 않는다.
  - `StudioPlay`의 `data-depth-enabled`는 현재 prop과 일치한다. 버튼 `aria-pressed`도 일치하고 텍스트는 새 맵/원본 상태를 구분한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `MapStudio`가 T02의 상태 setter를 소유한다. `StudioPlay`가 단독 사용되는 테스트에는 명시 prop을 전달한다.
  2. Core Processing: 전투 시작·재시작·새 배치·지역 변경 시 상태를 초기화하지 않는다. 전투의 비교 버튼은 `onDepthEnabledChange(!depthEnabled)`만 호출한다.
  3. Error & Exception Handling: 전투가 종료되어 결과 화면이 표시돼도 비교 상태를 유지하고, 지도로 돌아가면 마지막 선택이 미리보기에 반영된다.
  4. State Transition & Return: 비교 전환은 기존 세션 store의 `run`, 발사 횟수, 적 체력, seed, 카메라 명령을 수정하지 않는다.

### I02. 공용 전투 화면의 개발 전용 분기

- Related Files:
  - `src/components/BattleScreen.jsx` :: `BattleScreen` — `studioDepthEnabled` optional prop을 `BattleArena`로 전달; modify.
  - `src/components/BattleArena.jsx` :: `BattleArena` — 기존 `StudioDepthScene` 정적 import를 제거하고 개발 모드에만 새 장면 동적 import; modify.
  - `src/dev/StudioRebuiltScene.jsx` :: `StudioRebuiltScene` — T02 렌더러 재사용; read-only.
  - `src/components/StudioDepthScene.jsx` :: `StudioDepthScene` — T02 이후 새 장면 내부에서만 import되는지 확인; read-only.
  - `src/dev/mapStudio.css` :: `.studio-play .studio-depth-scene` 및 비교 상태 선택자 — 새 장면의 z-index·pointer-events 유지, 이전 오버레이만 숨기는 규칙 제거; modify.
  - `src/main.jsx` :: `isStudioPath`/`import.meta.env.DEV` — 기존 개발 경로 게이트; read-only.

#### Details

- **Signatures & Types**:
  ```ts
  function BattleScreen({session, music, studioDepthEnabled = false}): JSX.Element;
  function BattleArena({run, lastEvent, enemyResponse, shotReview, onReviewComplete,
    bossTransition, onBossImpact, onBossComplete, onBeginShot, onCancelShot,
    onActivateFlightAbility, onEnemyAdvance, onEnemyComplete, setAim, onFire,
    onConsumable, arenaRef, studioDepthEnabled = false}): JSX.Element;
  // 신규 studioDepthEnabled?: boolean, 기본 false. 나머지 인자는 기존 JS 계약을 유지.
  // BattleArena 모듈 수준: 개발 모드에서만 React.lazy(() => import('../dev/StudioRebuiltScene.jsx')).
  const rebuilt = import.meta.env.DEV && run.studioDepthPreview === true && studioDepthEnabled === true;
  ```
- **Data & Schema Fields**:
  - `studioDepthEnabled?:boolean` 기본 `false`. `run.studioDepthPreview?:boolean`은 기존 관리자 세션의 시각 플래그다. 둘 다 참일 때만 새 장면.
  - `layout`, `scenery.toppledObstacleIds||[]`, `Boolean(run.terminal)`을 각각 `StudioRebuiltScene`의 `layout`, `toppledObstacleIds`, `motionPaused`로 전달한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 일반 `App`는 새 prop을 전달하지 않는다. 관리자 `StudioPlay`는 `BattleScreen studioDepthEnabled={depthEnabled}`를 전달한다.
  2. Core Processing: `BattleArena`에서 배경 자리에 `rebuilt`이면 동적 `StudioRebuiltScene`, 아니면 기존 `BattlefieldBackdrop` 중 하나만 렌더링한다. 개발 모듈 로딩 중에는 `Suspense` fallback으로 기존 배경을 표시한다. 기존 `<StudioDepthScene>` 직접 렌더링은 제거해 길과 그림자를 이중 표시하지 않는다.
  3. Rendering order: 새 장면은 `.arena-world` 첫 배경 위치에 놓고 `WindWeather`, `ArenaScenery`, `Slingshot`, `PlayerCookie`, `ProjectileFlight`, `MonsterGroup`와 HUD는 기존 순서·좌표를 유지한다. `.studio-depth-scene`은 `z-index:3`, `pointer-events:none`으로 장애물·투사체·HUD 아래에 둔다.
  4. Error & Exception Handling: 동적 import/렌더 오류는 기존 `StudioLoadBoundary`의 재시도 화면으로 드러난다. 실패 시 일반 세션이나 전투 판정을 바꾸지 않는다.
  5. State Transition & Return: `.battle-arena`에 `data-studio-scene="rebuilt|original"`을 관리자일 때만 표시한다. 비교 중 새 자산이 아직 로드되지 않아도 전투 세션은 재생성하지 않는다.

### I03. 관리자·일반 게임·배포 회귀 검증

- Related Files:
  - `tests/studio-e2e/map-depth-reconstruction.spec.cjs` :: `studio map depth scenarios` — 미리보기/전투 일치·비교·네 지역 검증; new.
  - `tests/studio-e2e/map-studio.spec.cjs` :: `all four studio regions…` — 기존 시각 레이어/배치 가정이 새 장면과 충돌하면 정확한 조건으로 수정; modify.
  - `tests/e2e/studio-exclusion.spec.cjs` :: `production direct links…` — 배포 경로 차단 유지; modify only if stronger isolation assertion is needed.
  - `scripts/verify-studio-build.cjs` :: `markers` — 새 관리자 전용 DOM marker와 `StudioRebuiltScene` 문자열의 배포 출력 누출 검사; modify.
  - `.memory/validation/2026-11-02-studio-map-depth-reconstruction/final.md` :: `final visual/functional report` — 네 지역 시각·전투·배포 검증 결과; new.

#### Details

- **Signatures & Types**:
  ```ts
  type SceneProbe = {
    area: 'forest'|'snow'|'city'|'chaos';
    layoutKey: string;
    scene: 'rebuilt'|'original';
    panelKeys: string[]; // 3 roles × west/east = 6
    worldPose: string; // .arena-world의 inline transform
    actorPositions: Array<{id:string;x:number;y:number}>;
  };
  ```
- **Data & Schema Fields**:
  - 배포 검사 marker에 개발 전용 렌더러 내부의 `data-studio-painted-panel`, `studio-depth-scene` 문자열을 추가한다. 공용 `BattleArena`의 검사 속성 `data-studio-scene`은 production 소스에 남을 수 있으므로 누출 marker로 쓰지 않는다. `dist`의 JS/CSS/HTML을 검사한다. 새 PNG는 개발 import가 제거돼 참조되지 않아야 한다.
  - 시각 보고에는 숲·눈·도시·혼돈 각각 전체 보기/발사대 가까이/적 가까이/동·서 끝, 원본 비교, 테스트 플레이, 좁은 화면, reduced-motion 확인 여부를 기록한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: T01 자산 검증과 T02 미리보기 테스트가 통과한 상태에서 진행한다.
  2. Core Processing: 고정 seed=0으로 네 지역의 미리보기와 테스트 플레이를 연달아 열어 새 이미지 URL·패널 x/y/크기·`layoutKey`·접지 위치가 같은지 검사한다. 각 지역에서 원본 비교를 누르고 같은 세션의 체력·탄약·배치·카메라를 보존하는지 확인한다. 전투에서 원본으로 전환한 뒤 미리보기로 돌아와 상태가 유지되는지 검사한다.
  3. Edge cases: 중경/route/전경 개별 레이어 숨김, 드래그·휠·Home, 장애물 전도 후 그림자, 고지대 적, 도시 중앙 노을 시야, 1440×900·844×390·390×844, reduced-motion을 확인한다. 자동 DOM 통과만으로 미술 품질을 확정하지 말고 실제 캡처를 열어 연결부·가독성을 검사한다.
  4. Isolation: `npm.cmd run build` 이후 `verify-studio-build`와 production `studio-exclusion` e2e를 실행해 `/__dev/maps` 차단 및 새 렌더러 문자열 부재를 확인한다. 일반 게임의 숲/눈/도시/혼돈 화면·조준·충돌·진행 테스트를 실행한다.
  5. Error & Exception Handling: 시각 오류나 누출이 있으면 통과로 기록하지 말고 원인 파일을 수정한 다음 해당 실패 검증만 재실행한다. 관련 없는 기존 테스트를 완화해 우회하지 않는다.
  6. State Transition & Return: `final.md`에 실행한 명령과 통과/제한을 기록한다. 보스 회피 아이디어는 포함하지 않는다.

## Acceptance Criteria

- [ ] 네 지역 관리자 미리보기와 테스트 플레이에 같은 새 맵이 기본 표시되며 원본 비교가 두 화면에서 같은 상태를 쓴다.
- [ ] 조준선·사탕·쿠키·몬스터·장애물 및 접촉점이 새 그림과 맞고 전투 결과·배치는 변하지 않는다.
- [ ] 일반 게임과 배포 빌드에는 새 관리자 맵 UI·자산 렌더러가 나타나지 않는다.
- [ ] 자동 검증과 실제 이미지 검토를 마치고 `final.md`에 증거와 남은 제한을 기록한다.

## Validation

- `node scripts/verify-studio-map-art.cjs all` — 네 지역 24개 자산 통과.
- `npm.cmd test` — 엔진·조준·충돌·카메라·세션 단위 테스트 통과.
- `npm.cmd run test:studio -- --reporter=line` — 관리자 미리보기/테스트 플레이의 기존 및 신규 브라우저 테스트 통과.
- `npm.cmd run build` — production Vite 빌드 성공.
- `node scripts/verify-studio-build.cjs` — 관리자 전용 렌더러 marker가 production HTML/JS/CSS에 없음.
- `npm.cmd run test:e2e -- --reporter=line` — 일반 게임과 production 개발 경로 차단 회귀 통과.
- `git diff --check` — 공백 오류 없음.
- 실제 캡처를 열어 네 지역의 서쪽·중앙·동쪽, 새 맵/원본, 발사대·적 근접, 모바일 폭·reduced-motion을 검토 — 자동 검사가 놓치는 랜드마크 반복·색/시야 문제 없음.

## Commit Message

```text
feat(studio): 관리자 전투에 입체 맵 연결하고 원본 비교 통합

Plan: 2026-11-02-studio-map-depth-reconstruction
Phase: P01-studio-map-depth
Task: T03-studio-play-and-validation

- 미리보기와 테스트 플레이의 새 맵 비교 상태 공유
- 일반 게임과 배포 번들 격리 및 네 지역 회귀 검증
```

## Progress

- [x] 구현 완료
- [x] 로컬 대상 검사 완료 (전체 브라우저 회귀는 배포 시 실행)
- commit: 2c42b58
