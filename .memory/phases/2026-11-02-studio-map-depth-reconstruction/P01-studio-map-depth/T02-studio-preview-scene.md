# Task: T02 공통 2.5D 장면과 관리자 미리보기

## Status: done

## Goal

T01의 네 지역 자산을 실제 월드 좌표의 2.5D 장면으로 조립하여 `/__dev/maps` 지도 미리보기에서 기본 표시하고, 같은 배치·카메라를 유지한 채 원본 지도로 즉시 전환할 수 있게 한다. 이 Task는 아직 테스트 플레이의 배경을 변경하지 않는다.

## Decision Summary

- 새 중경·길·전경은 개발 전용 렌더러에서만 불러온다. 기존 하늘·원경과 지역 팔레트, 카메라 시차, 접지 좌표를 재사용한다.
- 관리자 미리보기의 비교 버튼은 전체 맵을 전환한다. 일반 게임 배경과 게임 판정은 변경하지 않는다.

## Implementation

### I01. 새 자산의 개발 전용 위치 모델

- Related Files:
  - `src/dev/studioSceneCatalog.js` :: `getStudioScenePanels` — 24개 PNG와 4개 매니페스트의 개발 전용 import 및 월드 패널 계산; new.
  - `assets/maps/studio-depth/{forest,snow,city,chaos}/layers.json` :: `StudioDepthManifest` — T01 계약을 읽기; read-only.
  - `src/game/sceneCatalog.js` :: `getSceneProfile` — 기존 팔레트만 읽기; read-only.
  - `src/game/assetCatalog.js` :: `ASSETS` — 수정 금지; read-only.

#### Details

- **Signatures & Types**:
  ```ts
  type Area = 'forest' | 'snow' | 'city' | 'chaos';
  type Role = 'midground' | 'path' | 'foreground';
  type Side = 'west' | 'east';
  type StudioPanel = {
    href: string; side: Side;
    x: number; y: number; width: 2700; height: 1800;
    sourceWidth: 1536; sourceHeight: 1024;
  };
  function getStudioScenePanels(area: Area): Record<Role, readonly [StudioPanel, StudioPanel]>;
  ```
- **Data & Schema Fields**:
  - 입력 매니페스트는 `version=1`, `baselineRatio=0.75`, `west={x:-600,worldWidth:2700}`, `east={x:1500,worldWidth:2700}`, 6개의 `layer/side/file/width/height/alphaMode` 항목을 갖는다.
  - 반환 패널의 `height = width * sourceHeight / sourceWidth = 1800`, `y = 900 - baselineRatio * height = -450`. `href`는 Vite가 import한 PNG URL이다. `path`를 화면 레이어 이름 `route`로 매핑한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 네 지역과 6쌍 외 입력은 `TypeError`. 누락·중복 자산은 조용히 빈 레이어로 처리하지 않는다.
  2. Core Processing: 정적 import를 `src/dev/studioSceneCatalog.js`에만 둔다. 매니페스트 항목과 import URL을 `layer-side`로 결합한 뒤 동·서 순서의 불변 패널 배열을 반환한다.
  3. Error & Exception Handling: 매니페스트 버전·필드가 T01 계약과 다르면 명시 오류를 던져 스튜디오의 오류 경계가 잡게 한다.
  4. State Transition & Return: 자산 URL과 위치만 반환한다. 기존 `SCENE_PROFILES`, 엔진 배치, 브라우저 저장소를 변경하지 않는다.

### I02. 5층 입체 장면 렌더러

- Related Files:
  - `src/dev/StudioRebuiltScene.jsx` :: `StudioRebuiltScene`, `StudioPanelLayer` — 새 장면의 5개 시각 층 조합; new.
  - `src/components/BattlefieldBackdrop.jsx` :: `BattlefieldBackdrop` — 기존 sky/distant를 현재 props로 재사용; read-only.
  - `src/components/StudioDepthScene.jsx` :: `StudioDepthScene` — `renderRoad` 선택 인자로 중복 길 단면을 생략하고 접지·받침 장식을 유지; modify.
  - `src/components/SceneAtmosphere.jsx` :: `SceneAtmosphere`, `src/game/useSceneActivity.js` :: `useSceneActivity` — 가까운 대기 효과의 일시 정지·reduced-motion 처리 재사용; read-only.
  - `src/game/sceneParallax.js` :: `applyScenePose` — 기존 시차 변수 공급자; read-only.
  - `src/styles/arena.css` :: `.battlefield-layer [data-depth-plane]` — 기존 레이어 시차 CSS; read-only.

#### Details

- **Signatures & Types**:
  ```ts
  type VisibleLayers = Partial<Record<'sky'|'distant'|'midground'|'route'|'foreground', boolean>>;
  type StudioRebuiltSceneProps = {
    area: Area;
    layout: {
      width: 3600; height: 1200; groundY: 900;
      player: {x:number;y:number;width:number;height:number};
      launcher: {x:number;y:number;width:number;height:number};
      launcherPlatform?: {x:number;y:number;width:number;height:number}|null;
      obstacles: Array<{id:string;x:number;y:number;width:number;height:number;supportsEnemyId?:string}>;
      enemies: Array<{id:string;x:number;y:number;size:number;supportObstacleId?:string;patrol?:object}>;
    };
    visibleLayers?: VisibleLayers;
    motionPaused?: boolean;
    toppledObstacleIds?: string[];
  };
  function StudioRebuiltScene(props: StudioRebuiltSceneProps): JSX.Element;
  function StudioDepthScene(props: Pick<StudioRebuiltSceneProps,'area'|'layout'|'toppledObstacleIds'> & {renderRoad?: boolean}): JSX.Element;
  ```
- **Data & Schema Fields**:
  - `renderRoad` 기본값 `true`는 기존 테스트 플레이 출력 호환용. 새 장면에서만 `false`를 전달한다. 길 윗면·측면은 T01 `path` 그림 자체에 있으므로 기존 오버레이 길 면을 중복 그리지 않는다.
  - 새 레이어 DOM: `data-scene-layer="midground|route|foreground"`, 내부 `data-depth-plane` 동일 이름, 각 이미지 그룹에 `data-studio-painted-panel="{role}"`와 `data-panel-side="west|east"`. 모든 SVG는 `viewBox="0 0 3600 1200"`, `aria-hidden="true"`, `pointer-events:none`.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `area`와 `layout`은 `createStudioScenario`가 제공한 값만 받는다. `getStudioScenePanels`로 누락 자산을 확인한다.
  2. Core Processing: `BattlefieldBackdrop`에 `visibleLayers={{sky:visibleLayers?.sky!==false,distant:visibleLayers?.distant!==false,midground:false,route:false,foreground:false}}`를 전달하여 원래 하늘·원경만 표시한다. 그 뒤 새 `midground`/`route`/`foreground` SVG를 이 순서로 렌더링하고 각각 같은 이름의 `visibleLayers` 값이 `false`면 숨긴다. 기존 컴포넌트의 숨겨진 3층이 DOM에 남을 수 있으므로 테스트는 보이는 5층을 센다.
  3. Panel assembly: 원본 `SceneArt`의 패널 겹침 계약처럼 west -600~2100, east 1500~4200을 약한 그라데이션 마스크로 교차 연결한다. SVG `<image>`는 source `1536×1024`, panel `2700×1800`, y=-450. 마스크·gradient ID는 `useId` 기반으로 장면 인스턴스마다 고유하게 만든다. City 기존 원본 중경의 중앙 가림 마스크는 새 중경에 적용하지 않는다.
  4. Route and depth: 새 길 PNG의 투명 구간 아래에는 지역 `getSceneProfile(area).palette`의 얇은 지면/길 기본색만 깔아 경계 공백을 막는다. 불투명한 큰 면으로 하늘·중경을 덮지 않는다. `visibleLayers?.route!==false`일 때만 `StudioDepthScene renderRoad={false}`를 새 층 뒤, `ArenaScenery` 앞에 두어 발사대·쿠키·장애물·고지대 적의 접지·받침을 표시한다. `toppledObstacleIds`는 넘어간 장애물 그림자를 제외한다.
  5. Motion/accessibility: 기존 `--scene-*` CSS 시차를 새 `data-depth-plane`에 그대로 적용한다. `SceneAtmosphere area band="near"`는 새 route에 한 번만 배치하고 `useSceneActivity({paused:motionPaused})` 결과를 사용한다. far 대기 효과는 원본 distant가 담당한다. reduced-motion에서는 정적인 길·접지는 남는다.
  6. Error & Exception Handling: 개발 장면 오류는 기존 `ErrorScreen`/`StudioLoadBoundary`가 표시한다. 이미지 로드 실패를 아무것도 없는 성공 장면으로 취급하지 말고 브라우저 검증에서 발견되게 한다.

### I03. 지도 미리보기와 비교 UI

- Related Files:
  - `src/dev/MapStudio.jsx` :: `MapStudio` — 기본 새 맵, 원본 비교 상태와 버튼; modify.
  - `src/dev/mapStudio.css` :: `.map-studio .studio-depth-scene`, `.studio-controls` — 깊이 장식 층위·비교 버튼·모바일 배치; modify.
  - `tests/studio-e2e/map-studio.spec.cjs` :: `development map studio…` 및 새 비교 시나리오 — 미리보기 자산·조작 검증; modify.

#### Details

- **Signatures & Types**:
  ```ts
  // MapStudio 지역·라운드·seed 상태와 독립인 시각 비교 상태.
  const [depthEnabled, setDepthEnabled] = useState<boolean>(true);
  ```
- **Data & Schema Fields**:
  - `depthEnabled:boolean`은 로컬 React 상태이며 기본 `true`. `localStorage`, profile, `run`에 쓰지 않는다. 지역·라운드·배치를 바꾸거나 카메라를 이동해도 유지한다.
  - 비교 버튼은 `type="button"`, `aria-pressed={depthEnabled}`와 현재 상태를 읽을 수 있는 한국어 이름을 사용한다. `.arena-world`에 `data-studio-scene="rebuilt|original"`을 붙여 검증한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 현재 `scenario.layout`가 있을 때만 장면을 렌더링한다.
  2. Core Processing: 기본은 `StudioRebuiltScene`, 버튼이 꺼지면 기존 `BattlefieldBackdrop`를 동일 `area`/`visibleLayers`/`motionPaused`로 렌더링한다. `ArenaScenery`, `Slingshot`, `PlayerCookie`, `MonsterGroup`는 장면 바깥에 한 번만 렌더링해 좌표·배치·클릭이 변하지 않는다.
  3. Error & Exception Handling: 자산/장면 오류에는 기존 재시도·게임으로 돌아가기 안내를 쓴다. 버튼은 카메라 drag capture와 충돌하지 않도록 `aside` 안에 둔다.
  4. State Transition & Return: 전환 시 카메라 `pose`·`seed`·`visibleLayers`·`motionPaused`·`round`를 유지한다. 전투 시작 연결은 T03에서 맡는다.
  5. Test updates: 기존 `[data-scene-layer]` 5개 단순 개수 검사는 숨겨진 원본 레이어를 잘못 세므로 `:visible` 5개로 바꾼다. Forest 기존 `[data-painted-panel]` 0개 검사는 새 장면의 `[data-studio-painted-panel]` 6개와 원본 전환 시 0개를 분리해 검증한다. 네 지역에서 이미지 `decode()`, 고유 SVG ID, 레이어 토글, 카메라·배치 불변을 확인한다.

## Acceptance Criteria

- [ ] 네 지역 관리자 미리보기 기본 장면에 새 중경·길·전경 6개 패널과 길 두께·접지 표현이 보인다.
- [ ] 원본 비교 버튼을 눌러도 쿠키·발사대·적·장애물·카메라 위치·seed가 변하지 않는다.
- [ ] 레이어 토글, 드래그/휠/Home, 모바일 레이아웃, 일시 정지, reduced-motion이 동작한다.
- [ ] `src/game/assetCatalog.js`, 일반 게임 장면과 전투 물리 코드는 변경되지 않는다.

## Validation

- `node scripts/verify-studio-map-art.cjs all` — T01의 24개 자산이 유효하다.
- `npm.cmd run test:studio -- --grep "map studio" --reporter=line` — 관리자 미리보기와 비교·카메라 테스트 통과.
- `git diff --check` — 구현·테스트의 공백 오류 없음.
- 로컬 `/__dev/maps`에서 네 지역 각각 전체/서쪽/중앙/동쪽, 원본 비교, 1440×900·844×390·390×844 화면을 육안 확인 — 투명 경계와 시야 가림이 없다.

## Commit Message

```text
feat(studio): 새 입체 맵을 관리자 미리보기에서 비교

Plan: 2026-11-02-studio-map-depth-reconstruction
Phase: P01-studio-map-depth
Task: T02-studio-preview-scene

- 개발 전용 새 장면 렌더러와 월드 패널 연결
- 관리자 미리보기에 원본 비교와 접지 표현 추가
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: `6e47677`
